var express = require("express" );
var staticFileProxy = express();
staticFileProxy.use( express.static( __dirname + "/target/browser" ) );
staticFileProxy.listen( 9878 );

module.exports = function(config) {
  var cfg = {

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '',


    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['mocha', 'chai', 'sinon-chai'],


    // list of files / patterns to load in the browser
    files: [
			'node_modules/chai-as-promised/lib/chai-as-promised.js', /* TODO: Need to figure out how to correctly integrate this */
			'target/browser/web-giraffe.js',
			'tests/browser-system/**/*.js'
    ],


    // list of files to exclude
    exclude: [
    ],


    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {
    },


    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ['progress', 'notify'],


    // web server port
    port: 9877,
		runnerPort: 9101,
		proxies: { '/' : "http://localhost:9878" },
		urlRoot: '/karma',


    // enable / disable colors in the output (reporters and logs)
    colors: true,


    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,


    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: true,


    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    browsers: ['Chrome', 'Firefox'],


    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: false
  };

  if (process.platform == 'darwin') {
    cfg.browsers.push('Safari');
  }

  config.set( cfg );
};
