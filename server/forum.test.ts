import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";

// Mock the database module
vi.mock("./db", () => ({
  getUserById: vi.fn(),
  getThreadById: vi.fn(),
  getPostById: vi.fn(),
  getAllCategories: vi.fn(),
  getCategoryBySlug: vi.fn(),
  createThread: vi.fn(),
  updateThread: vi.fn(),
  deleteThread: vi.fn(),
  createPost: vi.fn(),
  updatePost: vi.fn(),
  deletePost: vi.fn(),
  subscribeToThread: vi.fn(),
  unsubscribeFromThread: vi.fn(),
  isUserSubscribedToThread: vi.fn(),
  getThreadSubscribers: vi.fn(),
  getCategorySubscribers: vi.fn(),
  createNotification: vi.fn(),
  getTagBySlug: vi.fn(),
  createTag: vi.fn(),
  addTagToThread: vi.fn(),
  getThreadsWithStats: vi.fn(),
  getPostsByThread: vi.fn(),
  getThreadsByAuthor: vi.fn(),
  getPostCountByAuthor: vi.fn(),
  searchThreads: vi.fn(),
  exportThreadsData: vi.fn(),
  exportPostsData: vi.fn(),
  exportUsersData: vi.fn(),
}));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(role: "user" | "admin" = "user"): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
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

