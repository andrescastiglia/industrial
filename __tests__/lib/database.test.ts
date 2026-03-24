type LoadedDatabaseModule = {
  pool: {
    query: jest.Mock;
    connect: jest.Mock;
    end: jest.Mock;
    on: jest.Mock;
  };
  PoolMock: jest.Mock;
  poolConfig: {
    connectionString: string;
    ssl: false | { rejectUnauthorized: false };
  };
};

describe("database.ts", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env = { ...originalEnv } as NodeJS.ProcessEnv;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  function loadDatabaseModule(
    envOverrides: Partial<NodeJS.ProcessEnv> = {}
  ): LoadedDatabaseModule {
    process.env = {
      ...originalEnv,
      ...envOverrides,
    } as NodeJS.ProcessEnv;

    const mockPool = {
      query: jest.fn(),
      connect: jest.fn(),
      end: jest.fn(),
      on: jest.fn(),
    };
    const PoolMock = jest.fn(() => mockPool);

    jest.doMock("pg", () => ({
      Pool: PoolMock,
    }));

    let databaseModule: { pool: LoadedDatabaseModule["pool"] } | undefined;

    jest.isolateModules(() => {
      databaseModule = require("@/lib/database");
    });

    const [firstCall] = PoolMock.mock.calls as unknown as Array<
      [LoadedDatabaseModule["poolConfig"]]
    >;

    if (!firstCall) {
      throw new Error("Pool mock was not called");
    }

    const [poolConfig] = firstCall;

    return {
      pool: databaseModule!.pool,
      PoolMock,
      poolConfig,
    };
  }

  describe("pool configuration", () => {
    it("uses the default local connection string without SSL outside production", () => {
      const { pool, PoolMock, poolConfig } = loadDatabaseModule({
        NODE_ENV: "test",
        DATABASE_URL: undefined,
        DATABASE_SSL: undefined,
      });

      expect(pool).toBeDefined();
      expect(PoolMock).toHaveBeenCalledTimes(1);
      expect(poolConfig).toEqual({
        connectionString: "postgresql://user:password@localhost:5432/db",
        ssl: false,
      });
    });

    it("honors DATABASE_SSL=true explicitly", () => {
      const { poolConfig } = loadDatabaseModule({
        NODE_ENV: "test",
        DATABASE_URL: "postgresql://db.internal:5432/industrial",
        DATABASE_SSL: "true",
      });

      expect(poolConfig.ssl).toEqual({ rejectUnauthorized: false });
    });

    it("honors DATABASE_SSL=false even for production", () => {
      const { poolConfig } = loadDatabaseModule({
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://db.internal:5432/industrial",
        DATABASE_SSL: "false",
      });

      expect(poolConfig.ssl).toBe(false);
    });

    it("disables SSL for localhost database URLs in production", () => {
      const { poolConfig } = loadDatabaseModule({
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://127.0.0.1:5432/industrial",
      });

      expect(poolConfig.ssl).toBe(false);
    });

    it("enables SSL for remote database URLs in production", () => {
      const { poolConfig } = loadDatabaseModule({
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://db.example.com:5432/industrial",
      });

      expect(poolConfig.ssl).toEqual({ rejectUnauthorized: false });
    });

    it("falls back to SSL when the production DATABASE_URL cannot be parsed", () => {
      const { poolConfig } = loadDatabaseModule({
        NODE_ENV: "production",
        DATABASE_URL: "not-a-valid-url",
      });

      expect(poolConfig.ssl).toEqual({ rejectUnauthorized: false });
    });
  });

  describe("pool methods", () => {
    it("exposes the standard pg pool API", () => {
      const { pool } = loadDatabaseModule();

      expect(pool.query).toEqual(expect.any(Function));
      expect(pool.connect).toEqual(expect.any(Function));
      expect(pool.end).toEqual(expect.any(Function));
      expect(pool.on).toEqual(expect.any(Function));
    });
  });
});
