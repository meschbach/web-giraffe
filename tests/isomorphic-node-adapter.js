global.isomorphic = function( build_tests ) {
	var sinon = require( "sinon" );
	var sinonChai = require("sinon-chai");
	var chai = require("chai");
	var chaiAsPromised = require("chai-as-promised");
	 
	chai.use(sinonChai);
	chai.use(chaiAsPromised);
	chai.should();

	var mod = require( __dirname + "/../target/node/isomorphic.js" );
	build_tests( mod, sinon ); 
};
