// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Importar Jest DOM matchers
import "@testing-library/jest-dom";

// Polyfills para Node.js
if (typeof TextEncoder === 'undefined') {
    global.TextEncoder = require('util').TextEncoder;
}
if (typeof TextDecoder === 'undefined') {
    global.TextDecoder = require('util').TextDecoder;
}

// Mock de variables de entorno
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
process.env.JWT_SECRET = "test-secret-key-for-testing-only";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-for-testing";
process.env.NODE_ENV = "test";

// Mock Next.js router
jest.mock('next/navigation', () => ({
    useRouter: () => ({
        push: jest.fn(),
        replace: jest.fn(),
        prefetch: jest.fn(),
        back: jest.fn(),
        pathname: '/',
        query: {},
        asPath: '/',
    }),
    usePathname: () => '/',
    useSearchParams: () => new URLSearchParams(),
}))

// Mock Winston logger to avoid file system operations in tests
jest.mock('./lib/logger', () => {
    const mockLogger = {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        http: jest.fn(),
        debug: jest.fn(),
        child: jest.fn(() => mockLogger),
        logRequest: jest.fn(),
        logResponse: jest.fn(),
        logError: jest.fn(),
        logDatabase: jest.fn(),
        logAuth: jest.fn(),
        logBusinessEvent: jest.fn(),
    }

    return {
        __esModule: true,
        default: mockLogger,
        apiLogger: mockLogger,
        dbLogger: mockLogger,
        authLogger: mockLogger,
        businessLogger: mockLogger,
        appLogger: mockLogger,
        startTimer: jest.fn(() => ({
            end: jest.fn(() => 0),
            endDb: jest.fn(() => 0),
        })),
        withLogging: jest.fn((operation, fn) => fn()),
    }
})

// Suppress console errors/warnings in tests unless VERBOSE=true
if (!process.env.VERBOSE) {
    global.console = {
        ...console,
        error: jest.fn(),
        warn: jest.fn(),
    }
}
