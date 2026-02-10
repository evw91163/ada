import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, json, decimal, bigint } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  // Required fields for local registration
  username: varchar("username", { length: 50 }).unique(),
  passwordHash: varchar("passwordHash", { length: 255 }),
  // Basic info
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "moderator", "admin"]).default("user").notNull(),
  bio: text("bio"),
  avatarUrl: text("avatarUrl"),
  // Optional profile fields
  firstName: varchar("firstName", { length: 100 }),
  lastName: varchar("lastName", { length: 100 }),
  phone: varchar("phone", { length: 20 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 50 }),
  zipCode: varchar("zipCode", { length: 20 }),
  // Business information
  donutShopName: varchar("donutShopName", { length: 255 }),
  yearsInBusiness: int("yearsInBusiness"),
  numberOfStores: int("numberOfStores"),
  grossMonthlyIncome: decimal("grossMonthlyIncome", { precision: 15, scale: 2 }),
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  // Notification preferences
  emailOnReply: boolean("emailOnReply").default(true).notNull(),
  emailOnThreadUpdate: boolean("emailOnThreadUpdate").default(true).notNull(),
  emailOnNewThread: boolean("emailOnNewThread").default(false).notNull(),
  // Password change requirement
  mustChangePassword: boolean("mustChangePassword").default(false).notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Forum categories for organizing discussions
 */
