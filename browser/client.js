function Giraffe( config ){
	this.cfg = config || {};
	this.cfg.worker = this.cfg.worker || "web-giraffe-worker.js";

	this.pendingPromises = [];
	this.dispatcher = new CommandDispatcher();
	this.dispatcher.usesPromises( new Base36Namer() );
	this.dispatcher.defaultHandler = function( command ){
		console.error( "Recieved invalid command: ", command )
	};

	/*
	 * WorkerFactory service
	 * TOOD: Needs to be converted to promise interface
	 */
	this.dispatcher.repliesTo(  workerFactoryProtocol.spawn, function( command ){
		return new Promise( function( fulfill, reject ){
			var channel = new MessageChannel();

			var workerScript = this.cfg.worker;
			var worker = new Worker( workerScript );
			worker.addEventListener( "error", function( problem ){
				console.error( "Problem setting up work agent", problem );
			});
			worker.postMessage({ command: "giraffe:browser-worker-init", id: command.id }, [channel.port2] );
			fulfill({ transfer: [channel.port1] });
		}.bind(this));
	}.bind( this ) );

	this.namer = new Base36Namer();
}

Giraffe.prototype.start = function(){
	if( this.supervisor ) { return; }

	var supervisorScript = this.cfg.supervisor || "web-giraffe-supervisor.js";
	this.supervisor = new Worker( supervisorScript );
	this.dispatcher.linkPort( this.supervisor, true );

	/*
	 * Send configuration
	 */
	var supervisorConfiguration = {
		worker: this.cfg.worker,
		map: this.cfg.map
	};
	this.supervisor.postMessage({ command: supervisorProtocol.initialize, config: supervisorConfiguration });

	this.supervisor.addEventListener('error', function(problem){
		console.warn( "[supervisor] Encountered error: ", problem );
		var message = problem.message ? problem.message : "(unkonwn supervisor error)"; 
		var err = new Error( message );
		this.pendingPromises.forEach( function( promiseHandler ){
			promiseHandler({ succes:false, failure: err });
		});
		this.supervisor = null;
	}.bind(this));
}

Giraffe.prototype.feed = function( batch ){
	this.start();
	return this.dispatcher.withReplyTo({ command: 'feed', batch: batch });
}

//Really apart of a wrapper for IPC communication using command channels; should be pulled out
Giraffe.prototype.promiseReply = function( command ){
	var name = this.namer.next();
	var receiver = this.dispatcher.promiseMessage( name ).then( function( message ){
		if( message.error ){
			throw new Error( message.error );
		}
		return message.result;
	});
	command.replyTo = name;
	this.supervisor.postMessage( command );
	return receiver;
}

function web_giraffe( config ){ return new Giraffe( config ); }
