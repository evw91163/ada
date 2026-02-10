import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as db from "./db";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { ENV } from "./_core/env";

// Helper to generate slug from title
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 200) + '-' + Date.now().toString(36);
}

// Import permission middleware
import { 
  requirePermission, 
  hasPermission, 
  canModifyContent, 
  getUserPermissions,
  requireModerator,
  requireAdmin 
} from './permissionMiddleware';
import { ContentType, Operation, getPermissionSummary, rolePermissions } from './permissions';
import * as backupService from './backupService';
import { getSchedulerStatus, configureScheduler } from './scheduledBackup';

// Admin procedure middleware
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  }
  return next({ ctx });
});

// Moderator procedure middleware (moderators and admins)
const moderatorProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin' && ctx.user.role !== 'moderator') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Moderator access required' });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    
    // Local user registration
    register: publicProcedure
      .input(z.object({
        // Required fields
        username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
        password: z.string().min(8).max(100),
        // Optional personal fields
        firstName: z.string().max(100).optional(),
        lastName: z.string().max(100).optional(),
        phone: z.string().max(20).optional(),
        address: z.string().max(500).optional(),
        city: z.string().max(100).optional(),
        state: z.string().max(50).optional(),
        zipCode: z.string().max(20).optional(),
        email: z.string().email().max(320).optional(),
        // Optional business fields
        donutShopName: z.string().max(255).optional(),
        yearsInBusiness: z.number().int().min(0).max(200).optional(),
        numberOfStores: z.number().int().min(0).max(10000).optional(),
        grossMonthlyIncome: z.number().min(0).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Check if username already exists
        const existingUser = await db.getUserByUsername(input.username);
        if (existingUser) {
          throw new TRPCError({ code: 'CONFLICT', message: 'Username already taken' });
        }
        
        // Hash password
        const passwordHash = await bcrypt.hash(input.password, 12);
        
        // Create user
        const userId = await db.createLocalUser({
          username: input.username,
          passwordHash,
          email: input.email,
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone,
          address: input.address,
          city: input.city,
          state: input.state,
          zipCode: input.zipCode,
          donutShopName: input.donutShopName,
          yearsInBusiness: input.yearsInBusiness,
          numberOfStores: input.numberOfStores,
          grossMonthlyIncome: input.grossMonthlyIncome?.toString(),
        });
        
        if (!userId) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create user' });
        }
        
        return { success: true, userId };
      }),
    
    // Local user login
    login: publicProcedure
      .input(z.object({
        username: z.string(),
        password: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const user = await db.getUserByUsername(input.username);
        if (!user || !user.passwordHash) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid username or password' });
        }
        
        const passwordValid = await bcrypt.compare(input.password, user.passwordHash);
        if (!passwordValid) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid username or password' });
        }
        
        // Create JWT token
        const secret = new TextEncoder().encode(ENV.cookieSecret);
        const token = await new SignJWT({ 
          sub: user.openId,
          userId: user.id,
          role: user.role,
        })
          .setProtectedHeader({ alg: 'HS256' })
          .setIssuedAt()
          .setExpirationTime('7d')
          .sign(secret);
        
        // Set cookie
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, {
          ...cookieOptions,
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });
        
        // Update last signed in
        await db.updateUserProfile(user.id, { lastSignedIn: new Date() } as any);
        
        return { 
          success: true, 
          user: {
            id: user.id,
            username: user.username,
            name: user.name,
            email: user.email,
            role: user.role,
          }
        };
      }),
    
    // Check if username is available
    checkUsername: publicProcedure
      .input(z.object({ username: z.string() }))
      .query(async ({ input }) => {
        const existingUser = await db.getUserByUsername(input.username);
        return { available: !existingUser };
      }),
    
    // Change password (authenticated user)
    changePassword: protectedProcedure
      .input(z.object({
        currentPassword: z.string(),
        newPassword: z.string().min(8).max(100),
      }))
      .mutation(async ({ ctx, input }) => {
        const user = await db.getUserById(ctx.user.id);
        if (!user || !user.passwordHash) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot change password for OAuth users' });
        }
        
        const passwordValid = await bcrypt.compare(input.currentPassword, user.passwordHash);
        if (!passwordValid) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Current password is incorrect' });
        }
        
        const newPasswordHash = await bcrypt.hash(input.newPassword, 12);
        await db.updateUserPassword(ctx.user.id, newPasswordHash);
        
        return { success: true };
      }),
    
    // Force change password (for first login)
    forceChangePassword: protectedProcedure
      .input(z.object({
        newPassword: z.string().min(8).max(100),
      }))
      .mutation(async ({ ctx, input }) => {
        const user = await db.getUserById(ctx.user.id);
        if (!user) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
        }
        
        const newPasswordHash = await bcrypt.hash(input.newPassword, 12);
        await db.updateUserPassword(ctx.user.id, newPasswordHash);
        await db.clearMustChangePassword(ctx.user.id);
        
        return { success: true };
      }),
    
    // Check if user must change password
    mustChangePassword: protectedProcedure.query(async ({ ctx }) => {
      const user = await db.getUserById(ctx.user.id);
      return { mustChange: user?.mustChangePassword ?? false };
    }),
    
    // Admin: Create user with credentials
    adminCreateUser: adminProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(8),
        role: z.enum(['user', 'moderator', 'admin']).default('user'),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        sendWelcomeEmail: z.boolean().default(true),
      }))
      .mutation(async ({ ctx, input }) => {
        // Check if email already exists
        const existingUser = await db.getUserByEmail(input.email);
        if (existingUser) {
          throw new TRPCError({ code: 'CONFLICT', message: 'Email already registered' });
        }
        
        // Generate username from email
        const username = input.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_');
        
        // Check if username exists, append random suffix if needed
        let finalUsername = username;
        const existingUsername = await db.getUserByUsername(username);
        if (existingUsername) {
          finalUsername = username + '_' + Math.random().toString(36).substring(2, 6);
        }
        
        // Hash password
        const passwordHash = await bcrypt.hash(input.password, 12);
        
        // Create user with mustChangePassword flag
        const userId = await db.createLocalUser({
          username: finalUsername,
          passwordHash,
          email: input.email,
          firstName: input.firstName,
          lastName: input.lastName,
          role: input.role,
          mustChangePassword: true,
        });
        
        if (!userId) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create user' });
        }
        
        return { 
          success: true, 
          userId,
          username: finalUsername,
          message: input.sendWelcomeEmail ? 'User created. Welcome email will be sent.' : 'User created.'
        };
      }),
  }),

  // ============ USER ROUTES ============
  users: router({
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const user = await db.getUserById(input.id);
        if (!user) throw new TRPCError({ code: 'NOT_FOUND' });
        // Return public profile data only
        return {
          id: user.id,
          name: user.name,
          bio: user.bio,
          avatarUrl: user.avatarUrl,
          role: user.role,
          createdAt: user.createdAt,
        };
      }),
    
    getProfile: protectedProcedure.query(async ({ ctx }) => {
      const user = await db.getUserById(ctx.user.id);
      return user;
    }),

    updateProfile: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(100).optional(),
        bio: z.string().max(500).optional(),
        avatarUrl: z.string().url().optional().nullable(),
        emailOnReply: z.boolean().optional(),
        emailOnThreadUpdate: z.boolean().optional(),
        emailOnNewThread: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updateUserProfile(ctx.user.id, input);
        return { success: true };
      }),

    getStats: publicProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        const threads = await db.getThreadsByAuthor(input.userId, 1000, 0);
        const postCount = await db.getPostCountByAuthor(input.userId);
        return {
          threadCount: threads.length,
          postCount,
        };
      }),

    // Admin: list all users
    list: adminProcedure
      .input(z.object({ limit: z.number().default(100), offset: z.number().default(0) }))
      .query(async ({ input }) => {
        return db.getAllUsers(input.limit, input.offset);
      }),

    // Admin: update user role
    updateRole: adminProcedure
      .input(z.object({ userId: z.number(), role: z.enum(['user', 'moderator', 'admin']) }))
      .mutation(async ({ input }) => {
        await db.updateUserRole(input.userId, input.role);
        return { success: true };
      }),

    // Get user permissions for current user
    getPermissions: protectedProcedure
      .input(z.object({ contentType: z.string() }))
      .query(({ ctx, input }) => {
        return getUserPermissions(ctx, input.contentType as ContentType);
      }),

    // Get all permissions for a role (admin only)
    getRolePermissions: adminProcedure
      .input(z.object({ role: z.enum(['user', 'moderator', 'admin']) }))
      .query(({ input }) => {
        return getPermissionSummary(input.role);
      }),

    // Get all role configurations (admin only)
    getAllRolePermissions: adminProcedure.query(() => {
      return {
        user: getPermissionSummary('user'),
        moderator: getPermissionSummary('moderator'),
        admin: getPermissionSummary('admin'),
      };
    }),
  }),

  // ============ CATEGORY ROUTES ============
  categories: router({
    list: publicProcedure.query(async () => {
      return db.getAllCategories();
    }),

    getBySlug: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        const category = await db.getCategoryBySlug(input.slug);
        if (!category) throw new TRPCError({ code: 'NOT_FOUND' });
        return category;
      }),

    create: adminProcedure
      .input(z.object({
        name: z.string().min(1).max(100),
        slug: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
        color: z.string().max(7).optional(),
        icon: z.string().max(50).optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createCategory(input);
        return { id };
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().max(500).optional(),
        color: z.string().max(7).optional(),
        icon: z.string().max(50).optional(),
        sortOrder: z.number().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateCategory(id, data);
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteCategory(input.id);
        return { success: true };
      }),

    subscribe: protectedProcedure
      .input(z.object({ categoryId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.subscribeToCategory(ctx.user.id, input.categoryId);
        return { success: true };
      }),

    unsubscribe: protectedProcedure
      .input(z.object({ categoryId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.unsubscribeFromCategory(ctx.user.id, input.categoryId);
        return { success: true };
      }),

    isSubscribed: protectedProcedure
      .input(z.object({ categoryId: z.number() }))
      .query(async ({ ctx, input }) => {
        return db.isUserSubscribedToCategory(ctx.user.id, input.categoryId);
      }),

    getSubscriptions: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserCategorySubscriptions(ctx.user.id);
    }),
  }),

  // ============ THREAD ROUTES ============
  threads: router({
    list: publicProcedure
      .input(z.object({
        categoryId: z.number().optional(),
        limit: z.number().default(20),
        offset: z.number().default(0),
      }))
      .query(async ({ input }) => {
        if (input.categoryId) {
          return db.getThreadsByCategory(input.categoryId, input.limit, input.offset);
        }
        return db.getAllThreads(input.limit, input.offset);
      }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const thread = await db.getThreadById(input.id);
        if (!thread) throw new TRPCError({ code: 'NOT_FOUND' });
        // Increment view count
        await db.incrementThreadViewCount(input.id);
        return thread;
      }),

    getByAuthor: publicProcedure
      .input(z.object({ authorId: z.number(), limit: z.number().default(20), offset: z.number().default(0) }))
      .query(async ({ input }) => {
        return db.getThreadsByAuthor(input.authorId, input.limit, input.offset);
      }),

    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1).max(255),
        content: z.string().min(1),
        categoryId: z.number(),
        tags: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const slug = generateSlug(input.title);
        const id = await db.createThread({
          title: input.title,
          slug,
          content: input.content,
          categoryId: input.categoryId,
          authorId: ctx.user.id,
        });

        // Auto-subscribe author to thread
        if (id) {
          await db.subscribeToThread(ctx.user.id, id);
          
          // Handle tags
          if (input.tags && input.tags.length > 0) {
            for (const tagName of input.tags) {
              const tagSlug = tagName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
              let tag = await db.getTagBySlug(tagSlug);
              if (!tag) {
                const tagId = await db.createTag({ name: tagName, slug: tagSlug });
                if (tagId) {
                  await db.addTagToThread(id, tagId);
                }
              } else {
                await db.addTagToThread(id, tag.id);
              }
            }
          }

          // Create notifications for category subscribers
          const subscribers = await db.getCategorySubscribers(input.categoryId);
          for (const subscriber of subscribers) {
            if (subscriber.id !== ctx.user.id && subscriber.emailOnNewThread) {
              await db.createNotification({
                userId: subscriber.id,
                type: 'new_thread',
                title: 'New Thread',
                message: `${ctx.user.name || 'Someone'} posted a new thread: "${input.title}"`,
                relatedThreadId: id,
              });
            }
          }
        }

        return { id, slug };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).max(255).optional(),
        content: z.string().min(1).optional(),
        categoryId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const thread = await db.getThreadById(input.id);
        if (!thread) throw new TRPCError({ code: 'NOT_FOUND' });
        // Check if user can modify (owner, moderator, or admin)
        const canModify = await canModifyContent(ctx, 'threads', thread.authorId);
        if (!canModify) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'You do not have permission to modify this thread' });
        }
        const { id, ...data } = input;
        await db.updateThread(id, data);

        // Notify subscribers of update
        const subscribers = await db.getThreadSubscribers(id);
        for (const subscriber of subscribers) {
          if (subscriber.id !== ctx.user.id && subscriber.emailOnThreadUpdate) {
            await db.createNotification({
              userId: subscriber.id,
              type: 'thread_update',
              title: 'Thread Updated',
              message: `A thread you follow was updated: "${thread.title}"`,
              relatedThreadId: id,
            });
          }
        }

        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const thread = await db.getThreadById(input.id);
        if (!thread) throw new TRPCError({ code: 'NOT_FOUND' });
        // Check if user can modify (owner, moderator, or admin)
        const canModify = await canModifyContent(ctx, 'threads', thread.authorId);
        if (!canModify) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'You do not have permission to delete this thread' });
        }
        await db.deleteThread(input.id);
        return { success: true };
      }),

    // Moderator/Admin: pin/unpin thread
    togglePin: moderatorProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const thread = await db.getThreadById(input.id);
        if (!thread) throw new TRPCError({ code: 'NOT_FOUND' });
        await db.updateThread(input.id, { isPinned: !thread.isPinned });
        return { success: true, isPinned: !thread.isPinned };
      }),

    // Moderator/Admin: lock/unlock thread
    toggleLock: moderatorProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const thread = await db.getThreadById(input.id);
        if (!thread) throw new TRPCError({ code: 'NOT_FOUND' });
        await db.updateThread(input.id, { isLocked: !thread.isLocked });
        return { success: true, isLocked: !thread.isLocked };
      }),

    subscribe: protectedProcedure
      .input(z.object({ threadId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.subscribeToThread(ctx.user.id, input.threadId);
        return { success: true };
      }),

    unsubscribe: protectedProcedure
      .input(z.object({ threadId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.unsubscribeFromThread(ctx.user.id, input.threadId);
        return { success: true };
      }),

    isSubscribed: protectedProcedure
      .input(z.object({ threadId: z.number() }))
      .query(async ({ ctx, input }) => {
        return db.isUserSubscribedToThread(ctx.user.id, input.threadId);
      }),

    search: publicProcedure
      .input(z.object({ query: z.string().min(1), limit: z.number().default(20), offset: z.number().default(0) }))
      .query(async ({ input }) => {
        return db.searchThreads(input.query, input.limit, input.offset);
      }),

    getCount: publicProcedure
      .input(z.object({ categoryId: z.number().optional() }))
      .query(async ({ input }) => {
        if (input.categoryId) {
          return db.getThreadCountByCategory(input.categoryId);
        }
        return db.getThreadCount();
      }),
  }),

  // ============ POST ROUTES ============
  posts: router({
    listByThread: publicProcedure
      .input(z.object({ threadId: z.number(), limit: z.number().default(50), offset: z.number().default(0) }))
      .query(async ({ input }) => {
        return db.getPostsByThread(input.threadId, input.limit, input.offset);
      }),

    getByAuthor: publicProcedure
      .input(z.object({ authorId: z.number(), limit: z.number().default(20), offset: z.number().default(0) }))
      .query(async ({ input }) => {
        return db.getPostsByAuthor(input.authorId, input.limit, input.offset);
      }),

    create: protectedProcedure
      .input(z.object({
        threadId: z.number(),
        content: z.string().min(1),
        parentPostId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const thread = await db.getThreadById(input.threadId);
        if (!thread) throw new TRPCError({ code: 'NOT_FOUND' });
        if (thread.isLocked && ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Thread is locked' });
        }

        const id = await db.createPost({
          threadId: input.threadId,
          authorId: ctx.user.id,
          content: input.content,
          parentPostId: input.parentPostId,
        });

        // Auto-subscribe author to thread
        if (id) {
          const isSubscribed = await db.isUserSubscribedToThread(ctx.user.id, input.threadId);
          if (!isSubscribed) {
            await db.subscribeToThread(ctx.user.id, input.threadId);
          }

          // Notify thread subscribers
          const subscribers = await db.getThreadSubscribers(input.threadId);
          for (const subscriber of subscribers) {
            if (subscriber.id !== ctx.user.id && subscriber.emailOnReply) {
              await db.createNotification({
                userId: subscriber.id,
                type: 'reply',
                title: 'New Reply',
                message: `${ctx.user.name || 'Someone'} replied to "${thread.title}"`,
                relatedThreadId: input.threadId,
                relatedPostId: id,
              });
            }
          }

          // If replying to a specific post, notify that post's author
          if (input.parentPostId) {
            const parentPost = await db.getPostById(input.parentPostId);
            if (parentPost && parentPost.authorId !== ctx.user.id) {
              const parentAuthor = await db.getUserById(parentPost.authorId);
              if (parentAuthor?.emailOnReply) {
                await db.createNotification({
                  userId: parentPost.authorId,
                  type: 'reply',
                  title: 'Reply to Your Post',
                  message: `${ctx.user.name || 'Someone'} replied to your post in "${thread.title}"`,
                  relatedThreadId: input.threadId,
                  relatedPostId: id,
                });
              }
            }
          }
        }

        return { id };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        content: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const post = await db.getPostById(input.id);
        if (!post) throw new TRPCError({ code: 'NOT_FOUND' });
        // Check if user can modify (owner, moderator, or admin)
        const canModify = await canModifyContent(ctx, 'posts', post.authorId);
        if (!canModify) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'You do not have permission to modify this post' });
        }
        await db.updatePost(input.id, { content: input.content });
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const post = await db.getPostById(input.id);
        if (!post) throw new TRPCError({ code: 'NOT_FOUND' });
        // Check if user can modify (owner, moderator, or admin)
        const canModify = await canModifyContent(ctx, 'posts', post.authorId);
        if (!canModify) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'You do not have permission to delete this post' });
        }
        await db.deletePost(input.id);
        return { success: true };
      }),
  }),

  // ============ TAG ROUTES ============
  tags: router({
    list: publicProcedure.query(async () => {
      return db.getAllTags();
    }),

    getByThread: publicProcedure
      .input(z.object({ threadId: z.number() }))
      .query(async ({ input }) => {
        return db.getTagsByThread(input.threadId);
      }),

    create: adminProcedure
      .input(z.object({
        name: z.string().min(1).max(50),
        color: z.string().max(7).optional(),
      }))
      .mutation(async ({ input }) => {
        const slug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const id = await db.createTag({ name: input.name, slug, color: input.color });
        return { id };
      }),
  }),

  // ============ REPORT ROUTES ============
  reports: router({
    create: protectedProcedure
      .input(z.object({
        contentType: z.enum(['thread', 'post']),
        contentId: z.number(),
        reason: z.string().min(1).max(1000),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.createReport({
          reporterId: ctx.user.id,
          contentType: input.contentType,
          contentId: input.contentId,
          reason: input.reason,
        });
        return { id };
      }),

    list: moderatorProcedure
      .input(z.object({
        status: z.string().optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      }))
      .query(async ({ input }) => {
        return db.getAllReports(input.status, input.limit, input.offset);
      }),

    resolve: moderatorProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(['reviewed', 'resolved', 'dismissed']),
        adminNotes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updateReport(input.id, {
          status: input.status,
          resolvedById: ctx.user.id,
          resolvedAt: new Date(),
          adminNotes: input.adminNotes,
        });
        return { success: true };
      }),
  }),

  // ============ NOTIFICATION ROUTES ============
  notifications: router({
    list: protectedProcedure
      .input(z.object({ limit: z.number().default(50), offset: z.number().default(0) }))
      .query(async ({ ctx, input }) => {
        return db.getUserNotifications(ctx.user.id, input.limit, input.offset);
      }),

    unreadCount: protectedProcedure.query(async ({ ctx }) => {
      return db.getUnreadNotificationCount(ctx.user.id);
    }),

    markAsRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.markNotificationAsRead(input.id);
        return { success: true };
      }),

    markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
      await db.markAllNotificationsAsRead(ctx.user.id);
      return { success: true };
    }),
  }),

  // ============ LINKS ROUTES ============
  links: router({
    list: publicProcedure
      .input(z.object({ limit: z.number().default(50), offset: z.number().default(0) }))
      .query(async ({ input }) => {
        return db.getAllLinks(true, input.limit, input.offset);
      }),

    listAll: adminProcedure
      .input(z.object({ limit: z.number().default(50), offset: z.number().default(0) }))
      .query(async ({ input }) => {
        return db.getAllLinks(false, input.limit, input.offset);
      }),

    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1).max(255),
        url: z.string().url(),
        description: z.string().max(500).optional(),
        category: z.string().max(100).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.createLink({
          ...input,
          authorId: ctx.user.id,
          isApproved: ctx.user.role === 'admin',
        });
        return { id };
      }),

    approve: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.updateLink(input.id, { isApproved: true });
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteLink(input.id);
        return { success: true };
      }),
  }),

  // ============ LISTINGS (FOR SALE) ROUTES ============
  listings: router({
    list: publicProcedure
      .input(z.object({ limit: z.number().default(50), offset: z.number().default(0) }))
      .query(async ({ input }) => {
        return db.getAllListings("active", input.limit, input.offset);
      }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const listing = await db.getListingById(input.id);
        if (!listing) throw new TRPCError({ code: 'NOT_FOUND' });
        return listing;
      }),

    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1).max(255),
        description: z.string().min(1),
        price: z.string().max(50).optional(),
        location: z.string().max(255).optional(),
        contactInfo: z.string().optional(),
        imageUrl: z.string().url().optional(),
        listingType: z.enum(['for_sale', 'wanted', 'free']).default('for_sale'),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.createListing({
          ...input,
          authorId: ctx.user.id,
        });
        return { id };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).max(255).optional(),
        description: z.string().min(1).optional(),
        price: z.string().max(50).optional(),
        location: z.string().max(255).optional(),
        contactInfo: z.string().optional(),
        status: z.enum(['active', 'sold', 'expired', 'removed']).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const listing = await db.getListingById(input.id);
        if (!listing) throw new TRPCError({ code: 'NOT_FOUND' });
        if (listing.authorId !== ctx.user.id && ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }
        const { id, ...data } = input;
        await db.updateListing(id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const listing = await db.getListingById(input.id);
        if (!listing) throw new TRPCError({ code: 'NOT_FOUND' });
        if (listing.authorId !== ctx.user.id && ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }
        await db.deleteListing(input.id);
        return { success: true };
      }),
  }),

  // ============ ARTICLES ROUTES ============
  articles: router({
    list: publicProcedure
      .input(z.object({ limit: z.number().default(50), offset: z.number().default(0) }))
      .query(async ({ input }) => {
        return db.getAllArticles(true, input.limit, input.offset);
      }),

    listAll: adminProcedure
      .input(z.object({ limit: z.number().default(50), offset: z.number().default(0) }))
      .query(async ({ input }) => {
        return db.getAllArticles(false, input.limit, input.offset);
      }),

    getBySlug: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        const article = await db.getArticleBySlug(input.slug);
        if (!article) throw new TRPCError({ code: 'NOT_FOUND' });
        return article;
      }),

    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1).max(255),
        content: z.string().min(1),
        excerpt: z.string().max(500).optional(),
        featuredImageUrl: z.string().url().optional(),
        isPublished: z.boolean().default(false),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Only admins can create articles' });
        }
        const slug = generateSlug(input.title);
        const id = await db.createArticle({
          ...input,
          slug,
          authorId: ctx.user.id,
          publishedAt: input.isPublished ? new Date() : undefined,
        });
        return { id, slug };
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).max(255).optional(),
        content: z.string().min(1).optional(),
        excerpt: z.string().max(500).optional(),
        featuredImageUrl: z.string().url().optional().nullable(),
        isPublished: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        if (data.isPublished) {
          (data as any).publishedAt = new Date();
        }
        await db.updateArticle(id, data);
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteArticle(input.id);
        return { success: true };
      }),
  }),

  // ============ ADVERTISEMENTS ROUTES ============
  advertisements: router({
    listActive: publicProcedure
      .input(z.object({ limit: z.number().default(10) }))
      .query(async ({ input }) => {
        return db.getActiveAdvertisements(input.limit);
      }),

    listAll: adminProcedure
      .input(z.object({ limit: z.number().default(50), offset: z.number().default(0) }))
      .query(async ({ input }) => {
        return db.getAllAdvertisements(input.limit, input.offset);
      }),

    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1).max(255),
        content: z.string().min(1),
        imageUrl: z.string().url().optional(),
        linkUrl: z.string().url().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.createAdvertisement({
          ...input,
          authorId: ctx.user.id,
          status: ctx.user.role === 'admin' ? 'active' : 'pending',
        });
        return { id };
      }),

    approve: adminProcedure
      .input(z.object({ id: z.number(), status: z.enum(['active', 'rejected']) }))
      .mutation(async ({ input }) => {
        await db.updateAdvertisement(input.id, { status: input.status });
        return { success: true };
      }),
  }),

  // ============ DISCOUNTS ROUTES ============
  discounts: router({
    list: publicProcedure
      .input(z.object({ limit: z.number().default(50), offset: z.number().default(0) }))
      .query(async ({ input }) => {
        return db.getAllDiscounts(input.limit, input.offset);
      }),

    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1).max(255),
        description: z.string().min(1),
        code: z.string().max(50).optional(),
        discountType: z.string().max(50).optional(),
        businessName: z.string().max(255).optional(),
        location: z.string().max(255).optional(),
        linkUrl: z.string().url().optional(),
        expiresAt: z.date().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.createDiscount({
          ...input,
          authorId: ctx.user.id,
          isVerified: ctx.user.role === 'admin',
        });
        return { id };
      }),

    verify: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.updateDiscount(input.id, { isVerified: true });
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteDiscount(input.id);
        return { success: true };
      }),
  }),

  // ============ EVENTS ROUTES ============
  events: router({
    listUpcoming: publicProcedure
      .input(z.object({ limit: z.number().default(20) }))
      .query(async ({ input }) => {
        return db.getUpcomingEvents(input.limit);
      }),

    listAll: publicProcedure
      .input(z.object({ limit: z.number().default(50), offset: z.number().default(0) }))
      .query(async ({ input }) => {
        return db.getAllEvents(input.limit, input.offset);
      }),

    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1).max(255),
        description: z.string().min(1),
        location: z.string().max(255).optional(),
        address: z.string().optional(),
        eventDate: z.date(),
        endDate: z.date().optional(),
        imageUrl: z.string().url().optional(),
        linkUrl: z.string().url().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.createEvent({
          ...input,
          authorId: ctx.user.id,
          isApproved: ctx.user.role === 'admin',
        });
        return { id };
      }),

    approve: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.updateEvent(input.id, { isApproved: true });
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteEvent(input.id);
        return { success: true };
      }),
  }),

  // ============ JOBS (HELP WANTED) ROUTES ============
  jobs: router({
    listActive: publicProcedure
      .input(z.object({ limit: z.number().default(50), offset: z.number().default(0) }))
      .query(async ({ input }) => {
        return db.getActiveJobs(input.limit, input.offset);
      }),

    listAll: adminProcedure
      .input(z.object({ limit: z.number().default(50), offset: z.number().default(0) }))
      .query(async ({ input }) => {
        return db.getAllJobs(input.limit, input.offset);
      }),

    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1).max(255),
        description: z.string().min(1),
        company: z.string().max(255).optional(),
        location: z.string().max(255).optional(),
        jobType: z.enum(['full_time', 'part_time', 'contract', 'temporary', 'volunteer']).default('full_time'),
        salary: z.string().max(100).optional(),
        contactEmail: z.string().email().optional(),
        applicationUrl: z.string().url().optional(),
        expiresAt: z.date().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.createJob({
          ...input,
          authorId: ctx.user.id,
        });
        return { id };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).max(255).optional(),
        description: z.string().min(1).optional(),
        status: z.enum(['active', 'filled', 'expired', 'removed']).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // For now, only admins can update jobs
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }
        const { id, ...data } = input;
        await db.updateJob(id, data);
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteJob(input.id);
        return { success: true };
      }),
  }),

  // ============ EXPORT ROUTES ============
  export: router({
    threads: adminProcedure
      .input(z.object({ format: z.enum(['json', 'csv']).default('json') }))
      .query(async ({ input }) => {
        const data = await db.exportThreadsData();
        if (input.format === 'csv') {
          const headers = ['id', 'title', 'slug', 'content', 'categoryId', 'authorId', 'isPinned', 'isLocked', 'viewCount', 'replyCount', 'createdAt', 'updatedAt'];
          const csvRows = [headers.join(',')];
          for (const row of data) {
            csvRows.push(headers.map(h => {
              const val = (row as any)[h];
              if (val instanceof Date) return val.toISOString();
              if (typeof val === 'string') return `"${val.replace(/"/g, '""')}"`;
              return val ?? '';
            }).join(','));
          }
          return { data: csvRows.join('\n'), format: 'csv' };
        }
        return { data: JSON.stringify(data, null, 2), format: 'json' };
      }),

    posts: adminProcedure
      .input(z.object({ format: z.enum(['json', 'csv']).default('json') }))
      .query(async ({ input }) => {
        const data = await db.exportPostsData();
        if (input.format === 'csv') {
          const headers = ['id', 'threadId', 'authorId', 'content', 'parentPostId', 'isEdited', 'createdAt', 'updatedAt'];
          const csvRows = [headers.join(',')];
          for (const row of data) {
            csvRows.push(headers.map(h => {
              const val = (row as any)[h];
              if (val instanceof Date) return val.toISOString();
              if (typeof val === 'string') return `"${val.replace(/"/g, '""')}"`;
              return val ?? '';
            }).join(','));
          }
          return { data: csvRows.join('\n'), format: 'csv' };
        }
        return { data: JSON.stringify(data, null, 2), format: 'json' };
      }),

    users: adminProcedure
      .input(z.object({ format: z.enum(['json', 'csv']).default('json') }))
      .query(async ({ input }) => {
        const data = await db.exportUsersData();
        if (input.format === 'csv') {
          const headers = ['id', 'name', 'email', 'role', 'createdAt', 'lastSignedIn'];
          const csvRows = [headers.join(',')];
          for (const row of data) {
            csvRows.push(headers.map(h => {
              const val = (row as any)[h];
              if (val instanceof Date) return val.toISOString();
              if (typeof val === 'string') return `"${val.replace(/"/g, '""')}"`;
              return val ?? '';
            }).join(','));
          }
          return { data: csvRows.join('\n'), format: 'csv' };
        }
        return { data: JSON.stringify(data, null, 2), format: 'json' };
      }),
  }),

  // ============ STATS ROUTES ============
  stats: router({
    overview: publicProcedure.query(async () => {
      const threadCount = await db.getThreadCount();
      const postCount = await db.getPostCount();
      const users = await db.getAllUsers(1000, 0);
      return {
        threadCount,
        postCount,
        userCount: users.length,
      };
    }),
  }),

  // ============ BACKUP ROUTES ============
  backup: router({
    // List all backups
    list: adminProcedure
      .input(z.object({
        limit: z.number().default(50),
        offset: z.number().default(0),
      }))
      .query(async ({ input }) => {
        return backupService.getBackups(input.limit, input.offset);
      }),

    // Get single backup with items
    getById: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const backup = await backupService.getBackupById(input.id);
        if (!backup) throw new TRPCError({ code: 'NOT_FOUND' });
        const items = await backupService.getBackupItems(input.id);
        return { backup, items };
      }),

    // Get backup statistics
    stats: adminProcedure.query(async () => {
      return backupService.getBackupStats();
    }),

    // Create manual backup
    create: adminProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        backupType: z.enum(['full', 'database', 'files', 'incremental']).default('full'),
        tables: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const backup = await backupService.createBackup({
          name: input.name,
          description: input.description,
          backupType: input.backupType,
          triggerType: 'manual',
          createdById: ctx.user.id,
          tables: input.tables,
        });
        if (!backup) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create backup' });
        }
        return backup;
      }),

    // Create pre-update backup (automatic trigger)
    createPreUpdate: adminProcedure
      .input(z.object({
        updateDescription: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const backup = await backupService.createPreUpdateBackup(ctx.user.id, input.updateDescription);
        if (!backup) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create pre-update backup' });
        }
        return backup;
      }),

    // Delete backup (soft delete)
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const success = await backupService.deleteBackup(input.id);
        if (!success) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to delete backup' });
        }
        return { success: true };
      }),

    // Perform rollback
    rollback: adminProcedure
      .input(z.object({
        backupId: z.number(),
        rollbackType: z.enum(['full', 'database', 'files', 'partial']).default('full'),
        tables: z.array(z.string()).optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await backupService.createRollback({
          backupId: input.backupId,
          rollbackType: input.rollbackType,
          initiatedById: ctx.user.id,
          tables: input.tables,
          notes: input.notes,
        });
        if (!result.success) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: result.message });
        }
        return result;
      }),

    // Get rollback history
    rollbackHistory: adminProcedure
      .input(z.object({ limit: z.number().default(50) }))
      .query(async ({ input }) => {
        return backupService.getRollbackHistory(input.limit);
      }),

    // Get/Set backup settings
    getSetting: adminProcedure
      .input(z.object({ key: z.string() }))
      .query(async ({ input }) => {
        return backupService.getBackupSetting(input.key);
      }),

    setSetting: adminProcedure
      .input(z.object({
        key: z.string(),
        value: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        await backupService.setBackupSetting(input.key, input.value, ctx.user.id);
        return { success: true };
      }),

    // Get available tables for backup
    getAvailableTables: adminProcedure.query(() => {
      return [
        'users', 'categories', 'threads', 'posts', 'tags', 'thread_tags',
        'category_subscriptions', 'thread_subscriptions', 'reports',
        'notifications', 'links', 'listings', 'articles', 'advertisements',
        'discounts', 'events', 'jobs'
      ];
    }),

    // Get scheduler status
    getSchedulerStatus: adminProcedure.query(async () => {
      return getSchedulerStatus();
    }),

    // Configure scheduler
    configureScheduler: adminProcedure
      .input(z.object({
        enabled: z.boolean().optional(),
        cronExpression: z.string().optional(),
        backupType: z.enum(['full', 'database']).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await configureScheduler(ctx.user.id, input);
        return { success: true };
      }),

    // Full integrity check (verifies checksums, data format, completeness)
    verifyIntegrity: adminProcedure
      .input(z.object({ backupId: z.number() }))
      .mutation(async ({ input }) => {
        return backupService.verifyBackupIntegrity(input.backupId);
      }),

    // Quick integrity check (database records only, no file fetching)
    quickIntegrityCheck: adminProcedure
      .input(z.object({ backupId: z.number() }))
      .query(async ({ input }) => {
        return backupService.quickIntegrityCheck(input.backupId);
      }),

    // Update backup notes
    updateNotes: adminProcedure
      .input(z.object({
        backupId: z.number(),
        notes: z.string().nullable(),
      }))
      .mutation(async ({ input }) => {
        const success = await db.updateBackupNotes(input.backupId, input.notes);
        if (!success) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update notes' });
        return { success: true };
      }),

    // ============ LABEL MANAGEMENT ============
    // List all labels
    listLabels: adminProcedure.query(async () => {
      return db.getAllBackupLabels();
    }),

    // Create label
    createLabel: adminProcedure
      .input(z.object({
        name: z.string().min(1).max(50),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#6B7280'),
        description: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const label = await db.createBackupLabel({
          name: input.name,
          color: input.color,
          description: input.description,
          createdById: ctx.user.id,
        });
        if (!label) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create label' });
        return label;
      }),

    // Update label
    updateLabel: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(50).optional(),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
        description: z.string().nullable().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        const success = await db.updateBackupLabel(id, data);
        if (!success) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update label' });
        return { success: true };
      }),

    // Delete label
    deleteLabel: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const success = await db.deleteBackupLabel(input.id);
        if (!success) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to delete label' });
        return { success: true };
      }),

    // Assign label to backup
    assignLabel: adminProcedure
      .input(z.object({
        backupId: z.number(),
        labelId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const success = await db.assignLabelToBackup(input.backupId, input.labelId, ctx.user.id);
        if (!success) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to assign label' });
        return { success: true };
      }),

    // Remove label from backup
    removeLabel: adminProcedure
      .input(z.object({
        backupId: z.number(),
        labelId: z.number(),
      }))
      .mutation(async ({ input }) => {
        const success = await db.removeLabelFromBackup(input.backupId, input.labelId);
        if (!success) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to remove label' });
        return { success: true };
      }),

    // Get labels for a backup
    getBackupLabels: adminProcedure
      .input(z.object({ backupId: z.number() }))
      .query(async ({ input }) => {
        return db.getLabelsForBackup(input.backupId);
      }),

    // Get backups by label
    getBackupsByLabel: adminProcedure
      .input(z.object({ labelId: z.number() }))
      .query(async ({ input }) => {
        return db.getBackupsByLabel(input.labelId);
      }),

    // Download backup as JSON
    download: adminProcedure
      .input(z.object({ backupId: z.number() }))
      .mutation(async ({ input }) => {
        const result = await backupService.getBackupAsJson(input.backupId);
        if (!result.success) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: result.error || 'Failed to generate download' });
        }
        return {
          json: result.json,
          filename: result.filename,
        };
      }),

    // ============ RETENTION POLICY ============
    // Get retention policy
    getRetentionPolicy: adminProcedure.query(async () => {
      return backupService.getRetentionPolicy();
    }),

    // Update retention policy
    updateRetentionPolicy: adminProcedure
      .input(z.object({
        enabled: z.boolean().optional(),
        retentionDays: z.number().min(1).max(365).optional(),
        protectLabeled: z.boolean().optional(),
        protectManual: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await backupService.updateRetentionPolicy(input, ctx.user.id);
        if (!result.success) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: result.message });
        }
        return { success: true, message: result.message };
      }),

    // Preview retention policy (show what would be deleted)
    previewRetention: adminProcedure.query(async () => {
      return backupService.previewRetentionPolicy();
    }),

    // Apply retention policy manually
    applyRetention: adminProcedure.mutation(async () => {
      const result = await backupService.applyRetentionPolicy();
      if (!result.success) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: result.message });
      }
      return result;
    }),

    // ============ ACTIVITY LOG ROUTES ============

    // Get activity logs with filtering and pagination
    getActivityLogs: adminProcedure
      .input(z.object({
        activityType: z.enum([
          "backup_created",
          "backup_deleted",
          "backup_restored",
          "integrity_check",
          "retention_cleanup",
          "backup_downloaded",
          "label_assigned",
          "label_removed",
          "notes_updated",
          "schedule_changed"
        ]).optional(),
        backupId: z.number().optional(),
        userId: z.number().optional(),
        status: z.enum(["success", "failed", "warning"]).optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      }))
      .query(async ({ input }) => {
        return backupService.getActivityLogs({
          ...input,
          startDate: input.startDate ? new Date(input.startDate) : undefined,
          endDate: input.endDate ? new Date(input.endDate) : undefined,
        });
      }),

    // Get single activity log entry
    getActivityLog: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const log = await backupService.getActivityLogById(input.id);
        if (!log) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Activity log not found' });
        }
        return log;
      }),

    // Get activity statistics
    getActivityStats: adminProcedure.query(async () => {
      return backupService.getActivityStats();
    }),

    // Export activity logs to CSV
    exportActivityLogs: adminProcedure
      .input(z.object({
        activityType: z.enum([
          "backup_created",
          "backup_deleted",
          "backup_restored",
          "integrity_check",
          "retention_cleanup",
          "backup_downloaded",
          "label_assigned",
          "label_removed",
          "notes_updated",
          "schedule_changed"
        ]).optional(),
        status: z.enum(["success", "failed", "warning"]).optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const csv = await backupService.exportActivityLogsToCSV({
          ...input,
          startDate: input.startDate ? new Date(input.startDate) : undefined,
          endDate: input.endDate ? new Date(input.endDate) : undefined,
        });
        return { csv, filename: `backup_activity_logs_${new Date().toISOString().split('T')[0]}.csv` };
      }),

    // Export activity logs to PDF
    exportActivityLogsPDF: adminProcedure
      .input(z.object({
        activityType: z.enum([
          "backup_created",
          "backup_deleted",
          "backup_restored",
          "integrity_check",
          "retention_cleanup",
          "backup_downloaded",
          "label_assigned",
          "label_removed",
          "notes_updated",
          "schedule_changed"
        ]).optional(),
        status: z.enum(["success", "failed", "warning"]).optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { generateActivityLogPDF } = await import('./pdfService');
        
        // Get filtered logs
        const logsResult = await backupService.getActivityLogs({
          ...input,
          startDate: input.startDate ? new Date(input.startDate) : undefined,
          endDate: input.endDate ? new Date(input.endDate) : undefined,
          limit: 500, // Limit for PDF
          offset: 0,
        });
        
        // Get stats
        const stats = await backupService.getActivityStats();
        
        // Generate PDF
        const pdfBuffer = await generateActivityLogPDF({
          logs: logsResult.logs,
          filters: {
            activityType: input.activityType,
            status: input.status,
            startDate: input.startDate,
            endDate: input.endDate,
          },
          stats,
        });
        
        // Convert to base64 for transfer
        const pdfBase64 = pdfBuffer.toString('base64');
        
        return { 
          pdf: pdfBase64, 
          filename: `backup_activity_report_${new Date().toISOString().split('T')[0]}.pdf` 
        };
      }),

    // Log a backup activity (internal use, but exposed for testing)
    logActivity: adminProcedure
      .input(z.object({
        activityType: z.enum([
          "backup_created",
          "backup_deleted",
          "backup_restored",
          "integrity_check",
          "retention_cleanup",
          "backup_downloaded",
          "label_assigned",
          "label_removed",
          "notes_updated",
          "schedule_changed"
        ]),
        backupId: z.number().optional(),
        backupName: z.string().optional(),
        details: z.record(z.string(), z.any()).optional(),
        status: z.enum(["success", "failed", "warning"]).default("success"),
      }))
      .mutation(async ({ ctx, input }) => {
        const success = await backupService.logBackupActivity({
          activityType: input.activityType,
          backupId: input.backupId,
          backupName: input.backupName,
          userId: ctx.user.id,
          userName: ctx.user.name || ctx.user.username || 'Unknown',
          details: input.details,
          status: input.status,
        });
        return { success };
      }),
  }),
});

export type AppRouter = typeof appRouter;
