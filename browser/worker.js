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
