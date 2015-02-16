function Base36Namer(){
	this.id = 0;
}

Base36Namer.prototype.next = function(){
	var me = this.id;
	this.id++;
	return me.toString(36);
}


function nope(){
}

function CommandDispatcher() {
	this.handlers = {};
	this.defaultHandler = function( command ){
		console.warn( "Unhandled command ", command );
	};
}

CommandDispatcher.prototype.register = function( name, handler ){ //TOOD: Should this be on/off paradigm instead?
	this.handlers[ name ] = handler;
}

CommandDispatcher.prototype.unregister = function( name ){
	delete this.handlers[name];
}

CommandDispatcher.prototype.dispatch = function( message, env ){
	var handlerName = message.command;
	var handler = (this.handlers[ handlerName ] || this.defaultHandler);
	handler( message, env );
}

CommandDispatcher.prototype.once = function( name, handler ){
	if( !name ) { throw new Error("name not defined"); }
	if( !handler ) { throw new Error("handler not defined"); }

	this.register( name, function( message, context ) {
		this.unregister( name );
		handler( message, context );
	}.bind(this) );
	return name;
}

//TODO: This method needs better test coverage
CommandDispatcher.prototype.promiseMessage = function( name ){
	if( !name ){ throw new Error( "command name must be defined" ); }

	var result;
	var closure;
	this.once( name, function( message, env ){
		if( message.transfered ){ throw new Error("Transfer list clobbered"); }
		if( env && env.ports && env.ports.length > 0 ){
			message.transfered = env.ports;
		}

		if( closure ){
			closure( message );
		}else{
			result = message;
		}
	});

	return new Promise( function( fulfill, reject ){
		if( result ){
			fulfill( result );
		}else{
			closure = fulfill;
		}
	});
}

CommandDispatcher.prototype.linkChannel = function( channel ){
	channel.addEventListener( 'message', function( event ){
		this.dispatch( event.data, event );
	}.bind(this));
}


function promise_protocol_repliesTo( name, handler ){
	if( !handler ){ throw new Error("handler required"); }
	var self = this;
	function promise_interceptor( message, env ){
		if( message.replyTo === undefined ){
			console.warn( "replyTo required on message ", message );
			return;
		}

		if( env ){
			if( message.transfered ){ throw new Error("Transfer list conflict"); }
			message.transfered = env.ports;
		}

		var handlerPromise = Promise.resolve( handler( message ) );
		handlerPromise.then( function( result ){
			var transfer = result.transfer ? result.transfer : [];
			delete result.transfer;
			self.send({ command: message.replyTo, success: true, result: result }, transfer );
		}, function( error ){
			self.send({ command: message.replyTo, success: false, error: error.toString()});
		});
	}

	this.register( name, promise_interceptor );
}

function promise_protocol_withReplyTo( message ){
	if( message.replyTo ){ throw new Error("replyTo not allowed (used by the protocol)"); }
	var name = this.namer.next();
	var future = this.promiseMessage( name ).then( function( resolution ){//TODO: move promise message into this protocol
		if( resolution.success ){
			var output = resolution.result;
			if( resolution.transfered && resolution.transfered.length > 0 ){//TODO: determine cleaner method of dealing with transfers
				output.transfered = resolution.transfered;
			}
			return output;
		}else{
			if( !resolution.error ){
				throw new Error( "Command failed to properly respond for " + message.command);
			}else{
				throw new Error( resolution.error );
			}
		}
	});
	message.replyTo = name;
	var transfer = message.transfer ? message.transfer : [];
	delete message.transfer;
	this.send( message, transfer );
	return future;
}

CommandDispatcher.prototype.usesPromises = function( namer ) {//TODO: better method for appending interface in JS idioms?
	if( namer ){ this.namer = namer; }

	//Client stuff
	this.withReplyTo = promise_protocol_withReplyTo;
	//Serivce stuff
	this.repliesTo = promise_protocol_repliesTo;
}

// TODO: Extract into own file
function port_linkage_send( message, transferables ) {
	//console.log( "Sending: ", message );
	this.port.postMessage( message, transferables );
}

CommandDispatcher.prototype.linkPort = function( port, hasStarted ){
	this.port = port;
	this.send = port_linkage_send;

	this.linkChannel( port );//TODO: Extract and place in this protocol
	if( !hasStarted ){
		this.port.start();
	}
}

CommandDispatcher.prototype.reportUnhandled = function( componentName ){
	this.defaultHandler = function( message ){
		console.warn( "[", componentName, "] Unhandled message: ", message);
	}
}


var supervisorProtocol = {
	initialize: 'giraffe:supervisor:initialize',
	initialized: 'giraffe:supervisor:initialized',

	batch: 'giraffe:supervisor:batch',
	result: 'giraffe:supervisor:result'
};

