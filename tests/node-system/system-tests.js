var web_giraffe = require(__dirname + "/../../env/node/web-giraffe.js");

var chai = require("chai");
var chaiAsPromised = require("chai-as-promised");
 
chai.use(chaiAsPromised);
chai.should();

describe( "Web Giraffe", function(){
	describe( "given an empty array", function(){
		describe( "when processed with identity", function(){
			it( "then repsonds with an empty array", function(){
				var input = [];
				var giraffe = web_giraffe.init({
					worker: require( __dirname + "/identity_worker.js" )
				});
				var result = giraffe.feed(input);
				return result.should.eventually.become([]);
			});
		});
	});

	describe( "given an array of number", function(){
		describe( "when processed the doubler", function(){
			it( "then repsonds double of each number", function(){
				var input = [2,3,5,7,13,17,19];
				var giraffe = web_giraffe.init({
					worker: require( __dirname + "/doubler_worker.js" )
				});
				var result = giraffe.feed(input);
				return result.should.eventually.become([ 4,6, 10, 14, 26, 34, 38]);
			});
		});
	});
});
