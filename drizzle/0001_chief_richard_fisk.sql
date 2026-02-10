CREATE TABLE `advertisements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`imageUrl` text,
	`linkUrl` text,
	`authorId` int NOT NULL,
	`status` enum('pending','active','expired','rejected') NOT NULL DEFAULT 'pending',
	`startDate` timestamp,
	`endDate` timestamp,
	`impressions` int NOT NULL DEFAULT 0,
	`clicks` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `advertisements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `articles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`slug` varchar(300) NOT NULL,
	`content` text NOT NULL,
	`excerpt` text,
	`authorId` int NOT NULL,
	`featuredImageUrl` text,
	`isPublished` boolean NOT NULL DEFAULT false,
	`publishedAt` timestamp,
	`viewCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `articles_id` PRIMARY KEY(`id`),
	CONSTRAINT `articles_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`description` text,
	`color` varchar(7) NOT NULL DEFAULT '#F97316',
	`icon` varchar(50) NOT NULL DEFAULT 'MessageCircle',
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `categories_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `category_subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`categoryId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `category_subscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `discounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`code` varchar(50),
	`discountType` varchar(50),
	`businessName` varchar(255),
	`location` varchar(255),
	`linkUrl` text,
	`authorId` int NOT NULL,
	`isVerified` boolean NOT NULL DEFAULT false,
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `discounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`location` varchar(255),
	`address` text,
	`eventDate` timestamp NOT NULL,
	`endDate` timestamp,
	`imageUrl` text,
	`linkUrl` text,
	`authorId` int NOT NULL,
	`isApproved` boolean NOT NULL DEFAULT false,
	`attendeeCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`company` varchar(255),
	`location` varchar(255),
	`jobType` enum('full_time','part_time','contract','temporary','volunteer') NOT NULL DEFAULT 'full_time',
	`salary` varchar(100),
	`contactEmail` varchar(320),
	`applicationUrl` text,
	`authorId` int NOT NULL,
	`status` enum('active','filled','expired','removed') NOT NULL DEFAULT 'active',
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `jobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `links` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`url` text NOT NULL,
	`description` text,
	`category` varchar(100),
	`authorId` int NOT NULL,
	`isApproved` boolean NOT NULL DEFAULT false,
	`clickCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `links_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `listings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`price` varchar(50),
	`location` varchar(255),
	`contactInfo` text,
	`imageUrl` text,
	`authorId` int NOT NULL,
	`listingType` enum('for_sale','wanted','free') NOT NULL DEFAULT 'for_sale',
	`status` enum('active','sold','expired','removed') NOT NULL DEFAULT 'active',
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `listings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('reply','thread_update','new_thread','mention') NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`relatedThreadId` int,
	`relatedPostId` int,
	`isRead` boolean NOT NULL DEFAULT false,
	`emailSent` boolean NOT NULL DEFAULT false,
	`emailSentAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `posts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`threadId` int NOT NULL,
	`authorId` int NOT NULL,
	`content` text NOT NULL,
	`parentPostId` int,
	`isDeleted` boolean NOT NULL DEFAULT false,
	`isEdited` boolean NOT NULL DEFAULT false,
	`editedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `posts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reporterId` int NOT NULL,
	`contentType` enum('thread','post') NOT NULL,
	`contentId` int NOT NULL,
	`reason` text NOT NULL,
	`status` enum('pending','reviewed','resolved','dismissed') NOT NULL DEFAULT 'pending',
	`resolvedById` int,
	`resolvedAt` timestamp,
	`adminNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(50) NOT NULL,
	`slug` varchar(50) NOT NULL,
	`color` varchar(7) NOT NULL DEFAULT '#6B7280',
	`usageCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tags_id` PRIMARY KEY(`id`),
	CONSTRAINT `tags_name_unique` UNIQUE(`name`),
	CONSTRAINT `tags_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `thread_subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`threadId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `thread_subscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `thread_tags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`threadId` int NOT NULL,
	`tagId` int NOT NULL,
	CONSTRAINT `thread_tags_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `threads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`slug` varchar(300) NOT NULL,
	`content` text NOT NULL,
	`categoryId` int NOT NULL,
	`authorId` int NOT NULL,
	`isPinned` boolean NOT NULL DEFAULT false,
	`isLocked` boolean NOT NULL DEFAULT false,
	`isDeleted` boolean NOT NULL DEFAULT false,
	`viewCount` int NOT NULL DEFAULT 0,
	`replyCount` int NOT NULL DEFAULT 0,
	`lastReplyAt` timestamp,
	`lastReplyById` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `threads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `bio` text;--> statement-breakpoint
ALTER TABLE `users` ADD `avatarUrl` text;--> statement-breakpoint
ALTER TABLE `users` ADD `emailOnReply` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `emailOnThreadUpdate` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `emailOnNewThread` boolean DEFAULT false NOT NULL;