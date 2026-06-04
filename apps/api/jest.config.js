/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // Only run TypeScript specs from src — never the compiled copies in dist.
  roots: ['<rootDir>/src'],
};
