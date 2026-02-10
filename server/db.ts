import { eq, and, or, desc, asc, like, sql, inArray, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  categories, InsertCategory,
  threads, InsertThread,
  posts, InsertPost,
  tags, InsertTag,
  threadTags, InsertThreadTag,
  categorySubscriptions, InsertCategorySubscription,
  threadSubscriptions, InsertThreadSubscription,
  reports, InsertReport,
  notifications, InsertNotification,
  links, InsertLink,
  listings, InsertListing,
  articles, InsertArticle,
  advertisements, InsertAdvertisement,
  discounts, InsertDiscount,
  events, InsertEvent,
  jobs, InsertJob,
  backups,
  backupLabels, InsertBackupLabel,
  backupLabelAssignments, InsertBackupLabelAssignment,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============ USER FUNCTIONS ============

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod", "bio", "avatarUrl"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers(limit = 100, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.createdAt)).limit(limit).offset(offset);
}

export async function updateUserProfile(userId: number, data: Partial<InsertUser>) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set(data).where(eq(users.id, userId));
}

export async function updateUserRole(userId: number, role: "user" | "moderator" | "admin") {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

// ============ REGISTRATION FUNCTIONS ============

export async function getUserByUsername(username: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserPassword(userId: number, passwordHash: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ passwordHash }).where(eq(users.id, userId));
}

export async function clearMustChangePassword(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ mustChangePassword: false }).where(eq(users.id, userId));
}

export async function getAdminUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).where(eq(users.role, 'admin'));
}

export async function createLocalUser(data: {
  username: string;
  passwordHash: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  donutShopName?: string;
  yearsInBusiness?: number;
  numberOfStores?: number;
  grossMonthlyIncome?: string;
  role?: 'user' | 'moderator' | 'admin';
  mustChangePassword?: boolean;
}) {
  const db = await getDb();
  if (!db) return null;
  
  // Generate a unique openId for local users
  const openId = `local_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  
  const result = await db.insert(users).values({
    openId,
    username: data.username,
    passwordHash: data.passwordHash,
    email: data.email || null,
    firstName: data.firstName || null,
    lastName: data.lastName || null,
    phone: data.phone || null,
    address: data.address || null,
    city: data.city || null,
    state: data.state || null,
    zipCode: data.zipCode || null,
    donutShopName: data.donutShopName || null,
    yearsInBusiness: data.yearsInBusiness || null,
    numberOfStores: data.numberOfStores || null,
    grossMonthlyIncome: data.grossMonthlyIncome || null,
    loginMethod: 'local',
    name: data.firstName && data.lastName ? `${data.firstName} ${data.lastName}` : data.username,
    role: data.role || 'user',
    mustChangePassword: data.mustChangePassword || false,
  });
  
  return result[0].insertId;
}

export async function updateUserRegistrationInfo(userId: number, data: {
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  email?: string;
  donutShopName?: string;
  yearsInBusiness?: number;
  numberOfStores?: number;
  grossMonthlyIncome?: string;
}) {
  const db = await getDb();
  if (!db) return;
  
  const updateData: Record<string, unknown> = {};
  if (data.firstName !== undefined) updateData.firstName = data.firstName;
  if (data.lastName !== undefined) updateData.lastName = data.lastName;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.address !== undefined) updateData.address = data.address;
  if (data.city !== undefined) updateData.city = data.city;
  if (data.state !== undefined) updateData.state = data.state;
  if (data.zipCode !== undefined) updateData.zipCode = data.zipCode;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.donutShopName !== undefined) updateData.donutShopName = data.donutShopName;
  if (data.yearsInBusiness !== undefined) updateData.yearsInBusiness = data.yearsInBusiness;
  if (data.numberOfStores !== undefined) updateData.numberOfStores = data.numberOfStores;
  if (data.grossMonthlyIncome !== undefined) updateData.grossMonthlyIncome = data.grossMonthlyIncome;
  
  // Update name if first/last name provided
  if (data.firstName || data.lastName) {
    const user = await getUserById(userId);
    if (user) {
      const firstName = data.firstName ?? user.firstName ?? '';
      const lastName = data.lastName ?? user.lastName ?? '';
      if (firstName || lastName) {
        updateData.name = `${firstName} ${lastName}`.trim();
      }
    }
  }
  
  if (Object.keys(updateData).length > 0) {
    await db.update(users).set(updateData).where(eq(users.id, userId));
  }
}

// ============ CATEGORY FUNCTIONS ============

export async function createCategory(data: InsertCategory) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(categories).values(data);
  return result[0].insertId;
}

export async function getAllCategories() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(categories).where(eq(categories.isActive, true)).orderBy(asc(categories.sortOrder));
}

export async function getCategoryBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateCategory(id: number, data: Partial<InsertCategory>) {
  const db = await getDb();
  if (!db) return;
  await db.update(categories).set(data).where(eq(categories.id, id));
}

export async function deleteCategory(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(categories).set({ isActive: false }).where(eq(categories.id, id));
}

// ============ THREAD FUNCTIONS ============

export async function createThread(data: InsertThread) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(threads).values(data);
  return result[0].insertId;
}

export async function getThreadById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(threads).where(and(eq(threads.id, id), eq(threads.isDeleted, false))).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getThreadsByCategory(categoryId: number, limit = 20, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(threads)
    .where(and(eq(threads.categoryId, categoryId), eq(threads.isDeleted, false)))
    .orderBy(desc(threads.isPinned), desc(threads.lastReplyAt), desc(threads.createdAt))
    .limit(limit).offset(offset);
}

export async function getAllThreads(limit = 20, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(threads)
    .where(eq(threads.isDeleted, false))
    .orderBy(desc(threads.isPinned), desc(threads.lastReplyAt), desc(threads.createdAt))
    .limit(limit).offset(offset);
}

export async function getThreadsByAuthor(authorId: number, limit = 20, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(threads)
    .where(and(eq(threads.authorId, authorId), eq(threads.isDeleted, false)))
    .orderBy(desc(threads.createdAt))
    .limit(limit).offset(offset);
}

export async function updateThread(id: number, data: Partial<InsertThread>) {
  const db = await getDb();
  if (!db) return;
  await db.update(threads).set(data).where(eq(threads.id, id));
}

export async function deleteThread(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(threads).set({ isDeleted: true }).where(eq(threads.id, id));
}

export async function incrementThreadViewCount(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(threads).set({ viewCount: sql`${threads.viewCount} + 1` }).where(eq(threads.id, id));
}

export async function searchThreads(query: string, limit = 20, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(threads)
    .where(and(
      eq(threads.isDeleted, false),
      or(
        like(threads.title, `%${query}%`),
        like(threads.content, `%${query}%`)
      )
    ))
    .orderBy(desc(threads.createdAt))
    .limit(limit).offset(offset);
}

export async function getThreadCount() {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` }).from(threads).where(eq(threads.isDeleted, false));
  return result[0]?.count ?? 0;
}

