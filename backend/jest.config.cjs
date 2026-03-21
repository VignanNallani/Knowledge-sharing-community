module.exports = {
  testEnvironment: 'node',
  roots: ["<rootDir>/test"],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  transform: {},
  testPathIgnorePatterns: [
    "/node_modules/",
    "/dist/",
    "/build/",
    "/scripts/",
    "/coverage/"
  ]
};