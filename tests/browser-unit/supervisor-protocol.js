describe( "SupervisorProtocol", function(){
	describe( "when initializing the service", function(){
		beforeEach( function(){
			var channel = new MessageChannel();

			this.client = supervisor_protocol_client( channel.port1 );
			this.server = supervisor_protocol_service( channel.port2 );
		});

		it( "notifies the client when done", function(){
			var self = this;
			return new Promise( function( fulfill, reject ){
				self.client.initialized = function(){ fulfill( true ); };

				self.client.initialize();
				self.server.start();
			}).should.eventually.become(true);
		});

		it( "asks the service to initialize", function(){
			var self = this;
			return new Promise( function( fulfill, reject ){
				self.server.initialize = function( ){ fulfill( true ); };

				self.client.initialize();
				self.server.start();
			}).should.eventually.become(true);
		});
	});

	describe( "given an intiailized system", function(){
		beforeEach( function(){
			var channel = new MessageChannel();

			this.server = supervisor_protocol_service( channel.port2 );
			this.server.start();

			this.client = supervisor_protocol_client( channel.port1 );
			this.client.initialize();
		});

		describe( "when a batch is feed into the supervisor", function(){
			it( "notifies the listener", function(){
				var batchData = [0,1,2,3,4];
				var self = this;
				return new Promise( function( fulfill, reject ){
					self.server.onBatch = function( data ){ fulfill( data ); };
					self.client.batch( batchData );
				}).should.eventually.become( batchData );
			});
		});
	});

	describe( "given a system completed processing data", function(){
		beforeEach( function(){
			var channel = new MessageChannel();

			this.server = supervisor_protocol_service( channel.port2 );
			this.server.start();

			this.client = supervisor_protocol_client( channel.port1 );
			this.client.initialize();
		});

		it( "notifies the client", function(){
			var result = {you: 'will see'};
			var self = this;
			return new Promise( function( fulfill, fail ){
				self.client.onResult = function( details ){ fulfill( details ); };
				self.server.completed( result );
			}).should.eventually.become( result );
		});
	});
});
