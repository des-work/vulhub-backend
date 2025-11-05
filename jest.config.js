module.exports = {
  displayName: 'VulHub Leaderboard API Tests',
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '../../',
  testMatch: [
    '<rootDir>/src/**/*.spec.ts',
    '<rootDir>/src/**/*.test.ts',
    '<rootDir>/src/**/*.e2e-spec.ts',
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.test.ts',
    '!src/**/*.e2e-spec.ts',
    '!src/main.ts',
    '!src/app.module.ts',
    '!src/**/*.config.ts',
    '!src/**/*.dto.ts',
    '!src/**/*.entity.ts',
    '!src/**/*.interface.ts',
    '!src/**/*.enum.ts',
    '!src/**/*.module.ts',
    '!src/**/*.d.ts',
    '!src/common/testing/**',
    '!src/config/**',
    '!src/**/*.spec.ts',
    '!src/**/*.test.ts',
    '!src/**/*.e2e-spec.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    // Module-specific thresholds
    'src/modules/auth/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    'src/modules/users/': {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75,
    },
    'src/common/': {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/src/common/testing/test-setup.ts'],
  moduleNameMapping: {
    '^@vulhub/(.*)$': '<rootDir>/packages/$1/src',
  },
  testTimeout: 30000,
  maxWorkers: process.env.CI ? 2 : 4, // Reduce workers in CI
  globalSetup: '<rootDir>/src/common/testing/global-setup.ts',
  globalTeardown: '<rootDir>/src/common/testing/global-teardown.ts',

  // Test categorization
  testNamePattern: process.env.TEST_PATTERN || '.*',

  // Reporters
  reporters: [
    'default',
    ...(process.env.CI ? [['jest-junit', { outputDirectory: 'reports', outputName: 'junit.xml' }]] : []),
  ],

  // Test environment options
  testEnvironmentOptions: {
    // Custom test environment options
  },

  // Transform
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.json',
      isolatedModules: true,
    }],
  },

  // Module directories
  moduleDirectories: ['node_modules', 'src'],

  // Test path ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
    '/reports/',
  ],

  // Coverage path ignore patterns
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
    '/reports/',
    '/src/main.ts',
    '/src/**/*.spec.ts',
    '/src/**/*.test.ts',
    '/src/**/*.e2e-spec.ts',
    '/src/**/*.config.ts',
    '/src/**/*.dto.ts',
    '/src/**/*.entity.ts',
    '/src/**/*.interface.ts',
    '/src/**/*.enum.ts',
    '/src/**/*.module.ts',
    '/src/**/*.d.ts',
  ],

  // Slow test detection
  slowTestThreshold: 5000, // 5 seconds

  // Force exit to prevent hanging
  forceExit: true,
  detectOpenHandles: true,

  // Custom test results processor
  testResultsProcessor: process.env.CI ? 'jest-junit' : undefined,
};