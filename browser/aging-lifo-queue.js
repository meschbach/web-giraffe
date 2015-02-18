/*
 * Copyright 2015 by Mark Eschbach.
 */

function manual_timer(){ //TODO: Test?  Simple enough, but should make sure
	var notifications = [];
	var self = {};
	self.expiresAt = function( time, perform ){
		notifications.push( perform );
		return {
			cancel: function(){
				notifications.splice( notifications.indexOf( perform ), 1 );
			}
		};
	}
	self.expireAll = function(){
		notifications.forEach(function( cb ){
			cb();
		});
	}
	return self;
}

function real_clock_timer(){ //TODO: Test?  Simple enough, but should make sure
	var timer = {};
	timer.expiresAt = function( when, cb ){
		var timer = setTimeout( cb, when );
		return { cancel: function(){ clearTimeout( timer ); } };
	}
	return timer;
}

/**
 * Aging LIFO queue
 *
 * A queue where elements will have two fates:
 *	-> The element is dequeued within a specific peroid of time
 *	-> A queue specific period of times passes
 *		and the element is dequeued.
 *
 * TOOD: Is there a better name?  This could also be confused
 *	with a LIFO queue where a number of operations occur
 *	before evicting elements
 */
function aging_lifo_queue( timer ){
	timer = timer || real_clock_timer();
	var self = [];
	self.timeout = 1000;

	self.enqueue = function( element, expiryCallback ){
		expiryCallback = expiryCallback || nope;
		var expiryClock = timer.expiresAt( self.timeout, function(){
			self.splice( self.lastIndexOf( handle ), 1 );
			expiryCallback();
		});

		var handle = { //TODO: Probably should become a real object
			datum: element,
			cancelTimer: function(){
				expiryClock.cancel();
			}
		};
		self.push( handle );
	}

	self.dequeue = function(){
		if( self.length == 0 ){ throw new Error("empty"); }
		var handle = self.pop();
		handle.cancelTimer();
		return handle.datum;
	}
	return self;
}
