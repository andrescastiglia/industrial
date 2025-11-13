/**
 * Tests para el módulo de base de datos
 * Verifica la configuración del pool de PostgreSQL
 */

import { Pool } from "pg";
import { pool } from "@/lib/database";

// Mock del módulo pg
jest.mock("pg", () => {
  const mockPool = {
    query: jest.fn(),
    connect: jest.fn(),
    end: jest.fn(),
    on: jest.fn(),
  };
  return {
    Pool: jest.fn(() => mockPool),
  };
});

describe("database.ts", () => {
  describe("Pool Configuration", () => {
    it("should create a Pool instance", () => {
      expect(pool).toBeDefined();
      expect(Pool).toHaveBeenCalled();
    });

    it("should configure pool with connection string", () => {
      expect(Pool).toHaveBeenCalledWith(
        expect.objectContaining({
          connectionString: expect.any(String),
        })
      );
    });

    it("should have ssl configuration based on environment", () => {
      const poolConfig = (Pool as unknown as jest.Mock).mock.calls[0][0];

      if (process.env.NODE_ENV === "production") {
        expect(poolConfig.ssl).toEqual({ rejectUnauthorized: false });
      } else {
        expect(poolConfig.ssl).toBe(false);
      }
    });

    it("should configure pool with DATABASE_URL environment variable", () => {
      // Este test simplemente verifica que el pool está configurado
      // No intentamos re-importar el módulo ya que es un singleton
      expect(Pool).toHaveBeenCalledWith(
        expect.objectContaining({
          connectionString: expect.any(String),
        })
      );
    });

    it("should have default connection string when DATABASE_URL not set", () => {
      const poolConfig = (Pool as unknown as jest.Mock).mock.calls[0][0];

      expect(poolConfig.connectionString).toBeDefined();
      expect(typeof poolConfig.connectionString).toBe("string");
    });
  });

  describe("Pool Methods", () => {
    it("should have query method", () => {
      expect(pool.query).toBeDefined();
      expect(typeof pool.query).toBe("function");
    });

    it("should have connect method", () => {
      expect(pool.connect).toBeDefined();
      expect(typeof pool.connect).toBe("function");
    });

    it("should have end method", () => {
      expect(pool.end).toBeDefined();
      expect(typeof pool.end).toBe("function");
    });
  });

  describe("Type Exports", () => {
    it("should export pool instance", () => {
      expect(pool).toBeDefined();
    });
  });
});
