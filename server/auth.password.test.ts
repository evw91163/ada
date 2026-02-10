import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

// Mock bcrypt
vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn(async (plain: string, hash: string) => {
      // Simulate: "correctpassword" matches hash "hashed_correctpassword"
      return hash === `hashed_${plain}`;
    }),
    hash: vi.fn(async (plain: string) => `hashed_${plain}`),
  },
}));

// Mock db functions
vi.mock("./db", async (importOriginal) => {
  const original = await importOriginal() as Record<string, unknown>;
  return {
    ...original,
    getUserById: vi.fn(),
    getUserByEmail: vi.fn(),
    getUserByUsername: vi.fn(),
    updateUserPassword: vi.fn(),
    clearMustChangePassword: vi.fn(),
    createLocalUser: vi.fn(),
  };
});

// Import mocked db
import * as db from "./db";
const mockedDb = vi.mocked(db);

function createUserContext(overrides: Partial<AuthenticatedUser> = {}): TrpcContext {
  const user: AuthenticatedUser = {
    id: 42,
    openId: "test-user-open-id",
    email: "testuser@example.com",
    name: "Test User",
    loginMethod: "local",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createAdminContext(overrides: Partial<AuthenticatedUser> = {}): TrpcContext {
  return createUserContext({ role: "admin", ...overrides });
}

function createUnauthContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("auth.changePassword", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("changes password when current password is correct", async () => {
    mockedDb.getUserById.mockResolvedValue({
      id: 42,
      openId: "test-user-open-id",
      username: "testuser",
      passwordHash: "hashed_correctpassword",
      name: "Test User",
      email: "testuser@example.com",
      loginMethod: "local",
      role: "user",
      bio: null,
      avatarUrl: null,
      firstName: null,
      lastName: null,
      phone: null,
      address: null,
      city: null,
      state: null,
      zipCode: null,
      donutShopName: null,
      yearsInBusiness: null,
      numberOfStores: null,
      grossMonthlyIncome: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
      emailOnReply: true,
      emailOnThreadUpdate: true,
      emailOnNewThread: false,
      mustChangePassword: false,
    });
    mockedDb.updateUserPassword.mockResolvedValue(undefined);

    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.changePassword({
      currentPassword: "correctpassword",
      newPassword: "newpassword123",
    });

    expect(result).toEqual({ success: true });
    expect(mockedDb.updateUserPassword).toHaveBeenCalledWith(42, "hashed_newpassword123");
  });

  it("rejects when current password is incorrect", async () => {
    mockedDb.getUserById.mockResolvedValue({
      id: 42,
      openId: "test-user-open-id",
      username: "testuser",
      passwordHash: "hashed_correctpassword",
      name: "Test User",
      email: "testuser@example.com",
      loginMethod: "local",
      role: "user",
      bio: null,
      avatarUrl: null,
      firstName: null,
      lastName: null,
      phone: null,
      address: null,
      city: null,
      state: null,
      zipCode: null,
      donutShopName: null,
      yearsInBusiness: null,
      numberOfStores: null,
      grossMonthlyIncome: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
      emailOnReply: true,
      emailOnThreadUpdate: true,
      emailOnNewThread: false,
      mustChangePassword: false,
    });

    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.changePassword({
        currentPassword: "wrongpassword",
        newPassword: "newpassword123",
      })
    ).rejects.toThrow("Current password is incorrect");
  });

  it("rejects for OAuth users without password", async () => {
    mockedDb.getUserById.mockResolvedValue({
      id: 42,
      openId: "test-user-open-id",
      username: null,
      passwordHash: null,
      name: "Test User",
      email: "testuser@example.com",
      loginMethod: "manus",
      role: "user",
      bio: null,
      avatarUrl: null,
      firstName: null,
      lastName: null,
      phone: null,
      address: null,
      city: null,
      state: null,
      zipCode: null,
      donutShopName: null,
      yearsInBusiness: null,
      numberOfStores: null,
      grossMonthlyIncome: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
      emailOnReply: true,
      emailOnThreadUpdate: true,
      emailOnNewThread: false,
      mustChangePassword: false,
    });

    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.changePassword({
        currentPassword: "any",
        newPassword: "newpassword123",
      })
    ).rejects.toThrow("Cannot change password for OAuth users");
  });

  it("requires authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.changePassword({
        currentPassword: "any",
        newPassword: "newpassword123",
      })
    ).rejects.toThrow();
  });
});

describe("auth.forceChangePassword", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("changes password and clears mustChangePassword flag", async () => {
    mockedDb.getUserById.mockResolvedValue({
      id: 42,
      openId: "test-user-open-id",
      username: "testuser",
      passwordHash: "hashed_old",
      name: "Test User",
      email: "testuser@example.com",
      loginMethod: "local",
      role: "user",
      bio: null,
      avatarUrl: null,
      firstName: null,
      lastName: null,
      phone: null,
      address: null,
      city: null,
      state: null,
      zipCode: null,
      donutShopName: null,
      yearsInBusiness: null,
      numberOfStores: null,
      grossMonthlyIncome: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
      emailOnReply: true,
      emailOnThreadUpdate: true,
      emailOnNewThread: false,
      mustChangePassword: true,
    });
    mockedDb.updateUserPassword.mockResolvedValue(undefined);
    mockedDb.clearMustChangePassword.mockResolvedValue(undefined);

    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.forceChangePassword({
      newPassword: "newpassword123",
    });

    expect(result).toEqual({ success: true });
    expect(mockedDb.updateUserPassword).toHaveBeenCalledWith(42, "hashed_newpassword123");
    expect(mockedDb.clearMustChangePassword).toHaveBeenCalledWith(42);
  });

  it("rejects when user not found", async () => {
    mockedDb.getUserById.mockResolvedValue(undefined);

    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.forceChangePassword({
        newPassword: "newpassword123",
      })
    ).rejects.toThrow("User not found");
  });
});

