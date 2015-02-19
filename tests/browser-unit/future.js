/*
 * Copyright 2015 by Mark Eschbach.
 */

describe( "Future", function(){
	describe( "when created", function(){
		it( "is not resolved", function(){
			var future = new Future();
			future.resolved.should.equal(false);//TOOD I would rather test the promise itself...need to brush up on Chai as Promised
		});
	});

	describe( "when given the value before promising", function(){
		it( "resolves with undefined", function(){
			var future = new Future();
			future.resolve( undefined );
			future.resolved.should.equal( true );
			return future.promise().should.eventually.become.undefined; 
		});

		it( "resolves immeidately", function(){
			var value = "waste some time with me";
			var future = new Future();
			future.resolve( value );
			future.resolved.should.equal( true );
			return future.promise().should.eventually.become( value ); 
		})
	});

	describe( "when given a value after promising", function(){
		describe( "and before the promise has a chance to run", function(){
			it( "handles the undefined value correctly", function(){
				var future = new Future();
				var promise = future.promise();
				future.resolve( undefined );
				return promise.should.eventually.become.undefined; 
			});

			it( "still resolves correctly", function(){
				var value = "you were there for me";
				var future = new Future();
				var promise = future.promise();
				future.resolve( value );
				return promise.should.eventually.become( value ); 
			});
		});

		describe( "after the promise has a chance to run", function(){
			it( "resolves undefined correctly", function(){
				var future = new Future();
				var promise = future.promise();
				setTimeout( function(){
					future.resolve( undefined );
				}, 10 );
				return promise.should.eventually.become.undefined; 
			});

			it( "resolves correctly", function(){
				var value = "the things you understood";
				var future = new Future();
				var promise = future.promise();
				setTimeout( function(){
					future.resolve( value );
				}, 10 );
				return promise.should.eventually.become( value ); 
			});
		});
	});
});
