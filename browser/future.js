/*
 * Copyright 2015 by Mark Eschbach.
 */

/**
 * Deals with a possible delayed promise or immediate resolution if a value is known,
 * using the #resolve method to provide a value.
 *
 * TODO: Needs solid testing
 * TODO: Needs a better name
 */
function Future(){
	this.resolved = false; //TOOD: need better way to test the state
	this.resolve = function( value ){
		this.resolved = true;
		this.value = value;
	}

	this.promise = function(){
		if( this.resolved ){
			return Promise.resolve( this.value );
		}

		var resolver = new Promise( function( fulfill, fail ){
			if( this.resolved ){
				fulfill( this.value );
			}else{
				this.resolve = fulfill;
			}
		}.bind(this) );
		return resolver;
	}
}
