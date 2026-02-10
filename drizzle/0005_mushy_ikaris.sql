CREATE TABLE `backup_label_assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`backupId` int NOT NULL,
	`labelId` int NOT NULL,
	`assignedById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `backup_label_assignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `backup_labels` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(50) NOT NULL,
	`color` varchar(7) NOT NULL DEFAULT '#6B7280',
	`description` text,
	`createdById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `backup_labels_id` PRIMARY KEY(`id`),
	CONSTRAINT `backup_labels_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
ALTER TABLE `backups` ADD `notes` text;