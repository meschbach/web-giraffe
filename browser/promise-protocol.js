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

			var handlerPromise = Promise.resolve( handler( message ) );
			handlerPromise.then( function( result ){
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

