import { describe, expect, it } from "vitest";
import {
  checkPermission,
  getEffectiveRole,
  canModerate,
  isAdmin,
  getPermissionSummary,
  rolePermissions,
} from "./permissions";

describe("Permission System", () => {
  describe("getEffectiveRole", () => {
    it("returns null for undefined or null role", () => {
      expect(getEffectiveRole(null)).toBeNull();
      expect(getEffectiveRole(undefined)).toBeNull();
    });

    it("maps valid roles correctly", () => {
      expect(getEffectiveRole("user")).toBe("user");
      expect(getEffectiveRole("moderator")).toBe("moderator");
      expect(getEffectiveRole("admin")).toBe("admin");
    });

    it("defaults unknown roles to user", () => {
      expect(getEffectiveRole("unknown")).toBe("user");
    });
  });

  describe("canModerate", () => {
    it("returns false for null role", () => {
      expect(canModerate(null)).toBe(false);
    });

    it("returns false for user role", () => {
      expect(canModerate("user")).toBe(false);
    });

    it("returns true for moderator role", () => {
      expect(canModerate("moderator")).toBe(true);
    });

    it("returns true for admin role", () => {
      expect(canModerate("admin")).toBe(true);
    });
  });

  describe("isAdmin", () => {
    it("returns false for null role", () => {
      expect(isAdmin(null)).toBe(false);
    });

    it("returns false for user role", () => {
      expect(isAdmin("user")).toBe(false);
    });

    it("returns false for moderator role", () => {
      expect(isAdmin("moderator")).toBe(false);
    });

    it("returns true for admin role", () => {
      expect(isAdmin("admin")).toBe(true);
    });
  });

  describe("checkPermission - Guest (null role)", () => {
    it("allows reading public content", () => {
      expect(checkPermission(null, "threads", "read").allowed).toBe(true);
      expect(checkPermission(null, "posts", "read").allowed).toBe(true);
      expect(checkPermission(null, "events", "read").allowed).toBe(true);
    });

    it("denies creating content", () => {
      expect(checkPermission(null, "threads", "create").allowed).toBe(false);
      expect(checkPermission(null, "posts", "create").allowed).toBe(false);
    });

    it("denies updating content", () => {
      expect(checkPermission(null, "threads", "update").allowed).toBe(false);
    });

    it("denies deleting content", () => {
      expect(checkPermission(null, "threads", "delete").allowed).toBe(false);
    });

    it("denies export for guests", () => {
      expect(checkPermission(null, "threads", "export").allowed).toBe(false);
    });
  });

  describe("checkPermission - User role", () => {
    it("allows creating own threads", () => {
      const result = checkPermission("user", "threads", "create", true);
      expect(result.allowed).toBe(true);
    });

    it("allows reading threads", () => {
      expect(checkPermission("user", "threads", "read").allowed).toBe(true);
    });

    it("allows updating own threads", () => {
      expect(checkPermission("user", "threads", "update", true).allowed).toBe(true);
    });

    it("denies updating others threads", () => {
      expect(checkPermission("user", "threads", "update", false).allowed).toBe(false);
    });

    it("allows deleting own threads", () => {
      expect(checkPermission("user", "threads", "delete", true).allowed).toBe(true);
    });

    it("denies deleting others threads", () => {
      expect(checkPermission("user", "threads", "delete", false).allowed).toBe(false);
    });

    it("denies importing threads", () => {
      expect(checkPermission("user", "threads", "import").allowed).toBe(false);
    });

    it("allows exporting threads (read access)", () => {
      expect(checkPermission("user", "threads", "export").allowed).toBe(true);
    });

    it("denies creating categories", () => {
      expect(checkPermission("user", "categories", "create").allowed).toBe(false);
    });

    it("allows creating reports", () => {
      expect(checkPermission("user", "reports", "create", true).allowed).toBe(true);
    });
  });

  describe("checkPermission - Moderator role", () => {
    it("has full access to threads", () => {
      expect(checkPermission("moderator", "threads", "create").allowed).toBe(true);
      expect(checkPermission("moderator", "threads", "read").allowed).toBe(true);
      expect(checkPermission("moderator", "threads", "update").allowed).toBe(true);
      expect(checkPermission("moderator", "threads", "delete").allowed).toBe(true);
      expect(checkPermission("moderator", "threads", "import").allowed).toBe(true);
      expect(checkPermission("moderator", "threads", "export").allowed).toBe(true);
    });

    it("has full access to posts", () => {
      expect(checkPermission("moderator", "posts", "create").allowed).toBe(true);
      expect(checkPermission("moderator", "posts", "update").allowed).toBe(true);
      expect(checkPermission("moderator", "posts", "delete").allowed).toBe(true);
    });

    it("has full access to reports", () => {
      expect(checkPermission("moderator", "reports", "read").allowed).toBe(true);
      expect(checkPermission("moderator", "reports", "update").allowed).toBe(true);
    });

    it("cannot create categories", () => {
      expect(checkPermission("moderator", "categories", "create").allowed).toBe(false);
    });

    it("cannot delete users", () => {
      expect(checkPermission("moderator", "users", "delete").allowed).toBe(false);
    });
  });

  describe("checkPermission - Admin role", () => {
    it("has full access to all content types", () => {
      const contentTypes = [
        "threads", "posts", "categories", "events", "articles",
        "discounts", "links", "jobs", "listings", "advertisements",
        "users", "reports", "notifications"
      ] as const;

      const operations = ["create", "read", "update", "delete", "import", "export"] as const;

      for (const contentType of contentTypes) {
        for (const operation of operations) {
          expect(checkPermission("admin", contentType, operation).allowed).toBe(true);
        }
      }
    });
  });

  describe("getPermissionSummary", () => {
    it("returns permission summary for user role", () => {
      const summary = getPermissionSummary("user");
      expect(summary.threads).toBeDefined();
      expect(Array.isArray(summary.threads)).toBe(true);
    });

    it("returns permission summary for moderator role", () => {
      const summary = getPermissionSummary("moderator");
      expect(summary.threads).toBeDefined();
      expect(summary.threads.length).toBeGreaterThan(0);
    });

    it("returns permission summary for admin role", () => {
      const summary = getPermissionSummary("admin");
      expect(summary.threads).toBeDefined();
      // Admin should have all 6 CRUDIE operations
      expect(summary.threads.length).toBe(6);
    });
  });

  describe("rolePermissions structure", () => {
    it("has all three roles defined", () => {
      expect(rolePermissions.user).toBeDefined();
      expect(rolePermissions.moderator).toBeDefined();
      expect(rolePermissions.admin).toBeDefined();
    });

    it("has all content types for each role", () => {
      const expectedContentTypes = [
        "threads", "posts", "categories", "events", "articles",
        "discounts", "links", "jobs", "listings", "advertisements",
        "users", "reports", "notifications"
      ];

      for (const role of ["user", "moderator", "admin"] as const) {
        for (const contentType of expectedContentTypes) {
          expect(rolePermissions[role][contentType as keyof typeof rolePermissions.user]).toBeDefined();
        }
      }
    });

    it("has all operations for each content type", () => {
      const operations = ["create", "read", "update", "delete", "import", "export"];

      for (const operation of operations) {
        expect(rolePermissions.admin.threads[operation as keyof typeof rolePermissions.admin.threads]).toBeDefined();
      }
    });
  });
});
