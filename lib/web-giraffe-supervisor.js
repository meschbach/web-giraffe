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
//TODO: This needs to be moved to the Promise Protocol
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


function Base36Namer(){
	this.id = 0;
}

Base36Namer.prototype.next = function(){
	var me = this.id;
	this.id++;
	return me.toString(36);
}


function promise_protocol_repliesTo( name, handler ){
	if( !handler ){ throw new Error("handler required"); }
	var self = this;
	function promise_interceptor( message, env ){
		if( message.replyTo === undefined ){
			console.warn( "replyTo required on message ", message );
			return;
		}

		try {
			if( env ){
				if( message.transfered ){ throw new Error("Transfer list conflict"); }
				message.transfered = env.ports;
			}
			var progressNotices;
			var progressName = message.progressName;
			if( progressName ){
				progressNotices = function( message ){
					self.send({command: progressName, details: message });
				}.bind( this );
			}else{
				progressNotices = nope;
			}

			var handlerPromise = Promise.resolve( handler( message, progressNotices ) );
			handlerPromise.then( function( result ){
				//TODO: Test if result is undefined (transfer == [] if so) 
				var transfer = result.transfer ? result.transfer : [];
				delete result.transfer;
				self.send({ command: message.replyTo, success: true, result: result }, transfer );
			}, function( error ){
			/* TODO: Debuggin
				if( error.stack ){
					console.error("Promise to ", message.replyTo," failed: ", error.message , error.stack);
				}
				*/
				self.send({ command: message.replyTo, success: false, error: error.toString()});
			});
		}catch( problem ){
			/* TODO: Debuggin
			console.error("Failed to dispatch for message", problem, problem.stack);
			*/
			self.send({ command: message.replyTo, success: false, error: problem.toString()});
		}
	}

	this.register( name, promise_interceptor );
}

