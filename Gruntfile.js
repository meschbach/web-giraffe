module.exports = function( grunt ){
	var generatedOutput = process.env["DIST"] || "target/browser/";
	var config = {
		pkg: grunt.file.readJSON( "package.json" ),
		concat: {
			"browser-client" : {
				src: [
					'browser/command-dispatcher.js',
					'browser/base36-namer.js',
					'browser/promise-protocol.js',
					'browser/supervisor-protocol.js',
					'browser/worker-factory-protocol.js',
					'browser/client.js'
				],
				dest: generatedOutput + "web-giraffe.js"
			},
			"browser-supervisor" : {
				src: [
					'browser/base36-namer.js',
					'browser/command-dispatcher.js',
					'browser/promise-protocol.js',
					'browser/supervisor-protocol.js',
					'browser/work-protocol.js',
					'browser/worker-factory-protocol.js',
					'browser/supervisor.js'
				],
				dest: generatedOutput + "web-giraffe-supervisor.js",
				options: {
					footer: ";giraffe_supervisor();"
				}
			},
			"browser-worker" : {
				src: [
					'browser/base36-namer.js',
					'browser/command-dispatcher.js',
					'browser/promise-protocol.js',
					'browser/work-protocol.js',
					'browser/worker.js'
				],
				dest: generatedOutput + "web-giraffe-worker.js"
			}
		},
		karma: {
			frontend: {
				configFile: 'karma.conf.js',
				singleRun: true,
				background: false 
			}
		},
		watch: {
			browser: {
				files: ['browser/**/*.js'],
				tasks: ["build-browser-artifacts"]
			}
		}
	};
	grunt.initConfig( config );

	grunt.loadNpmTasks("grunt-contrib-concat");
	//grunt.loadNpmTasks("grunt-karma");
	grunt.loadNpmTasks("grunt-contrib-watch");

	grunt.registerTask( "build-browser-artifacts", ["concat:browser-client", "concat:browser-supervisor", "concat:browser-worker"] );
	grunt.registerTask("default", ["build-browser-artifacts"]);
}