export async function getThreadCountByCategory(categoryId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` }).from(threads)
    .where(and(eq(threads.categoryId, categoryId), eq(threads.isDeleted, false)));
  return result[0]?.count ?? 0;
}

// ============ POST FUNCTIONS ============

export async function createPost(data: InsertPost) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(posts).values(data);
  
  // Update thread reply count and last reply info
  await db.update(threads).set({
    replyCount: sql`${threads.replyCount} + 1`,
    lastReplyAt: new Date(),
    lastReplyById: data.authorId,
  }).where(eq(threads.id, data.threadId));
  
  return result[0].insertId;
}

export async function getPostById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(posts).where(and(eq(posts.id, id), eq(posts.isDeleted, false))).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getPostsByThread(threadId: number, limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(posts)
    .where(and(eq(posts.threadId, threadId), eq(posts.isDeleted, false)))
    .orderBy(asc(posts.createdAt))
    .limit(limit).offset(offset);
}

export async function getPostsByAuthor(authorId: number, limit = 20, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(posts)
    .where(and(eq(posts.authorId, authorId), eq(posts.isDeleted, false)))
    .orderBy(desc(posts.createdAt))
    .limit(limit).offset(offset);
}

export async function updatePost(id: number, data: Partial<InsertPost>) {
  const db = await getDb();
  if (!db) return;
  await db.update(posts).set({ ...data, isEdited: true, editedAt: new Date() }).where(eq(posts.id, id));
}

export async function deletePost(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(posts).set({ isDeleted: true }).where(eq(posts.id, id));
}

export async function getPostCount() {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` }).from(posts).where(eq(posts.isDeleted, false));
  return result[0]?.count ?? 0;
}

