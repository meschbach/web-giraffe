/*
 * Copyright 2015 by Mark Eschbach.
 */

function spliced_sharding_strategy( maximumSize, queue ){
	var result = {};
	result.shard = function( data ){
		while( data.length > maximumSize ){
			var shard = data.splice( 0, maximumSize );
			queue.push( shard );
		}
		queue.push( data );
	}
	return result;
}

