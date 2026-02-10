import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock bcrypt
vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("$2a$12$hashedpassword"),
    compare: vi.fn().mockImplementation((password, hash) => {
      return Promise.resolve(password === "testpassword123");
    }),
  },
}));

// Mock db functions
vi.mock("./db", () => ({
  getUserByUsername: vi.fn(),
  createLocalUser: vi.fn(),
  updateUserProfile: vi.fn(),
}));

import * as db from "./db";

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
      cookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("auth.register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("successfully registers a new user with required fields only", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    
    vi.mocked(db.getUserByUsername).mockResolvedValue(undefined);
    vi.mocked(db.createLocalUser).mockResolvedValue(1);
    
    const result = await caller.auth.register({
      username: "testuser",
      password: "testpassword123",
    });
    
    expect(result).toEqual({ success: true, userId: 1 });
    expect(db.getUserByUsername).toHaveBeenCalledWith("testuser");
    expect(db.createLocalUser).toHaveBeenCalledWith(expect.objectContaining({
      username: "testuser",
      passwordHash: "$2a$12$hashedpassword",
    }));
  });

  it("successfully registers a user with all optional fields", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    
    vi.mocked(db.getUserByUsername).mockResolvedValue(undefined);
    vi.mocked(db.createLocalUser).mockResolvedValue(2);
    
    const result = await caller.auth.register({
      username: "shopowner",
      password: "securepass123",
      firstName: "John",
      lastName: "Doe",
      phone: "555-123-4567",
      address: "123 Main St",
      city: "New York",
      state: "New York",
      zipCode: "10001",
      email: "john@example.com",
      donutShopName: "Golden Donut",
      yearsInBusiness: 5,
      numberOfStores: 3,
      grossMonthlyIncome: 50000,
    });
    
    expect(result).toEqual({ success: true, userId: 2 });
    expect(db.createLocalUser).toHaveBeenCalledWith(expect.objectContaining({
      username: "shopowner",
      firstName: "John",
      lastName: "Doe",
      phone: "555-123-4567",
      address: "123 Main St",
      city: "New York",
      state: "New York",
      zipCode: "10001",
      email: "john@example.com",
      donutShopName: "Golden Donut",
      yearsInBusiness: 5,
      numberOfStores: 3,
      grossMonthlyIncome: "50000",
    }));
  });

  it("rejects registration when username already exists", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    
    vi.mocked(db.getUserByUsername).mockResolvedValue({
      id: 1,
      openId: "existing",
      username: "testuser",
      name: "Existing User",
    } as any);
    
    await expect(caller.auth.register({
      username: "testuser",
      password: "testpassword123",
    })).rejects.toThrow("Username already taken");
  });

  it("rejects registration with invalid username format", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    
    await expect(caller.auth.register({
      username: "test user!", // Contains space and special char
      password: "testpassword123",
    })).rejects.toThrow();
  });

  it("rejects registration with short password", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    
    await expect(caller.auth.register({
      username: "testuser",
      password: "short", // Less than 8 chars
    })).rejects.toThrow();
  });

  it("rejects registration with invalid email format", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    
    await expect(caller.auth.register({
      username: "testuser",
      password: "testpassword123",
      email: "not-an-email",
    })).rejects.toThrow();
  });
});

describe("auth.checkUsername", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns available true when username is not taken", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    
    vi.mocked(db.getUserByUsername).mockResolvedValue(undefined);
    
    const result = await caller.auth.checkUsername({ username: "newuser" });
    
    expect(result).toEqual({ available: true });
  });

  it("returns available false when username is taken", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    
    vi.mocked(db.getUserByUsername).mockResolvedValue({
      id: 1,
      openId: "existing",
      username: "existinguser",
    } as any);
    
    const result = await caller.auth.checkUsername({ username: "existinguser" });
    
    expect(result).toEqual({ available: false });
  });
});

describe("auth.login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects login with non-existent username", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    
    vi.mocked(db.getUserByUsername).mockResolvedValue(undefined);
    
    await expect(caller.auth.login({
      username: "nonexistent",
      password: "testpassword123",
    })).rejects.toThrow("Invalid username or password");
  });

  it("rejects login with incorrect password", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    
    vi.mocked(db.getUserByUsername).mockResolvedValue({
      id: 1,
      openId: "test-open-id",
      username: "testuser",
      passwordHash: "$2a$12$hashedpassword",
      role: "user",
      name: "Test User",
      email: "test@example.com",
    } as any);
    
    await expect(caller.auth.login({
      username: "testuser",
      password: "wrongpassword",
    })).rejects.toThrow("Invalid username or password");
  });

  it("successfully logs in with correct credentials", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    
    vi.mocked(db.getUserByUsername).mockResolvedValue({
      id: 1,
      openId: "test-open-id",
      username: "testuser",
      passwordHash: "$2a$12$hashedpassword",
      role: "user",
      name: "Test User",
      email: "test@example.com",
    } as any);
    
    const result = await caller.auth.login({
      username: "testuser",
      password: "testpassword123",
    });
    
    expect(result.success).toBe(true);
    expect(result.user).toEqual(expect.objectContaining({
      id: 1,
      username: "testuser",
      name: "Test User",
      email: "test@example.com",
      role: "user",
    }));
    expect(ctx.res.cookie).toHaveBeenCalled();
  });
});
