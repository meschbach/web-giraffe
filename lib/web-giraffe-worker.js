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


var workProtocol = {
	initialize: "giraffe:work-agent:initialize",
	initialized: "giraffe:work-agent:initialized",
	started: "giraffe:work-agent:started",
	operation: "giraffe:work-agent:operation"
};

/**
 * Worker agent
 */
function giraffe_worker_agent( worker, control_channel ){
	/*
	 * ensure our extension points exist
	 */
	worker = worker || self;
	worker.init = worker.init || nope;
	worker.perform_work_on = worker.perform_work_on || nope;
	control_channel = control_channel || self;

	var dispatcher = new CommandDispatcher();
	dispatcher.defaultHandler = function( command ){
		console.error( "[work-agent] unhandled command ", command );
	}
	dispatcher.usesPromises( new Base36Namer() );

	function work_agent( id, supervisor_channel, hasStarted ) {
		var agent_control = new CommandDispatcher();
		agent_control.defaultHandler = function( cmd ){
			console.warn( "[worker:",id,"] Unknown comamnd: ", cmd );
		};
		agent_control.usesPromises( new Base36Namer() );
		//Work Protocol Service
		agent_control.repliesTo( workProtocol.initialize, function( command ){
			return Promise.resolve( worker.init( command.config ) ).then( function(){
				return {id: id};
			});
		});
		agent_control.repliesTo( workProtocol.operation, function( command ){
			return Promise.resolve( worker.perform_work_on( command.on ) );
		});
		agent_control.linkPort( supervisor_channel, hasStarted );
	}

	dispatcher.register( "giraffe:browser-worker-init", function( message, env ){
		id = message.id;
		port = env.ports[0]; 
		work_agent( id, port, false );
	});

	dispatcher.register( "giraffe:web-worker-init", function( message ){
		work_agent( message.id, self, true );
	});

	control_channel.addEventListener( 'message', function( event ){
		var message = event.data;
		dispatcher.dispatch( message, event );
	});
}
