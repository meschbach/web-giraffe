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
//	console.log( "Sending: ", message );
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


var workProtocol = {
	initialize: "giraffe:work-agent:initialize",
	initialized: "giraffe:work-agent:initialized",
	started: "giraffe:work-agent:started",
	operation: "giraffe:work-agent:operation"
};

/**
 * Worker agent
 */
function giraffe_work_agent( control_channel ){
	var dispatcher = new CommandDispatcher();
	dispatcher.defaultHandler = function( command ){
		console.error( "[work-agent] unhandled command ", command );
	}

	function work_agent( id, supervisor_channel ) {

		//Work splint; splice dispatch to actual work here; must be a promise
		function sum_before( input ){
			if( input == 0 ){  return 0; }
			return sum_before( input - 1 ) + input;
		}
		var algorithms = { //TODO: perform_work_on should be an integration seem
			identity: function( input ){ return  input; },
			sum_before: sum_before
		};
		var workConfig;
		function perform_work_on( data ){
			return new Promise( function( fulfill, fail ){
				var mapAlgorithmName = workConfig.map || "identity";
				var mapAlgorithm = algorithms[ mapAlgorithmName ];
				var result = data.map( mapAlgorithm );
				fulfill( result );
			});
		}
		
		var agent_control = new CommandDispatcher();
		agent_control.defaultHandler = function( cmd ){
			console.warn( "[worker:",id,"] Unknown comamnd: ", cmd );
		};
		agent_control.usesPromises( new Base36Namer() );
		//Work Protocol Service
		agent_control.repliesTo( workProtocol.initialize, function( command ){
			return new Promise( function( fulfill ){
				workConfig = command.config;
				fulfill({id: id});
			});
		});
		agent_control.repliesTo( workProtocol.operation, function( command ){
			return perform_work_on( command.on );
		});
		agent_control.linkPort( supervisor_channel );
	}

	dispatcher.register( "giraffe:browser-worker-init", function( message, env ){
		id = message.id;
		port = env.ports[0]; 
		work_agent( id, port );
	});

	control_channel.addEventListener( 'message', function( event ){
		var message = event.data;
		dispatcher.dispatch( message, event );
	});
}

giraffe_work_agent( self );
