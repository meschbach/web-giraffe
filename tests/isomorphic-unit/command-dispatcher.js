"use strict";

isomorphic(function build_tests( ctx, sinon, config ){

describe( "CommandDispatcher", function(){
	describe( "when a message is received for a known handler", function(){
		it( "dispatches the message to the registered handler", function(){
			var callback = sinon.spy();
			var commandName = "known-command";
			var exampleMessage = {command: commandName};
			var context = {};
			var handler = new ctx.CommandDispatcher();

			handler.register( commandName, callback );
			handler.dispatch( exampleMessage, context );
			callback.should.have.been.calledWith( exampleMessage, context );
		});

		it( "dispatches the message to the correct handler", function(){
			var callback = sinon.spy();
			var otherCommandHandler = sinon.spy();

			var commandName = "lay your head down";
			var exampleMessage = {command: commandName};
			var handler = new ctx.CommandDispatcher();

			handler.register( commandName, callback );
			handler.register( "for the moment we are living", otherCommandHandler );
			handler.dispatch( exampleMessage );
			otherCommandHandler.should.have.not.been.called;
		});
	});

	describe( "when a message is received for an unknown handler", function(){
		it( "with no handlers dispatches to the default handler", function(){
			var reciever = sinon.spy();
			var message = { command: 'a thousand whiskeys' };
			var context = {};
			var handler = new ctx.CommandDispatcher();
			handler.defaultHandler = reciever;
			handler.dispatch( message, context );
			reciever.should.have.been.calledWith( message, context );
		});

		it( "with handlers dispatches to the default handler", function(){
			var reciever = sinon.spy();
			var message = { command: 'my low stat' };
			var context = {};
			var handler = new ctx.CommandDispatcher();
			handler.defaultHandler = reciever;
			handler.register( "strength score", function(){} );
			handler.dispatch( message, context );
			reciever.should.have.been.calledWith( message, context );
		});
	});

	describe( "when registering once handlers", function(){
		it( "inovkes the receiver the next time the message is received", function(){
			var name = 'once finished';
			var context = { sad: 'robot'};
			var receiver = sinon.spy();
			var handler = new ctx.CommandDispatcher();
			handler.once(name, receiver );
			var message = { command: name };
			handler.dispatch( message, context );
			receiver.should.have.been.calledWith( message, context );
		});

		it( "does not dispatch to the receiver more than once", function(){
			var name = 'do da da dum do';
			var receiver = sinon.spy();
			var handler = new ctx.CommandDispatcher();
			handler.once( name, receiver );
			var message = { command: name };
			handler.dispatch( message );
			handler.dispatch( message );
			receiver.should.have.been.calledOnce;
		});
	});

	describe( "when asking for a message promise", function(){
		it( "it is fulfill when the message is received", function(){
			var handler = new ctx.CommandDispatcher();
			var name = "down low";
			var message = { command: name };
			var future = handler.promiseMessage( name );
			handler.dispatch( message );
			future.should.eventually.become( message );
		});
	});

	if( config.hasMessageChannel ){
		describe( "when linked with a message channel", function(){
			it( "invokes the dispatcher for messages received", function(){
				var name = "temptations";
				var message = { command: name };
				var channel = new MessageChannel();

				var dispatcher = new ctx.CommandDispatcher();
				dispatcher.linkChannel( channel.port1 );
				var receiver = dispatcher.promiseMessage( name );

				channel.port2.postMessage( message );

				channel.port1.start();
				channel.port2.start();
				return receiver.should.eventually.become( message );
			});
		});
	}
});

}
);

