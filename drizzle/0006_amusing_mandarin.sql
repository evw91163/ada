CREATE TABLE `backup_activity_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`activityType` enum('backup_created','backup_deleted','backup_restored','integrity_check','retention_cleanup','backup_downloaded','label_assigned','label_removed','notes_updated','schedule_changed') NOT NULL,
	`backupId` int,
	`backupName` varchar(255),
	`userId` int NOT NULL,
	`userName` varchar(255),
	`details` text,
	`status` enum('success','failed','warning') NOT NULL DEFAULT 'success',
	`ipAddress` varchar(45),
	`userAgent` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `backup_activity_logs_id` PRIMARY KEY(`id`)
);
