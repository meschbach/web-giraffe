/*
 * Copyright 2015 by Mark Eschbach.
 */
function fifo_work_pool( workerFactory, workerLimit ){
	workerLimit = workerLimit || 1;

	var internal_queue = [];
	var idlingWorkers = aging_lifo_queue();
	var workerCount = 0;

	var object = {};
	object.timeout = 1000;
	object.idling = function( worker ){
		var future = new Future();

		if( internal_queue.length > 0 ){
			var assignment = internal_queue.pop();
			worker.assign( assignment );
			future.resolve({ command: 'assigned' });
		}else{
			//TODO: The other branch is tested via the #push method; do we need dup testing for worker#assign?
			idlingWorkers.enqueue( worker, function(){
				future.resolve({ command: 'terminating' });
				workerCount--;
				worker.terminate();
			});
		}

		return future.promise();
	}

	object.push = function( shard ) {
		if( idlingWorkers.length > 0 ){
			var worker = idlingWorkers.dequeue();
			worker.assign( shard );
		} else {
			internal_queue.push( shard );
			if( workerCount < workerLimit ){
				workerCount++;
				workerFactory.newWorker();
			}
		}
	}

	object.shards_waiting = function(){ return internal_queue.length };
	return object;
}

