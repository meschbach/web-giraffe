exports.perform_work_on = function (input) {
	return input.map( function( v ){
		return v * 2;
	});
};
