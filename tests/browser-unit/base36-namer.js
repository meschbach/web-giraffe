describe( "Base36 Namer", function(){
	describe( "when asked for a name", function(){
		it( "provides one", function(){
			var namer = new Base36Namer();
			var name = namer.next();
			name.should.not.be.undefined;
		});
	});

	describe( "when asked for multiple names", function(){
		it( "provides different names", function(){
			var namer = new Base36Namer();
			var name1 = namer.next();
			var name2 = namer.next();
			name1.should.not.equal(name2);
		});
	});
});
