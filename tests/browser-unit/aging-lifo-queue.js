/*
 * Copyright 2015 by Mark Eschbach.
 */

describe( "AgingLIFOQueue", function(){
	describe( "given the queue is empty", function(){
		it( "then has a length of 0", function(){
			var queue = aging_lifo_queue();
			queue.length.should.equal(0);
		});

		it( "when dequeuing, then an error is thrown ", function(){
			var queue = aging_lifo_queue();
			expect(function(){ queue.dequeue(); }).to.throw(Error);
		});
	});

	describe( "when an element is enqueued", function(){
		describe( "and the next operation is dequeue", function(){
			it( "results in the element", function(){
				var queue = aging_lifo_queue();
				queue.enqueue( 1 );
				queue.enqueue( 2 );
				queue.dequeue().should.equal(2);
			});

			it( "does not invoke the timeout function", function(){
				var watch = sinon.spy();
				var timer = manual_timer();

				var queue = aging_lifo_queue( timer );
				queue.enqueue( 1 );
				queue.enqueue( 2, watch );
				queue.dequeue();

				timer.expireAll();
				watch.should.not.have.been.called;
			});
		});

		describe( "and the timeout period elapses", function(){

			it( "is not returned", function(){
				var timer = manual_timer();
				var queue = aging_lifo_queue( timer );

				queue.enqueue( 1 );
				queue.enqueue( 3 );

				timer.expireAll();

				queue.length.should.equal(0);
			});

			it( "invokes the custom expiry callback", function(){
				var mock = sinon.spy();

				var timer = manual_timer();
				var queue = aging_lifo_queue( timer );
				queue.enqueue( 5, mock ); 

				timer.expireAll();
				mock.should.have.been.calledOnce;
			});
		});
	});
});