describe("auth.mustChangePassword", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true when user must change password", async () => {
    mockedDb.getUserById.mockResolvedValue({
      id: 42,
      openId: "test-user-open-id",
      username: "testuser",
      passwordHash: "hashed_temp",
      name: "Test User",
      email: "testuser@example.com",
      loginMethod: "local",
      role: "user",
      bio: null,
      avatarUrl: null,
      firstName: null,
      lastName: null,
      phone: null,
      address: null,
      city: null,
      state: null,
      zipCode: null,
      donutShopName: null,
      yearsInBusiness: null,
      numberOfStores: null,
      grossMonthlyIncome: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
      emailOnReply: true,
      emailOnThreadUpdate: true,
      emailOnNewThread: false,
      mustChangePassword: true,
    });

    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.mustChangePassword();
    expect(result).toEqual({ mustChange: true });
  });

  it("returns false when user does not need to change password", async () => {
    mockedDb.getUserById.mockResolvedValue({
      id: 42,
      openId: "test-user-open-id",
      username: "testuser",
      passwordHash: "hashed_pass",
      name: "Test User",
      email: "testuser@example.com",
      loginMethod: "local",
      role: "user",
      bio: null,
      avatarUrl: null,
      firstName: null,
      lastName: null,
      phone: null,
      address: null,
      city: null,
      state: null,
      zipCode: null,
      donutShopName: null,
      yearsInBusiness: null,
      numberOfStores: null,
      grossMonthlyIncome: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
      emailOnReply: true,
      emailOnThreadUpdate: true,
      emailOnNewThread: false,
      mustChangePassword: false,
    });

    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.mustChangePassword();
    expect(result).toEqual({ mustChange: false });
  });
});

describe("auth.adminCreateUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a new user with admin role", async () => {
    mockedDb.getUserByEmail.mockResolvedValue(undefined);
    mockedDb.getUserByUsername.mockResolvedValue(undefined);
    mockedDb.createLocalUser.mockResolvedValue(100);

    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.adminCreateUser({
      email: "newadmin@example.com",
      password: "securepassword123",
      role: "admin",
      firstName: "New",
      lastName: "Admin",
    });

    expect(result.success).toBe(true);
    expect(result.userId).toBe(100);
    expect(result.username).toBe("newadmin");
    expect(mockedDb.createLocalUser).toHaveBeenCalledWith(
      expect.objectContaining({
        username: "newadmin",
        email: "newadmin@example.com",
        role: "admin",
        mustChangePassword: true,
      })
    );
  });

  it("rejects when email already exists", async () => {
    mockedDb.getUserByEmail.mockResolvedValue({
      id: 99,
      openId: "existing",
      username: "existing",
      passwordHash: "hashed",
      name: "Existing",
      email: "existing@example.com",
      loginMethod: "local",
      role: "user",
      bio: null,
      avatarUrl: null,
      firstName: null,
      lastName: null,
      phone: null,
      address: null,
      city: null,
      state: null,
      zipCode: null,
      donutShopName: null,
      yearsInBusiness: null,
      numberOfStores: null,
      grossMonthlyIncome: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
      emailOnReply: true,
      emailOnThreadUpdate: true,
      emailOnNewThread: false,
      mustChangePassword: false,
    });

    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.adminCreateUser({
        email: "existing@example.com",
        password: "securepassword123",
        role: "user",
      })
    ).rejects.toThrow("Email already registered");
  });

  it("rejects when called by non-admin user", async () => {
    const ctx = createUserContext({ role: "user" });
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.adminCreateUser({
        email: "new@example.com",
        password: "securepassword123",
        role: "user",
      })
    ).rejects.toThrow();
  });

  it("generates unique username when email prefix is taken", async () => {
    mockedDb.getUserByEmail.mockResolvedValue(undefined);
    // First call: username exists; second call: unique username
    mockedDb.getUserByUsername.mockResolvedValueOnce({
      id: 50,
      openId: "taken",
      username: "john",
      passwordHash: "hashed",
      name: "John",
      email: "john@other.com",
      loginMethod: "local",
      role: "user",
      bio: null,
      avatarUrl: null,
      firstName: null,
      lastName: null,
      phone: null,
      address: null,
      city: null,
      state: null,
      zipCode: null,
      donutShopName: null,
      yearsInBusiness: null,
      numberOfStores: null,
      grossMonthlyIncome: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
      emailOnReply: true,
      emailOnThreadUpdate: true,
      emailOnNewThread: false,
      mustChangePassword: false,
    });
    mockedDb.createLocalUser.mockResolvedValue(101);

    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.adminCreateUser({
      email: "john@example.com",
      password: "securepassword123",
      role: "user",
    });

    expect(result.success).toBe(true);
    // Username should have a random suffix appended
    expect(result.username).toMatch(/^john_/);
    expect(result.username.length).toBeGreaterThan(5);
  });
});
