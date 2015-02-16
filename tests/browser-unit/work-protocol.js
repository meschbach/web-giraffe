describe( "WorkProtocol", function(){
	describe( "when initializing the service", function(){
		it( "responds with a message when done", function(){
			return new Promise( function( fulfill, reject) { //TODO: I need a better method to ensure callbacks are called
				var channel = new MessageChannel();

				var client = work_protocol_client( channel.port1 );
				client.started = function( ){ fulfill(true); };
				var service = work_protocol_service( channel.port2 ); 

				client.initialize();
				service.start();
			}).should.eventually.become( true );
		});
	});

	describe( "given an intialized system", function(){
		beforeEach( function(){
			var channel = new MessageChannel();
			this.client = work_protocol_client( channel.port1 );
			this.client.initialize();

			this.service = work_protocol_service( channel.port2 );
			this.service.start();
		});

		describe( "when work is dispatched", function(){
			it( "dispatches the work to the server", function(){
				var self = this;
				return new Promise( function( fulfill, reject ){ //TODO: Need a better method to test
					self.service.perform = function(){ fulfill(true); }
					self.client.perform({});
				}).should.eventually.become( true );
			});

			it( "dispatches data to the server", function(){
				var data = { what: "you", like: true };
				var self = this;
				return new Promise( function( fulfill, reject ){ //TODO: Need a better method to test
					self.service.perform = function( data ){ fulfill( data ); }
					self.client.perform( data );
				}).should.eventually.become( data );
			});
		});
	});
});
