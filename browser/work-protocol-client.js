function work_protocol_client( channel ){
	var dispatcher = new CommandDispatcher();
	dispatcher.register( workProtocol.started, function( message ){
		result.started();
	});
	dispatcher.linkChannel( channel );

	var result = {
		started: nope,
		initialize: function(){
			channel.start();
			channel.postMessage({command: workProtocol.initialize });
		},
		perform: function( data ){
			channel.postMessage({command: workProtocol.operation, on: data });
		}
	};
	return result;
}

