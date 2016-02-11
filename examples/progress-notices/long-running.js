function perform_work_on( set ){
	var futures = set.map( function( delay ){
		return new Promise( function( fulfill, reject ){
			setTimeout( function(){
				fulfill({ delay: delay });
			}, delay );
		});
	});
	return Promise.all( futures );
}

/*
 * Initializes the Giraffe Worker agent for this worker
 * using the defaults.
 *
 * This will invoke perform_work/1 when work is received by
 * this worker.
 */
importScripts("/lib/web-giraffe-worker.js");
giraffe_worker_agent();
