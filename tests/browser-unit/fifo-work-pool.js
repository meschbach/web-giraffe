describe( "FIFO Work Manager", function(){
	describe( "given the pool has idling workers", function(){
		it( "when work is provided it dispatches to the idling worker", function(){
			var mockWorker = { assign: sinon.spy() };
			var work = [2,3,5,7,9,13];

			var pool = fifo_work_pool();
			pool.idling( mockWorker );
			pool.push( work );
			mockWorker.assign.should.have.been.calledWith( work );
		});
	});

	describe( "given the pool as no idling workers", function(){
		describe( "and more workers may be created", function(){
			it( "requests a new worker from the factory", function(){
				var factory = { newWorker: sinon.spy() };
				var work = [ 17, 19, 23, 29 ];
				var pool = fifo_work_pool( factory );
				pool.push( work );
				factory.newWorker.should.have.been.calledOnce;
			});
		});
		describe( "and we have reached the limits of the pool", function(){
			it( "places the element on the intenral queue", function(){
				var factory = { newWorker: sinon.spy() };
				var pool = fifo_work_pool( factory, 1 );
				var work = [ 31, 37 ];
				pool.push( work );
				pool.shards_waiting().should.equal( 1 );
			});
		});
	});

	describe( "given a worker ready to idle in the pool", function(){
		describe( "and no work available in the pool", function(){
			describe( "when the idle timeout is reached", function(){
				it( "then the worker is notifed of timeout", function(){
					var mockWorker = { terminate: sinon.spy() };
					var pool = fifo_work_pool();
					pool.timeout = 0;
					var resolution = pool.idling( mockWorker );
					return resolution.then( function(){
						mockWorker.terminate.should.have.been.called.once;
					});
				});
			});
			describe( "when work is received prior to the timeout", function(){
				it( "assings the work", function(){
					//TODO: Redundant test with data push examples? 
					var example = [ 47 ];
					var mockWorker = { assign: sinon.spy() };
					var pool = fifo_work_pool();
					var resolved = pool.idling( mockWorker );

					pool.push( example );
					mockWorker.assign.should.have.been.calledWith( example );
				});
			});
		});

		describe( "and work available", function(){
			it( "immedidately assings the work", function(){
				var mockWorker = { assign: sinon.spy() };
				var factory = { newWorker: nope };
				var data = [ 41 ];
				var pool = fifo_work_pool( factory );
				pool.push( data );
				pool.idling( mockWorker );
				mockWorker.assign.should.have.been.calledWith( data );
			});
		});
	});
});

