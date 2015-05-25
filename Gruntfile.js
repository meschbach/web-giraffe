module.exports = function( grunt ){
	var generatedOutput = process.env["DIST"] || "target/";
	var generatedBrowserOutput = generatedOutput + "browser/";

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
				dest: generatedBrowserOutput + "web-giraffe.js"
			},
			"browser-supervisor" : {
				src: supervisorSource,
				dest: generatedBrowserOutput + "web-giraffe-supervisor.js",
				options: {
					footer: ";giraffe_supervisor();"
				}
			},
			"browser-worker" : {
				src: workerSource,
				dest: generatedBrowserOutput + "web-giraffe-worker.js"
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
			},
			"isomorphic" : {
				options: {
				},
				src: [ "env/isomorphic/**/*.js" ],
				dest: generatedOutput + "node/isomorphic.js"
			}
		},
		karma: {
			frontend: {
				configFile: 'karma.conf.js',
				singleRun: true,
				background: false
			}
		},
		mochaTest: {
			test: {
				options: {
          reporter: 'spec',
          quiet: false,
          clearRequireCache: true
        },
        src: ['tests/node-system/**/*.js']
			},
			isomorphicTest: {
				options: {
          reporter: 'spec',
          quiet: false,
          clearRequireCache: true,
					require: [ "tests/isomorphic-node-adapter.js" ]
        },
        src: ['tests/isomorphic-unit/**/*.js']
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
			},
			node:{
				files: ['env/node/**/*.js', 'tests/node-system/**/*.js'],
				tasks: ["mochaTest"]
			}
		}
	};

	//Isometric artifacts
	config.concat.isomorphic.options.banner = 'var Promise = require("es6-promise").Promise;\n\n';
	config.concat.isomorphic.options.footer = ['CommandDispatcher', 'Future'].map(function ( name ) {
		return 'module.exports.' + name + ' = ' + name;
	}).join(';\n');

	// Uglified browser release artifacts
	config.uglify.browser.files[generatedBrowserOutput + "/web-giraffe.min.js" ] =  generatedBrowserOutput+ "/web-giraffe.js";
	config.uglify.browser.files[generatedBrowserOutput + "/web-giraffe-supervisor.min.js" ] =  generatedBrowserOutput+ "/web-giraffe-supervisor.js";
	config.uglify.browser.files[generatedBrowserOutput + "/web-giraffe-worker.min.js" ] =  generatedBrowserOutput+ "/web-giraffe-worker.js";
	grunt.initConfig( config );

	grunt.loadNpmTasks("grunt-contrib-concat");
	grunt.loadNpmTasks("grunt-contrib-uglify");
	grunt.loadNpmTasks("grunt-contrib-watch");
	grunt.loadNpmTasks("grunt-karma");
	grunt.loadNpmTasks("grunt-mocha-test");

	grunt.registerTask( "build-examples", [ "concat:example-client", "concat:example-supervisor", "concat:example-worker", "concat:example-libs" ]);
	grunt.registerTask( "build-browser-artifacts", ["concat:browser-client", "concat:browser-supervisor", "concat:browser-worker", "concat:test-worker", "uglify"] );
	grunt.registerTask( "test", ["karma:frontend", "mochaTest:isomorphicTest"] );
	grunt.registerTask("default", ["build-browser-artifacts"]);
}