function supervisor_protocol_client( channel, dispatcher ){
	dispatcher = ( dispatcher || new CommandDispatcher());
	dispatcher.linkChannel( channel );
	dispatcher.register( supervisorProtocol.initialized, function(){
		control.initialized();
	});
	dispatcher.register( supervisorProtocol.result, function( command ){
		control.onResult( command.result ); 
	});

	function initialize(){
		channel.start();
		channel.postMessage({ command: supervisorProtocol.initialize });
	}

	function send_batch( batch ){
		channel.postMessage({ command: supervisorProtocol.batch, batch: batch });
	}

	var control = {
		initialize: initialize,
		batch: send_batch,

		initialized: nope,
		onResult: nope
	};

	return control;
}

function supervisor_protocol_service( channel, dispatcher ){
	dispatcher = (dispatcher || new CommandDispatcher());
	dispatcher.linkChannel( channel );

	dispatcher.register( supervisorProtocol.initialize, function(){
		var result = control.initialize();
		channel.postMessage({ command: supervisorProtocol.initialized });
	});

	dispatcher.register( supervisorProtocol.batch, function( command ){
		control.onBatch( command.batch );
	});

	function start(){
		channel.start();
	}

	function send_results( result ){
		channel.postMessage({ command: supervisorProtocol.result, result: result });
	}

	var control = {
		start: start,
		completed: send_results,

		initialize: nope,
		onBatch: nope
	};

	return control;
}


var workProtocol = {
	initialize: "giraffe:work-agent:initialize",
	initialized: "giraffe:work-agent:initialized",
	started: "giraffe:work-agent:started",
	operation: "giraffe:work-agent:operation"
};

var workerFactoryProtocol = {
	spawn: 'giraffe:worker-factory:spawn',
};

function RemoteWorkerFactory( dispatcher ){
	this.dispatcher = dispatcher;
}
RemoteWorkerFactory.prototype.spawn = function( configuration ){
	return this.dispatcher.withReplyTo({ command: workerFactoryProtocol.spawn, config: configuration });
}

function worker_factory_client( dispatcher ){
	return new RemoteWorkerFactory( dispatcher );
}

function worker_factory_service( dispatcher, factory ){
	if( !factory ){ throw new Error("Factory requried"); }

	dispatcher.repliesTo( workerFactoryProtocol.spawn, function( command ){
		var config = command.config;
		var result = factory.spawn( config );
		var factoryPromise = Promise.resolve( result );
		return factoryPromise;
	});
}


/**
 * Work Agent communciation handler 
 */
function WorkAgentClient( id, cfg ){
	this.id = id;
	this.cfg = cfg;
	this.dispatcher = new CommandDispatcher();
	this.dispatcher.usesPromises( new Base36Namer() );
	this.idle = nope;
}
WorkAgentClient.prototype.openedChannel = function( channel  ){
	if( !channel ){ throw new Error("channel"); }
	this.channel = channel;
	this.dispatcher.linkPort( channel );

	return this.dispatcher.withReplyTo( {command: workProtocol.initialize, id: this.id, config: this.cfg } )
	.then( function(){
		this.idle();
	}.bind(this));
}
WorkAgentClient.prototype.dial = function(){
	if( !this.channel ){ throw new Error("no channel established to dial on"); }
	this.channel.postMessage({command: "girafe:work-agent:initialize", id: this.id, config: this.cfg });
	return self;
}
WorkAgentClient.prototype.assign_work = function( data ){
	return this.dispatcher.withReplyTo({ command: workProtocol.operation, on: data });
}

/**
 * Giraffe Supervisor 
 */
function giraffe_supervisor(){
	var commandDispatcher = new CommandDispatcher();
	commandDispatcher.usesPromises( new Base36Namer() );
	commandDispatcher.defaultHandler = function( message ){
		if( message.replyTo ){
			self.postMessage({ command: message.replyTo, error: "Command "+message.command+" is not implemented" });
		}else{
			console.error( "[supervisor] Default message handler invoked for", message );
		}
	}

	var workerParameters;
	commandDispatcher.register( supervisorProtocol.initialize, function( message ){
		workerParameters = message.worker;
	});

	var batches = [];
	commandDispatcher.repliesTo( 'feed', function( message ){
		return new Promise( function( fulfill, fail ){
			var batchData = message.batch;
			batches.push({ data: batchData, done: fulfill });
			spawn_worker();
		});
	});

	var workers = {}; //TODO: Still needed?
	var workerNamer = new Base36Namer();
	function spawn_worker(){
		var id = "worker-" + workerNamer.next();
		var agent = new WorkAgentClient( id, workerParameters );
		agent.idle = function(){
			if( batches.length > 0 ){
				var batch = batches.shift();
				agent.assign_work( batch.data ).then( function( result ){
					batch.done( result );
				});
			}
		}
		workers[id] = agent;
		if( self.Worker ){
			throw new Error("Need to implement that");
	//		spawn_internal_worker( id ); //Apparently supported under FF && IE
		}else{
			spawn_worker_from_page( id, agent ); //Chrome and Safari
		}
	}

	function spawn_worker_from_page( id, agent ){
		commandDispatcher.withReplyTo({ command: workerFactoryProtocol.spawn, id: id }).then( function( command ){
			var channel = command.transfered[0];
			agent.openedChannel( channel );
		});
	}

	commandDispatcher.linkPort( self, true );
}

;giraffe_supervisor();