export async function getPostCountByAuthor(authorId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` }).from(posts)
    .where(and(eq(posts.authorId, authorId), eq(posts.isDeleted, false)));
  return result[0]?.count ?? 0;
}

// ============ TAG FUNCTIONS ============

export async function createTag(data: InsertTag) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(tags).values(data);
  return result[0].insertId;
}

export async function getAllTags() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tags).orderBy(desc(tags.usageCount));
}

export async function getTagBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(tags).where(eq(tags.slug, slug)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function addTagToThread(threadId: number, tagId: number) {
  const db = await getDb();
  if (!db) return;
  await db.insert(threadTags).values({ threadId, tagId });
  await db.update(tags).set({ usageCount: sql`${tags.usageCount} + 1` }).where(eq(tags.id, tagId));
}

export async function removeTagFromThread(threadId: number, tagId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(threadTags).where(and(eq(threadTags.threadId, threadId), eq(threadTags.tagId, tagId)));
  await db.update(tags).set({ usageCount: sql`${tags.usageCount} - 1` }).where(eq(tags.id, tagId));
}

export async function getTagsByThread(threadId: number) {
  const db = await getDb();
  if (!db) return [];
  const result = await db.select({ tag: tags }).from(threadTags)
    .innerJoin(tags, eq(threadTags.tagId, tags.id))
    .where(eq(threadTags.threadId, threadId));
  return result.map(r => r.tag);
}

// ============ SUBSCRIPTION FUNCTIONS ============

export async function subscribeToCategory(userId: number, categoryId: number) {
  const db = await getDb();
  if (!db) return;
  await db.insert(categorySubscriptions).values({ userId, categoryId });
}

export async function unsubscribeFromCategory(userId: number, categoryId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(categorySubscriptions).where(
    and(eq(categorySubscriptions.userId, userId), eq(categorySubscriptions.categoryId, categoryId))
  );
}

export async function getCategorySubscribers(categoryId: number) {
  const db = await getDb();
  if (!db) return [];
  const result = await db.select({ user: users }).from(categorySubscriptions)
    .innerJoin(users, eq(categorySubscriptions.userId, users.id))
    .where(eq(categorySubscriptions.categoryId, categoryId));
  return result.map(r => r.user);
}

export async function getUserCategorySubscriptions(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const result = await db.select({ category: categories }).from(categorySubscriptions)
    .innerJoin(categories, eq(categorySubscriptions.categoryId, categories.id))
    .where(eq(categorySubscriptions.userId, userId));
  return result.map(r => r.category);
}

export async function subscribeToThread(userId: number, threadId: number) {
  const db = await getDb();
  if (!db) return;
  await db.insert(threadSubscriptions).values({ userId, threadId });
}

export async function unsubscribeFromThread(userId: number, threadId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(threadSubscriptions).where(
    and(eq(threadSubscriptions.userId, userId), eq(threadSubscriptions.threadId, threadId))
  );
}

export async function getThreadSubscribers(threadId: number) {
  const db = await getDb();
  if (!db) return [];
  const result = await db.select({ user: users }).from(threadSubscriptions)
    .innerJoin(users, eq(threadSubscriptions.userId, users.id))
    .where(eq(threadSubscriptions.threadId, threadId));
  return result.map(r => r.user);
}

export async function isUserSubscribedToThread(userId: number, threadId: number) {
  const db = await getDb();
  if (!db) return false;
  const result = await db.select().from(threadSubscriptions)
    .where(and(eq(threadSubscriptions.userId, userId), eq(threadSubscriptions.threadId, threadId)))
    .limit(1);
  return result.length > 0;
}

export async function isUserSubscribedToCategory(userId: number, categoryId: number) {
  const db = await getDb();
  if (!db) return false;
  const result = await db.select().from(categorySubscriptions)
    .where(and(eq(categorySubscriptions.userId, userId), eq(categorySubscriptions.categoryId, categoryId)))
    .limit(1);
  return result.length > 0;
}

// ============ REPORT FUNCTIONS ============

export async function createReport(data: InsertReport) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(reports).values(data);
  return result[0].insertId;
}

export async function getAllReports(status?: string, limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  if (status) {
    return db.select().from(reports)
      .where(eq(reports.status, status as any))
      .orderBy(desc(reports.createdAt))
      .limit(limit).offset(offset);
  }
  return db.select().from(reports).orderBy(desc(reports.createdAt)).limit(limit).offset(offset);
}

export async function updateReport(id: number, data: Partial<InsertReport>) {
  const db = await getDb();
  if (!db) return;
  await db.update(reports).set(data).where(eq(reports.id, id));
}

// ============ NOTIFICATION FUNCTIONS ============

export async function createNotification(data: InsertNotification) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(notifications).values(data);
  return result[0].insertId;
}

export async function getUserNotifications(userId: number, limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit).offset(offset);
}

export async function markNotificationAsRead(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
}

export async function markAllNotificationsAsRead(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId));
}

export async function getUnreadNotificationCount(userId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` }).from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  return result[0]?.count ?? 0;
}

