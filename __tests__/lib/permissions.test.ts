/**
 * Tests para el módulo de permisos RBAC
 * Verifica la lógica de autorización y permisos por rol
 */

import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  ROLE_PERMISSIONS,
  ROLE_DESCRIPTIONS,
  PERMISSION_DESCRIPTIONS,
  type Permission,
} from "@/lib/permissions";
import type { JWTPayload } from "@/lib/auth";

describe("permissions.ts", () => {
  // Mock users para tests
  const adminUser: JWTPayload = {
    userId: 1,
    email: "admin@test.com",
    role: "admin",
  };

  const gerenteUser: JWTPayload = {
    userId: 2,
    email: "gerente@test.com",
    role: "gerente",
  };

  const operarioUser: JWTPayload = {
    userId: 3,
    email: "operario@test.com",
    role: "operario",
  };

  describe("ROLE_PERMISSIONS constant", () => {
    it("should have permissions for all three roles", () => {
      expect(ROLE_PERMISSIONS.admin).toBeDefined();
      expect(ROLE_PERMISSIONS.gerente).toBeDefined();
      expect(ROLE_PERMISSIONS.operario).toBeDefined();
    });

    it("should have admin with all permissions", () => {
      const adminPerms = ROLE_PERMISSIONS.admin;
      expect(adminPerms).toContain("read:all");
      expect(adminPerms).toContain("write:all");
      expect(adminPerms).toContain("delete:all");
      expect(adminPerms).toContain("manage:users");
      expect(adminPerms).toContain("manage:reports");
      expect(adminPerms).toContain("export:data");
      expect(adminPerms).toContain("manage:settings");
      expect(adminPerms.length).toBe(7);
    });

    it("should have gerente with limited permissions", () => {
      const gerentePerms = ROLE_PERMISSIONS.gerente;
      expect(gerentePerms).toContain("read:all");
      expect(gerentePerms).toContain("write:all");
      expect(gerentePerms).toContain("delete:all");
      expect(gerentePerms).toContain("manage:reports");
      expect(gerentePerms).toContain("export:data");
      expect(gerentePerms).not.toContain("manage:users");
      expect(gerentePerms).not.toContain("manage:settings");
      expect(gerentePerms.length).toBe(5);
    });

    it("should have operario with minimal permissions", () => {
      const operarioPerms = ROLE_PERMISSIONS.operario;
      expect(operarioPerms).toContain("read:all");
      expect(operarioPerms).toContain("write:own");
      expect(operarioPerms).not.toContain("write:all");
      expect(operarioPerms).not.toContain("delete:all");
      expect(operarioPerms).not.toContain("manage:users");
      expect(operarioPerms.length).toBe(2);
    });
  });

  describe("hasPermission()", () => {
    describe("Admin permissions", () => {
      it("should allow admin to read:all", () => {
        expect(hasPermission(adminUser, "read:all")).toBe(true);
      });

      it("should allow admin to write:all", () => {
        expect(hasPermission(adminUser, "write:all")).toBe(true);
      });

      it("should allow admin to delete:all", () => {
        expect(hasPermission(adminUser, "delete:all")).toBe(true);
      });

      it("should allow admin to manage:users", () => {
        expect(hasPermission(adminUser, "manage:users")).toBe(true);
      });

      it("should allow admin to manage:reports", () => {
        expect(hasPermission(adminUser, "manage:reports")).toBe(true);
      });

      it("should allow admin to export:data", () => {
        expect(hasPermission(adminUser, "export:data")).toBe(true);
      });

      it("should allow admin to manage:settings", () => {
        expect(hasPermission(adminUser, "manage:settings")).toBe(true);
      });
    });

    describe("Gerente permissions", () => {
      it("should allow gerente to read:all", () => {
        expect(hasPermission(gerenteUser, "read:all")).toBe(true);
      });

      it("should allow gerente to write:all", () => {
        expect(hasPermission(gerenteUser, "write:all")).toBe(true);
      });

      it("should allow gerente to delete:all", () => {
        expect(hasPermission(gerenteUser, "delete:all")).toBe(true);
      });

      it("should allow gerente to manage:reports", () => {
        expect(hasPermission(gerenteUser, "manage:reports")).toBe(true);
      });

      it("should allow gerente to export:data", () => {
        expect(hasPermission(gerenteUser, "export:data")).toBe(true);
      });

      it("should NOT allow gerente to manage:users", () => {
        expect(hasPermission(gerenteUser, "manage:users")).toBe(false);
      });

      it("should NOT allow gerente to manage:settings", () => {
        expect(hasPermission(gerenteUser, "manage:settings")).toBe(false);
      });
    });

    describe("Operario permissions", () => {
      it("should allow operario to read:all", () => {
        expect(hasPermission(operarioUser, "read:all")).toBe(true);
      });

      it("should allow operario to write:own", () => {
        expect(hasPermission(operarioUser, "write:own")).toBe(true);
      });

      it("should NOT allow operario to write:all", () => {
        expect(hasPermission(operarioUser, "write:all")).toBe(false);
      });

      it("should NOT allow operario to delete:all", () => {
        expect(hasPermission(operarioUser, "delete:all")).toBe(false);
      });

      it("should NOT allow operario to manage:users", () => {
        expect(hasPermission(operarioUser, "manage:users")).toBe(false);
      });

      it("should NOT allow operario to manage:reports", () => {
        expect(hasPermission(operarioUser, "manage:reports")).toBe(false);
      });

      it("should NOT allow operario to export:data", () => {
        expect(hasPermission(operarioUser, "export:data")).toBe(false);
      });

      it("should NOT allow operario to manage:settings", () => {
        expect(hasPermission(operarioUser, "manage:settings")).toBe(false);
      });
    });
  });

  describe("hasAnyPermission()", () => {
    it("should return true if admin has ANY of the specified permissions", () => {
      const result = hasAnyPermission(adminUser, ["read:all", "manage:users"]);
      expect(result).toBe(true);
    });

    it("should return true if admin has at least one permission", () => {
      const result = hasAnyPermission(adminUser, ["write:own", "manage:users"]);
      expect(result).toBe(true);
    });

    it("should return true if gerente has ANY of the specified permissions", () => {
      const result = hasAnyPermission(gerenteUser, [
        "write:all",
        "export:data",
      ]);
      expect(result).toBe(true);
    });

    it("should return false if gerente has NONE of the specified permissions", () => {
      const result = hasAnyPermission(gerenteUser, [
        "manage:users",
        "manage:settings",
      ]);
      expect(result).toBe(false);
    });

    it("should return true if operario has ANY of the specified permissions", () => {
      const result = hasAnyPermission(operarioUser, ["read:all", "write:all"]);
      expect(result).toBe(true);
    });

    it("should return false if operario has NONE of the specified permissions", () => {
      const result = hasAnyPermission(operarioUser, [
        "write:all",
        "delete:all",
        "manage:users",
      ]);
      expect(result).toBe(false);
    });

    it("should return false for empty permissions array", () => {
      const result = hasAnyPermission(adminUser, []);
      expect(result).toBe(false);
    });
  });

  describe("hasAllPermissions()", () => {
    it("should return true if admin has ALL specified permissions", () => {
      const result = hasAllPermissions(adminUser, [
        "read:all",
        "write:all",
        "delete:all",
      ]);
      expect(result).toBe(true);
    });

    it("should return false if admin is missing one permission", () => {
      const result = hasAllPermissions(adminUser, [
        "read:all",
        "write:own" as Permission,
      ]);
      expect(result).toBe(false);
    });

    it("should return true if gerente has ALL specified permissions", () => {
      const result = hasAllPermissions(gerenteUser, [
        "read:all",
        "write:all",
        "export:data",
      ]);
      expect(result).toBe(true);
    });

    it("should return false if gerente is missing one permission", () => {
      const result = hasAllPermissions(gerenteUser, [
        "read:all",
        "manage:users",
      ]);
      expect(result).toBe(false);
    });

    it("should return true if operario has ALL specified permissions", () => {
      const result = hasAllPermissions(operarioUser, ["read:all", "write:own"]);
      expect(result).toBe(true);
    });

    it("should return false if operario is missing one permission", () => {
      const result = hasAllPermissions(operarioUser, ["read:all", "write:all"]);
      expect(result).toBe(false);
    });

    it("should return true for empty permissions array", () => {
      const result = hasAllPermissions(adminUser, []);
      expect(result).toBe(true);
    });
  });

  describe("ROLE_DESCRIPTIONS constant", () => {
    it("should have descriptions for all roles", () => {
      expect(ROLE_DESCRIPTIONS.admin).toBeDefined();
      expect(ROLE_DESCRIPTIONS.gerente).toBeDefined();
      expect(ROLE_DESCRIPTIONS.operario).toBeDefined();
    });

    it("should have meaningful admin description", () => {
      expect(ROLE_DESCRIPTIONS.admin).toContain("Administrador");
      expect(ROLE_DESCRIPTIONS.admin.length).toBeGreaterThan(10);
    });

    it("should have meaningful gerente description", () => {
      expect(ROLE_DESCRIPTIONS.gerente).toContain("Gerente");
      expect(ROLE_DESCRIPTIONS.gerente.length).toBeGreaterThan(10);
    });

    it("should have meaningful operario description", () => {
      expect(ROLE_DESCRIPTIONS.operario).toContain("Operario");
      expect(ROLE_DESCRIPTIONS.operario.length).toBeGreaterThan(10);
    });
  });

  describe("PERMISSION_DESCRIPTIONS constant", () => {
    it("should have descriptions for all permissions", () => {
      expect(PERMISSION_DESCRIPTIONS["read:all"]).toBeDefined();
      expect(PERMISSION_DESCRIPTIONS["write:all"]).toBeDefined();
      expect(PERMISSION_DESCRIPTIONS["delete:all"]).toBeDefined();
      expect(PERMISSION_DESCRIPTIONS["read:own"]).toBeDefined();
      expect(PERMISSION_DESCRIPTIONS["write:own"]).toBeDefined();
      expect(PERMISSION_DESCRIPTIONS["manage:users"]).toBeDefined();
      expect(PERMISSION_DESCRIPTIONS["manage:reports"]).toBeDefined();
      expect(PERMISSION_DESCRIPTIONS["export:data"]).toBeDefined();
      expect(PERMISSION_DESCRIPTIONS["manage:settings"]).toBeDefined();
    });

    it("should have meaningful descriptions", () => {
      Object.values(PERMISSION_DESCRIPTIONS).forEach((desc) => {
        expect(desc.length).toBeGreaterThan(5);
        expect(typeof desc).toBe("string");
      });
    });
  });

  describe("Permission hierarchy tests", () => {
    it("should have admin with more permissions than gerente", () => {
      expect(ROLE_PERMISSIONS.admin.length).toBeGreaterThan(
        ROLE_PERMISSIONS.gerente.length
      );
    });

    it("should have gerente with more permissions than operario", () => {
      expect(ROLE_PERMISSIONS.gerente.length).toBeGreaterThan(
        ROLE_PERMISSIONS.operario.length
      );
    });

    it("should have all gerente permissions included in admin", () => {
      const gerentePerms = ROLE_PERMISSIONS.gerente;
      const adminPerms = ROLE_PERMISSIONS.admin;

      gerentePerms.forEach((perm) => {
        expect(adminPerms).toContain(perm);
      });
    });

    it("should have read:all available to all roles", () => {
      expect(ROLE_PERMISSIONS.admin).toContain("read:all");
      expect(ROLE_PERMISSIONS.gerente).toContain("read:all");
      expect(ROLE_PERMISSIONS.operario).toContain("read:all");
    });

    it("should have write:all only for admin and gerente", () => {
      expect(ROLE_PERMISSIONS.admin).toContain("write:all");
      expect(ROLE_PERMISSIONS.gerente).toContain("write:all");
      expect(ROLE_PERMISSIONS.operario).not.toContain("write:all");
    });

    it("should have manage:users only for admin", () => {
      expect(ROLE_PERMISSIONS.admin).toContain("manage:users");
      expect(ROLE_PERMISSIONS.gerente).not.toContain("manage:users");
      expect(ROLE_PERMISSIONS.operario).not.toContain("manage:users");
    });
  });
});