function createPublicContext(): TrpcContext {
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

describe("Forum API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("categories.list", () => {
    it("returns list of categories for public users", async () => {
      const mockCategories = [
        { id: 1, name: "General Discussion", slug: "general", description: "General topics", color: "#FF6B6B" },
        { id: 2, name: "Recipes", slug: "recipes", description: "Share recipes", color: "#4ECDC4" },
      ];
      vi.mocked(db.getAllCategories).mockResolvedValue(mockCategories);

      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.categories.list();

      expect(result).toEqual(mockCategories);
      expect(db.getAllCategories).toHaveBeenCalled();
    });
  });

  describe("threads.create", () => {
    it("creates a thread for authenticated users", async () => {
      const mockThreadId = 123;
      vi.mocked(db.createThread).mockResolvedValue(mockThreadId);
      vi.mocked(db.subscribeToThread).mockResolvedValue(undefined);
      vi.mocked(db.getCategorySubscribers).mockResolvedValue([]);

      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.threads.create({
        title: "Test Thread",
        content: "This is a test thread content",
        categoryId: 1,
      });

      expect(result.id).toBe(mockThreadId);
      expect(db.createThread).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Test Thread",
          content: "This is a test thread content",
          categoryId: 1,
          authorId: 1,
        })
      );
      expect(db.subscribeToThread).toHaveBeenCalledWith(1, mockThreadId);
    });

    it("creates thread with tags", async () => {
      const mockThreadId = 124;
      vi.mocked(db.createThread).mockResolvedValue(mockThreadId);
      vi.mocked(db.subscribeToThread).mockResolvedValue(undefined);
      vi.mocked(db.getCategorySubscribers).mockResolvedValue([]);
      vi.mocked(db.getTagBySlug).mockResolvedValue(null);
      vi.mocked(db.createTag).mockResolvedValue(1);
      vi.mocked(db.addTagToThread).mockResolvedValue(undefined);

      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.threads.create({
        title: "Tagged Thread",
        content: "Thread with tags",
        categoryId: 1,
        tags: ["glazed", "chocolate"],
      });

      expect(result.id).toBe(mockThreadId);
      expect(db.createTag).toHaveBeenCalledTimes(2);
      expect(db.addTagToThread).toHaveBeenCalledTimes(2);
    });
  });

  describe("threads.update", () => {
    it("allows author to update their thread", async () => {
      const mockThread = {
        id: 1,
        title: "Original Title",
        content: "Original content",
        authorId: 1,
        categoryId: 1,
        slug: "original-title",
        isPinned: false,
        isLocked: false,
        viewCount: 0,
        replyCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.mocked(db.getThreadById).mockResolvedValue(mockThread);
      vi.mocked(db.updateThread).mockResolvedValue(undefined);
      vi.mocked(db.getThreadSubscribers).mockResolvedValue([]);

      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.threads.update({
        id: 1,
        title: "Updated Title",
      });

      expect(result.success).toBe(true);
      expect(db.updateThread).toHaveBeenCalledWith(1, { title: "Updated Title" });
    });

    it("rejects update from non-author non-admin", async () => {
      const mockThread = {
        id: 1,
        title: "Original Title",
        content: "Original content",
        authorId: 999, // Different author
        categoryId: 1,
        slug: "original-title",
        isPinned: false,
        isLocked: false,
        viewCount: 0,
        replyCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.mocked(db.getThreadById).mockResolvedValue(mockThread);

      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.threads.update({ id: 1, title: "Hacked Title" })
      ).rejects.toThrow();
    });
  });

  describe("posts.create", () => {
    it("creates a post and notifies subscribers", async () => {
      const mockThread = {
        id: 1,
        title: "Test Thread",
        content: "Content",
        authorId: 2,
        categoryId: 1,
        slug: "test-thread",
        isPinned: false,
        isLocked: false,
        viewCount: 0,
        replyCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const mockSubscribers = [
        { id: 2, emailOnReply: true },
        { id: 3, emailOnReply: false },
      ];
      vi.mocked(db.getThreadById).mockResolvedValue(mockThread);
      vi.mocked(db.createPost).mockResolvedValue(100);
      vi.mocked(db.isUserSubscribedToThread).mockResolvedValue(false);
      vi.mocked(db.subscribeToThread).mockResolvedValue(undefined);
      vi.mocked(db.getThreadSubscribers).mockResolvedValue(mockSubscribers);
      vi.mocked(db.createNotification).mockResolvedValue(1);

      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.posts.create({
        threadId: 1,
        content: "This is a reply",
      });

      expect(result.id).toBe(100);
      expect(db.createPost).toHaveBeenCalledWith(
        expect.objectContaining({
          threadId: 1,
          content: "This is a reply",
          authorId: 1,
        })
      );
      // Should notify subscriber with emailOnReply=true
      expect(db.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 2,
          type: "reply",
        })
      );
    });

    it("rejects posts on locked threads for non-admins", async () => {
      const mockThread = {
        id: 1,
        title: "Locked Thread",
        content: "Content",
        authorId: 2,
        categoryId: 1,
        slug: "locked-thread",
        isPinned: false,
        isLocked: true, // Thread is locked
        viewCount: 0,
        replyCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.mocked(db.getThreadById).mockResolvedValue(mockThread);

      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.posts.create({ threadId: 1, content: "Trying to post" })
      ).rejects.toThrow("Thread is locked");
    });
  });

  describe("threads.togglePin (admin)", () => {
    it("allows admin to pin/unpin threads", async () => {
      const mockThread = {
        id: 1,
        title: "Thread",
        content: "Content",
        authorId: 2,
        categoryId: 1,
        slug: "thread",
        isPinned: false,
        isLocked: false,
        viewCount: 0,
        replyCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.mocked(db.getThreadById).mockResolvedValue(mockThread);
      vi.mocked(db.updateThread).mockResolvedValue(undefined);

      const ctx = createAuthContext("admin");
      const caller = appRouter.createCaller(ctx);
      const result = await caller.threads.togglePin({ id: 1 });

      expect(result.success).toBe(true);
      expect(result.isPinned).toBe(true);
      expect(db.updateThread).toHaveBeenCalledWith(1, { isPinned: true });
    });
  });

  describe("threads.search", () => {
    it("searches threads by query", async () => {
      const mockResults = [
        { id: 1, title: "Glazed Donut Recipe", content: "Best glazed donuts", authorId: 1, categoryId: 1 },
      ];
      vi.mocked(db.searchThreads).mockResolvedValue(mockResults);

      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.threads.search({ query: "glazed", limit: 10 });

      expect(result).toEqual(mockResults);
      expect(db.searchThreads).toHaveBeenCalledWith("glazed", 10, 0);
    });
  });

  describe("export.threads (admin)", () => {
    it("exports threads as JSON", async () => {
      const mockData = [
        { id: 1, title: "Thread 1", content: "Content 1", createdAt: new Date() },
      ];
      vi.mocked(db.exportThreadsData).mockResolvedValue(mockData);

      const ctx = createAuthContext("admin");
      const caller = appRouter.createCaller(ctx);
      const result = await caller.export.threads({ format: "json" });

      expect(result.format).toBe("json");
      expect(JSON.parse(result.data)).toEqual(expect.arrayContaining([
        expect.objectContaining({ id: 1, title: "Thread 1" }),
      ]));
    });

    it("exports threads as CSV", async () => {
      const mockData = [
        {
          id: 1,
          title: "Thread 1",
          slug: "thread-1",
          content: "Content 1",
          categoryId: 1,
          authorId: 1,
          isPinned: false,
          isLocked: false,
          viewCount: 10,
          replyCount: 5,
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-02"),
        },
      ];
      vi.mocked(db.exportThreadsData).mockResolvedValue(mockData);

      const ctx = createAuthContext("admin");
      const caller = appRouter.createCaller(ctx);
      const result = await caller.export.threads({ format: "csv" });

      expect(result.format).toBe("csv");
      expect(result.data).toContain("id,title,slug");
      expect(result.data).toContain("Thread 1");
    });
  });
});
