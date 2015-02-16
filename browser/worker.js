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
