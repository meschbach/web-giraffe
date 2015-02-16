function work_protocol_service( channel ){
	var service = {
		start: function(){
			channel.start();
		},
		perform: nope
	};

	var dispatcher = new CommandDispatcher();
	dispatcher.register( workProtocol.initialize, function(){
		channel.postMessage({ command: workProtocol.started});
	});
	dispatcher.register( workProtocol.operation, function( command ){
		service.perform( command.on );
	});
	dispatcher.linkChannel( channel );

	return service;
}

