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
	this.channel.postMessage({command: workProtocol.initialize, id: this.id, config: this.cfg });
	return self;
}
WorkAgentClient.prototype.assign_work = function( data ){
	return this.dispatcher.withReplyTo({ command: workProtocol.operation, on: data });
}
WorkAgentClient.prototype.assign = function( request ){
	var completion = this.assign_work( request.data ).then( function( resultMessage ){
		request.completion.resolve( resultMessage );
	});
	completion.then( function(){ this.idle(); }.bind(this) );
	return completion;
}

WorkAgentClient.prototype.terminate = function( ){
	this.channel.postMessage({command: workProtocol.terminate, id: this.id, config: this.cfg });
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

