const nextJest = require('next/jest')

const createJestConfig = nextJest({
    // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
    dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
    // Setup files to run before each test file
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

    // Test environment
    testEnvironment: 'jest-environment-jsdom',

    // Module name mapper for path aliases
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
    },

    // Coverage configuration
    collectCoverageFrom: [
        "lib/auth.ts",
        "lib/error-handler.ts",
        "lib/api-validation.ts",
        "lib/api-auth.ts",
        "lib/permissions.ts",
        "lib/api.ts",
        "lib/database.ts",
        "lib/validation-helpers.ts",
        "lib/utils.ts",
        "lib/analytics/efficiency-analyzer.ts",
        "!**/*.d.ts",
        "!**/node_modules/**",
        "!**/.next/**",
        "!**/coverage/**",
        "!**/jest.config.js",
    ],

    // Coverage thresholds
    coverageThreshold: {
        global: {
            branches: 50,
            functions: 60,
            lines: 60,
            statements: 50,
        },
        // Require high coverage for critical security files
        './lib/auth.ts': {
            branches: 80,
            functions: 100,
            lines: 100,
            statements: 100,
        },
        './lib/error-handler.ts': {
            branches: 65,
            functions: 80,
            lines: 80,
            statements: 75,
        },
        './lib/api-validation.ts': {
            branches: 0,
            functions: 11,
            lines: 4,
            statements: 5,
        },
        './lib/api-auth.ts': {
            branches: 80,
            functions: 100,
            lines: 90,
            statements: 90,
        },
        './lib/permissions.ts': {
            branches: 100,
            functions: 100,
            lines: 100,
            statements: 100,
        },
        './lib/api.ts': {
            branches: 50,
            functions: 90,
            lines: 85,
            statements: 85,
        },
        './lib/database.ts': {
            branches: 50,
            functions: 80,
            lines: 70,
            statements: 70,
        },
        './lib/validation-helpers.ts': {
            branches: 75,
            functions: 95,
            lines: 90,
            statements: 90,
        },
        './lib/utils.ts': {
            branches: 90,
            functions: 100,
            lines: 95,
            statements: 95,
        },
        './lib/analytics/efficiency-analyzer.ts': {
            branches: 50,
            functions: 80,
            lines: 75,
            statements: 75,
        },
    },    // Test match patterns
    testMatch: [
        '**/__tests__/**/*.[jt]s?(x)',
        '**/?(*.)+(spec|test).[jt]s?(x)',
    ],

    // Transform files with ts-jest
    transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
            tsconfig: {
                jsx: 'react',
            },
        }],
    },

    // Module file extensions
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

    // Ignore patterns
    testPathIgnorePatterns: [
        '<rootDir>/node_modules/',
        '<rootDir>/.next/',
    ],

    // Verbose output
    verbose: true,
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)
