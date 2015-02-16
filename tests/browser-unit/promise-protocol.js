describe( "Promise protocol", function(){
	describe( "when working with normal replies", function(){
		var serviceName = "promise-test";
		beforeEach( function(){
			var channel = new MessageChannel();

			this.service = new CommandDispatcher();
			this.service.usesPromises( new Base36Namer() );
			this.service.linkPort( channel.port1 );

			this.client = new CommandDispatcher();
			this.client.usesPromises( new Base36Namer() );
			this.client.linkPort( channel.port2 );
		});

		it( "notifies succesful result", function(){
			this.service.repliesTo( serviceName, function( command ){
				return new Promise( function( fulfill ){ fulfill( true ); }); 
			});

			var promise = this.client.withReplyTo({ command: "promise-test", giveResult: true });
			return promise.should.eventually.become( true );
		});
		it( "notifies on failure", function(){
			this.service.repliesTo( serviceName, function( command ){
				return new Promise( function( fulfill ){ throw new Error( "Just trust me" ); }); 
			});

			var promise = this.client.withReplyTo({ command: "promise-test"});
			return promise.should.eventually.be.rejected;
		});
	});
	describe( "when working with transferable replies", function(){
		it( "resovles with the request element", function(){
			var channel = new MessageChannel();

			this.service = new CommandDispatcher();
			this.service.usesPromises( new Base36Namer() );
			this.service.linkPort( channel.port1 );

			this.client = new CommandDispatcher();
			this.client.usesPromises( new Base36Namer() );
			this.client.linkPort( channel.port2 );

			var name = "promise-transferable";
			var target = new MessageChannel();
			this.service.repliesTo( name, function( command){
				if( !command.transfered ){ throw new Error("no transferes"); }
				if( !command.transfered[0] ){ throw new Error("wrong port"); }
				return Promise.resolve({ ok: true, transfer: [target.port1] });
			});
			return this.client.withReplyTo({command: name, transfer: [target.port2]} ).then(function( reply ){
				return reply.transfered[0];
			}).should.eventually.become( target.port1 );
		});
	});
});