export const categories = mysqlTable("categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  description: text("description"),
  color: varchar("color", { length: 7 }).default("#F97316").notNull(),
  icon: varchar("icon", { length: 50 }).default("MessageCircle").notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Category = typeof categories.$inferSelect;
export type InsertCategory = typeof categories.$inferInsert;

/**
 * Forum threads (topics)
 */
export const threads = mysqlTable("threads", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 300 }).notNull(),
  content: text("content").notNull(),
  categoryId: int("categoryId").notNull(),
  authorId: int("authorId").notNull(),
  isPinned: boolean("isPinned").default(false).notNull(),
  isLocked: boolean("isLocked").default(false).notNull(),
  isDeleted: boolean("isDeleted").default(false).notNull(),
  viewCount: int("viewCount").default(0).notNull(),
  replyCount: int("replyCount").default(0).notNull(),
  lastReplyAt: timestamp("lastReplyAt"),
  lastReplyById: int("lastReplyById"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Thread = typeof threads.$inferSelect;
export type InsertThread = typeof threads.$inferInsert;

/**
 * Thread tags for additional categorization
 */
export const tags = mysqlTable("tags", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 50 }).notNull().unique(),
  slug: varchar("slug", { length: 50 }).notNull().unique(),
  color: varchar("color", { length: 7 }).default("#6B7280").notNull(),
  usageCount: int("usageCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Tag = typeof tags.$inferSelect;
export type InsertTag = typeof tags.$inferInsert;

/**
 * Thread-tag relationship
 */
export const threadTags = mysqlTable("thread_tags", {
  id: int("id").autoincrement().primaryKey(),
  threadId: int("threadId").notNull(),
  tagId: int("tagId").notNull(),
});

export type ThreadTag = typeof threadTags.$inferSelect;
export type InsertThreadTag = typeof threadTags.$inferInsert;

/**
 * Posts (replies to threads)
 */
export const posts = mysqlTable("posts", {
  id: int("id").autoincrement().primaryKey(),
  threadId: int("threadId").notNull(),
  authorId: int("authorId").notNull(),
  content: text("content").notNull(),
  parentPostId: int("parentPostId"), // For nested replies
  isDeleted: boolean("isDeleted").default(false).notNull(),
  isEdited: boolean("isEdited").default(false).notNull(),
  editedAt: timestamp("editedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Post = typeof posts.$inferSelect;
export type InsertPost = typeof posts.$inferInsert;

/**
 * Category subscriptions for notifications
 */
export const categorySubscriptions = mysqlTable("category_subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  categoryId: int("categoryId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CategorySubscription = typeof categorySubscriptions.$inferSelect;
export type InsertCategorySubscription = typeof categorySubscriptions.$inferInsert;

/**
 * Thread subscriptions for notifications
 */
export const threadSubscriptions = mysqlTable("thread_subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  threadId: int("threadId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ThreadSubscription = typeof threadSubscriptions.$inferSelect;
export type InsertThreadSubscription = typeof threadSubscriptions.$inferInsert;

/**
 * Reported content for moderation
 */
export const reports = mysqlTable("reports", {
  id: int("id").autoincrement().primaryKey(),
  reporterId: int("reporterId").notNull(),
  contentType: mysqlEnum("contentType", ["thread", "post"]).notNull(),
  contentId: int("contentId").notNull(),
  reason: text("reason").notNull(),
  status: mysqlEnum("status", ["pending", "reviewed", "resolved", "dismissed"]).default("pending").notNull(),
  resolvedById: int("resolvedById"),
  resolvedAt: timestamp("resolvedAt"),
  adminNotes: text("adminNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Report = typeof reports.$inferSelect;
export type InsertReport = typeof reports.$inferInsert;

/**
 * Notification queue for email notifications
 */
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", ["reply", "thread_update", "new_thread", "mention"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  relatedThreadId: int("relatedThreadId"),
  relatedPostId: int("relatedPostId"),
  isRead: boolean("isRead").default(false).notNull(),
  emailSent: boolean("emailSent").default(false).notNull(),
  emailSentAt: timestamp("emailSentAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

/**
 * Links page content
 */
export const links = mysqlTable("links", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  url: text("url").notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }),
  authorId: int("authorId").notNull(),
  isApproved: boolean("isApproved").default(false).notNull(),
  clickCount: int("clickCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Link = typeof links.$inferSelect;
export type InsertLink = typeof links.$inferInsert;

/**
 * For Sale listings
 */
export const listings = mysqlTable("listings", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  price: varchar("price", { length: 50 }),
  location: varchar("location", { length: 255 }),
  contactInfo: text("contactInfo"),
  imageUrl: text("imageUrl"),
  authorId: int("authorId").notNull(),
  listingType: mysqlEnum("listingType", ["for_sale", "wanted", "free"]).default("for_sale").notNull(),
  status: mysqlEnum("status", ["active", "sold", "expired", "removed"]).default("active").notNull(),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Listing = typeof listings.$inferSelect;
export type InsertListing = typeof listings.$inferInsert;

/**
 * Articles
 */
export const articles = mysqlTable("articles", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 300 }).notNull().unique(),
  content: text("content").notNull(),
  excerpt: text("excerpt"),
  authorId: int("authorId").notNull(),
  featuredImageUrl: text("featuredImageUrl"),
  isPublished: boolean("isPublished").default(false).notNull(),
  publishedAt: timestamp("publishedAt"),
  viewCount: int("viewCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Article = typeof articles.$inferSelect;
export type InsertArticle = typeof articles.$inferInsert;

/**
 * Advertisements
 */
export const advertisements = mysqlTable("advertisements", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  imageUrl: text("imageUrl"),
  linkUrl: text("linkUrl"),
  authorId: int("authorId").notNull(),
  status: mysqlEnum("status", ["pending", "active", "expired", "rejected"]).default("pending").notNull(),
  startDate: timestamp("startDate"),
  endDate: timestamp("endDate"),
  impressions: int("impressions").default(0).notNull(),
  clicks: int("clicks").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Advertisement = typeof advertisements.$inferSelect;
export type InsertAdvertisement = typeof advertisements.$inferInsert;

/**
 * Discounts/Deals
 */
export const discounts = mysqlTable("discounts", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  code: varchar("code", { length: 50 }),
  discountType: varchar("discountType", { length: 50 }),
  businessName: varchar("businessName", { length: 255 }),
  location: varchar("location", { length: 255 }),
  linkUrl: text("linkUrl"),
  authorId: int("authorId").notNull(),
  isVerified: boolean("isVerified").default(false).notNull(),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Discount = typeof discounts.$inferSelect;
export type InsertDiscount = typeof discounts.$inferInsert;

/**
 * Events
 */
export const events = mysqlTable("events", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  location: varchar("location", { length: 255 }),
  address: text("address"),
  eventDate: timestamp("eventDate").notNull(),
  endDate: timestamp("endDate"),
  imageUrl: text("imageUrl"),
  linkUrl: text("linkUrl"),
  authorId: int("authorId").notNull(),
  isApproved: boolean("isApproved").default(false).notNull(),
  attendeeCount: int("attendeeCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Event = typeof events.$inferSelect;
export type InsertEvent = typeof events.$inferInsert;

/**
 * Help Wanted / Job postings
 */
export const jobs = mysqlTable("jobs", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  company: varchar("company", { length: 255 }),
  location: varchar("location", { length: 255 }),
  jobType: mysqlEnum("jobType", ["full_time", "part_time", "contract", "temporary", "volunteer"]).default("full_time").notNull(),
  salary: varchar("salary", { length: 100 }),
  contactEmail: varchar("contactEmail", { length: 320 }),
  applicationUrl: text("applicationUrl"),
  authorId: int("authorId").notNull(),
  status: mysqlEnum("status", ["active", "filled", "expired", "removed"]).default("active").notNull(),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Job = typeof jobs.$inferSelect;
export type InsertJob = typeof jobs.$inferInsert;


/**
 * System backups for tracking backup history
 */
export const backups = mysqlTable("backups", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  backupType: mysqlEnum("backupType", ["full", "database", "files", "incremental", "pre_update"]).default("full").notNull(),
  triggerType: mysqlEnum("triggerType", ["manual", "automatic", "pre_update", "scheduled"]).default("manual").notNull(),
  status: mysqlEnum("status", ["pending", "in_progress", "completed", "failed", "deleted"]).default("pending").notNull(),
  totalSize: bigint("totalSize", { mode: "number" }).default(0).notNull(),
  fileCount: int("fileCount").default(0).notNull(),
  tableCount: int("tableCount").default(0).notNull(),
  storageLocation: text("storageLocation"), // S3 path or local path
  checksum: varchar("checksum", { length: 64 }), // SHA-256 hash for integrity
  createdById: int("createdById").notNull(),
  completedAt: timestamp("completedAt"),
  expiresAt: timestamp("expiresAt"),
  errorMessage: text("errorMessage"),
  metadata: text("metadata"), // JSON string with additional info
  notes: text("notes"), // Admin notes for this backup
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Backup = typeof backups.$inferSelect;
export type InsertBackup = typeof backups.$inferInsert;

/**
 * Individual backup items (tables, files) within a backup
 */
export const backupItems = mysqlTable("backup_items", {
  id: int("id").autoincrement().primaryKey(),
  backupId: int("backupId").notNull(),
  itemType: mysqlEnum("itemType", ["table", "file", "config"]).notNull(),
  itemName: varchar("itemName", { length: 255 }).notNull(), // Table name or file path
  itemSize: bigint("itemSize", { mode: "number" }).default(0).notNull(),
  recordCount: int("recordCount"), // For tables
  storageKey: text("storageKey"), // S3 key or file path
  checksum: varchar("checksum", { length: 64 }),
  status: mysqlEnum("status", ["pending", "completed", "failed", "skipped"]).default("pending").notNull(),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type BackupItem = typeof backupItems.$inferSelect;
export type InsertBackupItem = typeof backupItems.$inferInsert;

/**
 * Rollback history for tracking restore operations
 */
export const rollbacks = mysqlTable("rollbacks", {
  id: int("id").autoincrement().primaryKey(),
  backupId: int("backupId").notNull(),
  rollbackType: mysqlEnum("rollbackType", ["full", "database", "files", "partial"]).default("full").notNull(),
  status: mysqlEnum("status", ["pending", "in_progress", "completed", "failed", "cancelled"]).default("pending").notNull(),
  itemsRestored: int("itemsRestored").default(0).notNull(),
  itemsFailed: int("itemsFailed").default(0).notNull(),
  initiatedById: int("initiatedById").notNull(),
  completedAt: timestamp("completedAt"),
  errorMessage: text("errorMessage"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Rollback = typeof rollbacks.$inferSelect;
export type InsertRollback = typeof rollbacks.$inferInsert;

/**
 * Backup settings and configuration
 */
export const backupSettings = mysqlTable("backup_settings", {
  id: int("id").autoincrement().primaryKey(),
  settingKey: varchar("settingKey", { length: 100 }).notNull().unique(),
  settingValue: text("settingValue").notNull(),
  description: text("description"),
  updatedById: int("updatedById"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BackupSetting = typeof backupSettings.$inferSelect;
export type InsertBackupSetting = typeof backupSettings.$inferInsert;

/**
 * Backup labels for categorizing backups
 */
export const backupLabels = mysqlTable("backup_labels", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 50 }).notNull().unique(),
  color: varchar("color", { length: 7 }).default("#6B7280").notNull(), // Hex color
  description: text("description"),
  createdById: int("createdById").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BackupLabel = typeof backupLabels.$inferSelect;
export type InsertBackupLabel = typeof backupLabels.$inferInsert;

/**
 * Many-to-many relationship between backups and labels
 */
export const backupLabelAssignments = mysqlTable("backup_label_assignments", {
  id: int("id").autoincrement().primaryKey(),
  backupId: int("backupId").notNull(),
  labelId: int("labelId").notNull(),
  assignedById: int("assignedById").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type BackupLabelAssignment = typeof backupLabelAssignments.$inferSelect;
export type InsertBackupLabelAssignment = typeof backupLabelAssignments.$inferInsert;

/**
 * Backup activity logs for tracking all backup-related operations
 */
export const backupActivityLogs = mysqlTable("backup_activity_logs", {
  id: int("id").autoincrement().primaryKey(),
  activityType: mysqlEnum("activityType", [
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
  ]).notNull(),
  backupId: int("backupId"), // Can be null for some activities like schedule changes
  backupName: varchar("backupName", { length: 255 }), // Store name for reference even if backup is deleted
  userId: int("userId").notNull(), // User who performed the action
  userName: varchar("userName", { length: 255 }), // Store name for reference
  details: text("details"), // JSON string with additional details
  status: mysqlEnum("status", ["success", "failed", "warning"]).default("success").notNull(),
  ipAddress: varchar("ipAddress", { length: 45 }), // IPv4 or IPv6
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type BackupActivityLog = typeof backupActivityLogs.$inferSelect;
export type InsertBackupActivityLog = typeof backupActivityLogs.$inferInsert;
