describe( "WorkerFactoryProtocol", function(){
	describe( "given a setup system", function(){
		beforeEach( function(){
			this.channel = new MessageChannel();

			this.service = new CommandDispatcher();
			this.service.usesPromises( new Base36Namer() );
			this.service.linkPort( this.channel.port1 );

			this.client = new CommandDispatcher();
			this.client.usesPromises( new Base36Namer() );
			this.client.linkPort( this.channel.port2 );

			this.factory = {
				spawn: function(){ return true; }
			};
			worker_factory_service( this.service, this.factory );
			this.factory_client = worker_factory_client( this.client );
		});

		describe( "when requesting a new worker", function(){
			it( "remote worker factory recieves the request with the configuration", function(){
				var config = {'half way': 'through' };
				this.factory.spawn = sinon.spy( this.factory.spawn );
				return this.factory_client.spawn( config ).then( function(){
					return this.factory.spawn.should.have.been.calledWith( config );
				}.bind(this) );
			});

			it( "returns the results to the client", function(){
				var blob = {where:'is the fire', cool: 'it off before you burn it out'};
				this.factory.spawn = function(){ return blob; };
				return this.factory_client.spawn().should.eventually.become( blob );
			});
		});
	});
});
