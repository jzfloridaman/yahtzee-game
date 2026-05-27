/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  testEnvironment: "node",
  transform: {
    "^.+\.tsx?$": ["ts-jest",{}],
  },
  // Playwright e2e specs live in tests/e2e and run via `npm run e2e`.
  testPathIgnorePatterns: ["/node_modules/", "/tests/e2e/"],
};