function factorial( n ){
	if( n < 1 ){ return 1; }
	if( n == 1 ){ return 1; }
	return factorial( n - 1 ) * n;
}

function perform_work_on( set ){
	return set.map( factorial );
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