// ============ LINKS FUNCTIONS ============

export async function createLink(data: InsertLink) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(links).values(data);
  return result[0].insertId;
}

export async function getAllLinks(approved = true, limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(links)
    .where(eq(links.isApproved, approved))
    .orderBy(desc(links.createdAt))
    .limit(limit).offset(offset);
}

export async function updateLink(id: number, data: Partial<InsertLink>) {
  const db = await getDb();
  if (!db) return;
  await db.update(links).set(data).where(eq(links.id, id));
}

export async function deleteLink(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(links).where(eq(links.id, id));
}

// ============ LISTINGS FUNCTIONS ============

export async function createListing(data: InsertListing) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(listings).values(data);
  return result[0].insertId;
}

export async function getAllListings(status = "active", limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(listings)
    .where(eq(listings.status, status as any))
    .orderBy(desc(listings.createdAt))
    .limit(limit).offset(offset);
}

export async function getListingById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(listings).where(eq(listings.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateListing(id: number, data: Partial<InsertListing>) {
  const db = await getDb();
  if (!db) return;
  await db.update(listings).set(data).where(eq(listings.id, id));
}

export async function deleteListing(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(listings).set({ status: "removed" }).where(eq(listings.id, id));
}

// ============ ARTICLES FUNCTIONS ============

export async function createArticle(data: InsertArticle) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(articles).values(data);
  return result[0].insertId;
}

export async function getAllArticles(published = true, limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(articles)
    .where(eq(articles.isPublished, published))
    .orderBy(desc(articles.publishedAt), desc(articles.createdAt))
    .limit(limit).offset(offset);
}

export async function getArticleBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(articles).where(eq(articles.slug, slug)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateArticle(id: number, data: Partial<InsertArticle>) {
  const db = await getDb();
  if (!db) return;
  await db.update(articles).set(data).where(eq(articles.id, id));
}

export async function deleteArticle(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(articles).where(eq(articles.id, id));
}

// ============ ADVERTISEMENTS FUNCTIONS ============

export async function createAdvertisement(data: InsertAdvertisement) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(advertisements).values(data);
  return result[0].insertId;
}

export async function getActiveAdvertisements(limit = 10) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(advertisements)
    .where(eq(advertisements.status, "active"))
    .orderBy(desc(advertisements.createdAt))
    .limit(limit);
}

export async function getAllAdvertisements(limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(advertisements)
    .orderBy(desc(advertisements.createdAt))
    .limit(limit).offset(offset);
}

export async function updateAdvertisement(id: number, data: Partial<InsertAdvertisement>) {
  const db = await getDb();
  if (!db) return;
  await db.update(advertisements).set(data).where(eq(advertisements.id, id));
}

// ============ DISCOUNTS FUNCTIONS ============

export async function createDiscount(data: InsertDiscount) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(discounts).values(data);
  return result[0].insertId;
}

export async function getAllDiscounts(limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(discounts)
    .orderBy(desc(discounts.createdAt))
    .limit(limit).offset(offset);
}

export async function updateDiscount(id: number, data: Partial<InsertDiscount>) {
  const db = await getDb();
  if (!db) return;
  await db.update(discounts).set(data).where(eq(discounts.id, id));
}

export async function deleteDiscount(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(discounts).where(eq(discounts.id, id));
}

// ============ EVENTS FUNCTIONS ============

export async function createEvent(data: InsertEvent) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(events).values(data);
  return result[0].insertId;
}

export async function getUpcomingEvents(limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(events)
    .where(and(eq(events.isApproved, true), sql`${events.eventDate} >= NOW()`))
    .orderBy(asc(events.eventDate))
    .limit(limit);
}

export async function getAllEvents(limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(events)
    .orderBy(desc(events.eventDate))
    .limit(limit).offset(offset);
}