function promies_protocol_withProgressAndReplyTo( message ){
	var name = this.namer.next();
	message.progressName = name;

	var self = this;
	this.register( name , function( message ){
		var details = message.details;
		result.onProgress( details );
	});
	var result = this.withReplyTo( message );
	result.then( function(){ self.unregister( name ); }, function(){ self.unregister(); });
	result.onProgress = nope;
	return result;
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
	this.withProgressAndReplyTo = promies_protocol_withProgressAndReplyTo;
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


/*
 * Copyright 2015 by Mark Eschbach.
 */

function manual_timer(){ //TODO: Test?  Simple enough, but should make sure
	var notifications = [];
	var self = {};
	self.expiresAt = function( time, perform ){
		notifications.push( perform );
		return {
			cancel: function(){
				notifications.splice( notifications.indexOf( perform ), 1 );
			}
		};
	}
	self.expireAll = function(){
		notifications.forEach(function( cb ){
			cb();
		});
	}
	return self;
}

function real_clock_timer(){ //TODO: Test?  Simple enough, but should make sure
	var timer = {};
	timer.expiresAt = function( when, cb ){
		var timer = setTimeout( cb, when );
		return { cancel: function(){ clearTimeout( timer ); } };
	}
	return timer;
}

/**
 * Aging LIFO queue
 *
 * A queue where elements will have two fates:
 *	-> The element is dequeued within a specific peroid of time
 *	-> A queue specific period of times passes
 *		and the element is dequeued.
 *
 * TOOD: Is there a better name?  This could also be confused
 *	with a LIFO queue where a number of operations occur
 *	before evicting elements
 */
function aging_lifo_queue( timer ){
	timer = timer || real_clock_timer();
	var self = [];
	self.timeout = 1000;

	self.enqueue = function( element, expiryCallback ){
		expiryCallback = expiryCallback || nope;
		var expiryClock = timer.expiresAt( self.timeout, function(){
			self.splice( self.lastIndexOf( handle ), 1 );
			expiryCallback();
		});

		var handle = { //TODO: Probably should become a real object
			datum: element,
			cancelTimer: function(){
				expiryClock.cancel();
			}
		};
		self.push( handle );
	}

	self.dequeue = function(){
		if( self.length == 0 ){ throw new Error("empty"); }
		var handle = self.pop();
		handle.cancelTimer();
		return handle.datum;
	}
	return self;
}

/*
 * Copyright 2015 by Mark Eschbach.
 */
function fifo_work_pool( workerFactory, workerLimit ){
	workerLimit = workerLimit || 1;

	var internal_queue = [];
	var idlingWorkers = aging_lifo_queue();
	var workerCount = 0;

	var object = {};
	object.timeout = 1000;
	object.idling = function( worker ){
		var future = new Future();

		if( internal_queue.length > 0 ){
			var assignment = internal_queue.pop();
			worker.assign( assignment );
			future.resolve({ command: 'assigned' });
		}else{
			//TODO: The other branch is tested via the #push method; do we need dup testing for worker#assign?
			idlingWorkers.enqueue( worker, function(){
				future.resolve({ command: 'terminating' });
				workerCount--;
				worker.terminate();
			});
		}

		return future.promise();
	}

	object.push = function( shard ) {
		if( idlingWorkers.length > 0 ){
			var worker = idlingWorkers.dequeue();
			worker.assign( shard );
		} else {
			internal_queue.push( shard );
			if( workerCount < workerLimit ){
				workerCount++;
				workerFactory.newWorker();
			}
		}
	}

	object.shards_waiting = function(){ return internal_queue.length };
	return object;
}


/*
 * Copyright 2015 by Mark Eschbach.
 */

/**
 * Deals with a possible delayed promise or immediate resolution if a value is known,
 * using the #resolve method to provide a value.
 *
 * TODO: Needs solid testing
 * TODO: Needs a better name
 */
function Future(){
	this.resolved = false; //TOOD: need better way to test the state
	this.resolve = function( value ){
		this.resolved = true;
		this.value = value;
	}

	this.promise = function(){
		if( this.resolved ){
			return Promise.resolve( this.value );
		}

		var resolver = new Promise( function( fulfill, fail ){
			if( this.resolved ){
				fulfill( this.value );
			}else{
				this.resolve = fulfill;
			}
		}.bind(this) );
		return resolver;
	}
}

/*
 * Copyright 2015 by Mark Eschbach.
 */

function spliced_sharding_strategy( maximumSize, queue ){
	var result = {};
	result.shard = function( data ){
		var promises = [];

		function submit_shard( data ){
			var future = new Future();
			promises.push( future.promise() );
			queue.push({ completion: future, data: data });
		}

		while( data.length > maximumSize ){
			var shard = data.splice( 0, maximumSize );
			submit_shard( shard );
		}
		submit_shard( data );

		return promises;
	}
	return result;
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
WorkAgentClient.prototype.openedChannel = function( channel, hasStarted  ){
	if( !channel ){ throw new Error("channel"); }
	this.channel = channel;
	this.dispatcher.linkPort( channel, hasStarted );

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
WorkAgentClient.prototype.assign = function( request ){
	return this.assign_work( request.data ).then( function( resultMessage ){
		request.completion.resolve( resultMessage );
	});
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

	var supervisorConfig;
	commandDispatcher.register( supervisorProtocol.initialize, function( message ){
		supervisorConfig = message.config;
		workDelegate = fifo_work_pool( workerFactory, (supervisorConfig.workers || {}).maxmium || 6 )
		workSharding = spliced_sharding_strategy( (supervisorConfig.sharding || {}).maximumSize || 100, workDelegate );
	});

	var workDelegate, workSharding, workerFactory;
	commandDispatcher.repliesTo( 'feed', function( message, progress ){
		var batchData = message.batch;
		var shardPromises = workSharding.shard( batchData );
		shardPromises.forEach( function( promise ) {
			promise.then( function( result ){
				progress(result); 
			});
		});
		return Promise.all( shardPromises ).then( function( output ){
			var result = [];
			output.forEach( function( r ){
				result = result.concat(r);
			});
			return result;
		});
	});

	//TODO: Worker spawning should really be moved out 
	workerFactory = {
		newWorker: function(){
			spawn_worker();
		}
	}

	var workers = {}; //TODO: Still needed?
	var workerNamer = new Base36Namer();
	function spawn_worker(){
		var id = "worker-" + workerNamer.next();
		var agent = new WorkAgentClient( id, supervisorConfig );
		agent.idle = function(){
			workDelegate.idling( agent );
		}
		workers[id] = agent;
		if( self.Worker ){
			spawn_internal_worker( id, agent ); //Apparently supported under FF && IE
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

	function spawn_internal_worker( id, agent ){
		var worker = new Worker( supervisorConfig.worker );
		worker.postMessage({ command: 'giraffe:web-worker-init', id: id });
		agent.openedChannel( worker, true );
	}

	commandDispatcher.linkPort( self, true );
}

;giraffe_supervisor();