module.exports = function(config) {
  config.set({
    frameworks: ['jasmine'],
    files: [
      'dist-test/bundle.test.js'
    ],
    reporters: ['progress'],
    browsers: ['Chrome'],
    singleRun: true
  });
};