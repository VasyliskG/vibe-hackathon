module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/index.js',
    '!src/examples/**',
    '!**/node_modules/**'
  ],
  testMatch: [
    '**/test/**/*.test.js'
  ],
  verbose: true,
  testTimeout: 10000
};

