module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.spec.ts'],
  collectCoverageFrom: ['src/**/*.ts', 'cli/**/*.ts', '!src/index.ts', '!cli/maintsight-cli.ts'],
  coverageDirectory: './coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  moduleNameMapper: {
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@services$': '<rootDir>/src/services',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@interfaces$': '<rootDir>/src/interfaces',
    '^@interfaces/(.*)$': '<rootDir>/src/interfaces/$1',
    '^@cli/(.*)$': '<rootDir>/cli/$1',
    '^@models/(.*)$': '<rootDir>/src/models/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          esModuleInterop: true,
        },
      },
    ],
  },
};
