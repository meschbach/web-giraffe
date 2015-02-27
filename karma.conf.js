// Karma configuration
// Generated on Wed Feb 11 2015 22:04:26 GMT-0800 (PST)

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
      'browser/**/*.js',
			'tests/browser-unit/**/*.js',
			'tests/isomorphic-browser-adapter.js',
			'tests/isomorphic-unit/**/*.js'
    ],


    // list of files to exclude
    exclude: [
			'browser/test-worker.js'
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
    port: 9876,


    // enable / disable colors in the output (reporters and logs)
    colors: true,


    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,


    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: true,


    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    browsers: ['Chrome'],


    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: false
  };

  if (process.platform == 'darwin') {
    cfg.browsers.push('Safari');
  }

  config.set( cfg );
};
