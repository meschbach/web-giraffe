describe( "SplicedShardingStrategy", function(){
	describe( "given an empty input", function(){
		it( "places an empty shard on the queue", function(){
			var fifo = [];
			var distributor = spliced_sharding_strategy( 3, fifo );
			distributor.shard([]);
			fifo.should.deep.equal([ [] ]);
		});
	});
	describe( "given an input less than the shard size", function(){
		it( "places the input in a single shard", function(){
			var fifo = [];
			var shard = spliced_sharding_strategy( 3, fifo );
			shard.shard([ 0, 1, 2 ]);
			fifo.should.deep.equal([ [0,1,2] ]);
		});
	});
	describe( "given an input larger than the shard size", function(){
		it( "splits the input into a series of buckets", function(){
			var fifo = [];
			var shard = spliced_sharding_strategy( 3, fifo );
			shard.shard([ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9 ]);
			fifo.should.deep.equal([ [0,1,2], [3,4,5], [6,7,8],[9] ]);
		});
	});
});

