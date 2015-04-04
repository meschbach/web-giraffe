/*
 * Copyright 2015 Mark Eschbach
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * NodeJS Primary Giraffe Environment
 */

var q = require("q");
var child_process = require("child_process");

function WebGiraffe( cfg ) {
	this.cfg = cfg;
	this.started = false;
}

WebGiraffe.prototype.start = function( ) {
	if( this.started ){ return ; }
	this.started = true;
	this.supervisor = child_process.fork(__dirname + "/supervisor.js");
}

WebGiraffe.prototype.feed = function( input ) {
	this.start();
	//Dispatch supervisor
	//return a promise of work
	return q( this.cfg );
};

exports.init = function( cfg ) {
	return new WebGiraffe( cfg );
};
