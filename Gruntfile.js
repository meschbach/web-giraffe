module.exports = function( grunt ){
	var generatedOutput = process.env["DIST"] || "target/browser/";

	/*
	 * Source files used by all workers within the system
	 */
	var coreSource = [
		'browser/command-dispatcher.js',
		'browser/base36-namer.js',
		'browser/promise-protocol.js'
	];

	/*
	 * Sources specific to the client interface
	 */
	var clientSource = coreSource.concat([
		'browser/supervisor-protocol.js',
		'browser/worker-factory-protocol.js',
		'browser/client.js'
	]);

	/*
	 * Supervisor specific sources 
	 */
	var supervisorSource = coreSource.concat([
		'browser/aging-lifo-queue.js',
		'browser/fifo-work-pool.js',
		'browser/future.js',
		'browser/spliced-sharding-strategy.js',
		'browser/supervisor-protocol.js',
		'browser/work-protocol.js',
		'browser/worker-factory-protocol.js',
		'browser/supervisor.js'
	]);

	/*
	 * Worker process sources 
	 */
	var workerSource = coreSource.concat([
		'browser/work-protocol.js',
		'browser/worker.js'
	]);

	var config = {
		pkg: grunt.file.readJSON( "package.json" ),
		concat: {
			"browser-client" : {
				src: clientSource,
				dest: generatedOutput + "web-giraffe.js"
			},
			"browser-supervisor" : {
				src: supervisorSource,
				dest: generatedOutput + "web-giraffe-supervisor.js",
				options: {
					footer: ";giraffe_supervisor();"
				}
			},
			"browser-worker" : {
				src: workerSource,
				dest: generatedOutput + "web-giraffe-worker.js"
			},
			"test-worker" : {
				src: "browser/test-worker.js",
				dest: "target/browser/test-worker.js"
			},
			"example-client" : {
				src: clientSource,
				dest: "examples/lib/web-giraffe.js"
			},
			"example-supervisor" : {
				src: supervisorSource,
				dest: "examples/lib/web-giraffe-supervisor.js",
				options: {
					footer: ";giraffe_supervisor();"
				}
			},
			"example-worker" : {
				src: workerSource,
				dest: "examples/lib/web-giraffe-worker.js"
			},
			"example-libs" : {
				src: "bower_components/jquery/dist/jquery.js",
				dest: "examples/lib/jquery.js"
			}
		},
		karma: {
			frontend: {
				configFile: 'karma.conf.js',
				singleRun: true,
				background: false 
			}
		},
		uglify: {
			browser: {
				options: { compress: true, mangle: true },
				files: { }
			}
		},
		watch: {
			browser: {
				files: ['browser/**/*.js'],
				tasks: ["build-browser-artifacts", "build-examples"]
			}
		}
	};
	config.uglify.browser.files[generatedOutput + "/web-giraffe.min.js" ] =  generatedOutput+ "/web-giraffe.js"; 
	config.uglify.browser.files[generatedOutput + "/web-giraffe-supervisor.min.js" ] =  generatedOutput+ "/web-giraffe-supervisor.js"; 
	config.uglify.browser.files[generatedOutput + "/web-giraffe-worker.min.js" ] =  generatedOutput+ "/web-giraffe-worker.js"; 
	grunt.initConfig( config );

	grunt.loadNpmTasks("grunt-contrib-concat");
	grunt.loadNpmTasks("grunt-contrib-uglify");
	grunt.loadNpmTasks("grunt-contrib-watch");

	grunt.registerTask( "build-examples", [ "concat:example-client", "concat:example-supervisor", "concat:example-worker", "concat:example-libs" ]);
	grunt.registerTask( "build-browser-artifacts", ["concat:browser-client", "concat:browser-supervisor", "concat:browser-worker", "concat:test-worker", "uglify"] );
	grunt.registerTask("default", ["build-browser-artifacts"]);
}
