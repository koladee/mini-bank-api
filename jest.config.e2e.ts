import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/test/e2e/**/*.spec.ts'],
  setupFilesAfterEnv: ['<rootDir>/test/e2e/setup.ts'],
  verbose: true,
  forceExit: true,
  detectOpenHandles: true,
};

export default config;