export async function updateEvent(id: number, data: Partial<InsertEvent>) {
  const db = await getDb();
  if (!db) return;
  await db.update(events).set(data).where(eq(events.id, id));
}

export async function deleteEvent(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(events).where(eq(events.id, id));
}

// ============ JOBS FUNCTIONS ============

export async function createJob(data: InsertJob) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(jobs).values(data);
  return result[0].insertId;
}

export async function getActiveJobs(limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(jobs)
    .where(eq(jobs.status, "active"))
    .orderBy(desc(jobs.createdAt))
    .limit(limit).offset(offset);
}

export async function getAllJobs(limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(jobs)
    .orderBy(desc(jobs.createdAt))
    .limit(limit).offset(offset);
}

export async function updateJob(id: number, data: Partial<InsertJob>) {
  const db = await getDb();
  if (!db) return;
  await db.update(jobs).set(data).where(eq(jobs.id, id));
}

export async function deleteJob(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(jobs).set({ status: "removed" }).where(eq(jobs.id, id));
}

// ============ EXPORT FUNCTIONS ============

export async function exportThreadsData() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(threads).where(eq(threads.isDeleted, false));
}

export async function exportPostsData() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(posts).where(eq(posts.isDeleted, false));
}

export async function exportUsersData() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    role: users.role,
    createdAt: users.createdAt,
    lastSignedIn: users.lastSignedIn,
  }).from(users);
}

// ============ BACKUP NOTES AND LABELS ============

export async function updateBackupNotes(backupId: number, notes: string | null) {
  const db = await getDb();
  if (!db) return false;
  await db.update(backups).set({ notes }).where(eq(backups.id, backupId));
  return true;
}

export async function createBackupLabel(data: InsertBackupLabel) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(backupLabels).values(data);
  return { id: result[0].insertId, ...data };
}

export async function getAllBackupLabels() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(backupLabels).orderBy(asc(backupLabels.name));
}

export async function getBackupLabelById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(backupLabels).where(eq(backupLabels.id, id)).limit(1);
  return result[0] || null;
}

export async function updateBackupLabel(id: number, data: Partial<InsertBackupLabel>) {
  const db = await getDb();
  if (!db) return false;
  await db.update(backupLabels).set(data).where(eq(backupLabels.id, id));
  return true;
}

export async function deleteBackupLabel(id: number) {
  const db = await getDb();
  if (!db) return false;
  // First remove all assignments for this label
  await db.delete(backupLabelAssignments).where(eq(backupLabelAssignments.labelId, id));
  // Then delete the label
  await db.delete(backupLabels).where(eq(backupLabels.id, id));
  return true;
}

export async function assignLabelToBackup(backupId: number, labelId: number, assignedById: number) {
  const db = await getDb();
  if (!db) return false;
  // Check if already assigned
  const existing = await db.select()
    .from(backupLabelAssignments)
    .where(and(
      eq(backupLabelAssignments.backupId, backupId),
      eq(backupLabelAssignments.labelId, labelId)
    ))
    .limit(1);
  if (existing.length > 0) return true; // Already assigned
  await db.insert(backupLabelAssignments).values({ backupId, labelId, assignedById });
  return true;
}

export async function removeLabelFromBackup(backupId: number, labelId: number) {
  const db = await getDb();
  if (!db) return false;
  await db.delete(backupLabelAssignments).where(and(
    eq(backupLabelAssignments.backupId, backupId),
    eq(backupLabelAssignments.labelId, labelId)
  ));
  return true;
}

export async function getLabelsForBackup(backupId: number) {
  const db = await getDb();
  if (!db) return [];
  const assignments = await db.select({
    labelId: backupLabelAssignments.labelId,
  }).from(backupLabelAssignments).where(eq(backupLabelAssignments.backupId, backupId));
  
  if (assignments.length === 0) return [];
  
  const labelIds = assignments.map(a => a.labelId);
  return db.select().from(backupLabels).where(inArray(backupLabels.id, labelIds));
}

export async function getBackupsByLabel(labelId: number) {
  const db = await getDb();
  if (!db) return [];
  const assignments = await db.select({
    backupId: backupLabelAssignments.backupId,
  }).from(backupLabelAssignments).where(eq(backupLabelAssignments.labelId, labelId));
  
  if (assignments.length === 0) return [];
  
  const backupIds = assignments.map(a => a.backupId);
  return db.select().from(backups).where(inArray(backups.id, backupIds)).orderBy(desc(backups.createdAt));
}
