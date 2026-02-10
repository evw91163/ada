CREATE TABLE `backup_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`backupId` int NOT NULL,
	`itemType` enum('table','file','config') NOT NULL,
	`itemName` varchar(255) NOT NULL,
	`itemSize` bigint NOT NULL DEFAULT 0,
	`recordCount` int,
	`storageKey` text,
	`checksum` varchar(64),
	`status` enum('pending','completed','failed','skipped') NOT NULL DEFAULT 'pending',
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `backup_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `backup_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`settingKey` varchar(100) NOT NULL,
	`settingValue` text NOT NULL,
	`description` text,
	`updatedById` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `backup_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `backup_settings_settingKey_unique` UNIQUE(`settingKey`)
);
--> statement-breakpoint
CREATE TABLE `backups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`backupType` enum('full','database','files','incremental','pre_update') NOT NULL DEFAULT 'full',
	`triggerType` enum('manual','automatic','pre_update','scheduled') NOT NULL DEFAULT 'manual',
	`status` enum('pending','in_progress','completed','failed','deleted') NOT NULL DEFAULT 'pending',
	`totalSize` bigint NOT NULL DEFAULT 0,
	`fileCount` int NOT NULL DEFAULT 0,
	`tableCount` int NOT NULL DEFAULT 0,
	`storageLocation` text,
	`checksum` varchar(64),
	`createdById` int NOT NULL,
	`completedAt` timestamp,
	`expiresAt` timestamp,
	`errorMessage` text,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `backups_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rollbacks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`backupId` int NOT NULL,
	`rollbackType` enum('full','database','files','partial') NOT NULL DEFAULT 'full',
	`status` enum('pending','in_progress','completed','failed','cancelled') NOT NULL DEFAULT 'pending',
	`itemsRestored` int NOT NULL DEFAULT 0,
	`itemsFailed` int NOT NULL DEFAULT 0,
	`initiatedById` int NOT NULL,
	`completedAt` timestamp,
	`errorMessage` text,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rollbacks_id` PRIMARY KEY(`id`)
);
