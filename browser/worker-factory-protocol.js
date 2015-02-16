var workerFactoryProtocol = {
	spawn: 'giraffe:worker-factory:spawn',
};

function RemoteWorkerFactory( dispatcher ){
	this.dispatcher = dispatcher;
}
RemoteWorkerFactory.prototype.spawn = function( configuration ){
	return this.dispatcher.withReplyTo({ command: workerFactoryProtocol.spawn, config: configuration });
}

function worker_factory_client( dispatcher ){
	return new RemoteWorkerFactory( dispatcher );
}

function worker_factory_service( dispatcher, factory ){
	if( !factory ){ throw new Error("Factory requried"); }

	dispatcher.repliesTo( workerFactoryProtocol.spawn, function( command ){
		var config = command.config;
		var result = factory.spawn( config );
		var factoryPromise = Promise.resolve( result );
		return factoryPromise;
	});
}

