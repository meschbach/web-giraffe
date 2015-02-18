/*
 * Copyright 2015 by Mark Eschbach.
 */

function spliced_sharding_strategy( maximumSize, queue ){
	var result = {};
	result.shard = function( data ){
		var promises = [];

		function submit_shard( data ){
			var future = new Future();
			promises.push( future.promise() );
			queue.push({ completion: future, data: data });
		}

		while( data.length > maximumSize ){
			var shard = data.splice( 0, maximumSize );
			submit_shard( shard );
		}
		submit_shard( data );

		return promises;
	}
	return result;
}

