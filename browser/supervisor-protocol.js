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

