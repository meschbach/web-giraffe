function sum_before( input ){
	if( input == 0 ){  return 0; }
	return sum_before( input - 1 ) + input;
}
var algorithms = { //TODO: perform_work_on should be an integration seem
	identity: function( input ){ return  input; },
	sum_before: sum_before
};

var workConfig;
function perform_work_on( data ){
	var mapAlgorithmName = workConfig.map || "identity";
	var mapAlgorithm = algorithms[ mapAlgorithmName ];
	var result = data.map( mapAlgorithm );
	return result;
}

function init( config ){
	workConfig = config;
}

importScripts( "/assets/web-giraffe-worker.js" );
giraffe_worker_agent();
