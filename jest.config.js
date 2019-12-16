module.exports = {
  verbose: true,
  'reporters': [
    'default',
    ['jest-junit', { outputDirectory: 'tmp', outputName: 'junit.xml' }]
  ],
};
