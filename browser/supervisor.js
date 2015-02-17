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
		var agent = new WorkAgentClient( id, supervisorConfig );
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

