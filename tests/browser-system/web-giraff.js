"use strict";

describe( "WebGiraff", function(){
	it( "defines the well known entry point", function(){
		should.exist( web_giraffe );
	});

	describe( "when given data", function(){
		it( "responds eventually", function(){
			var data = [0, 1, 2, 3, 4, 5, 6];

			var giraffe = web_giraffe({
				supervisor: "/web-giraffe-supervisor.js",
				worker: "/web-giraffe-worker.js"
			});
			var result = giraffe.feed( data );
			return result.should.eventually.become(data);
		});

		it( "responds with the transformation requrest", function(){
			function sum_before( input ){
				if( input == 0 ){  return 0; }
				return sum_before( input - 1 ) + input;
			}

			var data = [0, 1, 2, 3, 4, 5, 6];

			var giraffe = web_giraffe({
				supervisor: "/web-giraffe-supervisor.js",
				worker: "/web-giraffe-worker.js",
				map: "sum_before"
			});
			var result = giraffe.feed( data );
			return result.should.eventually.become([ 0, 1, 3, 6, 10, 15, 21]);
		});
	});
});
