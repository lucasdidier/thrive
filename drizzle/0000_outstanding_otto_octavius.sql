CREATE TABLE `events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_id` text NOT NULL,
	`revision` integer NOT NULL,
	`type` text NOT NULL,
	`entity` text NOT NULL,
	`record_id` text NOT NULL,
	`detail` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `events_owner_cursor` ON `events` (`owner_id`,`id`);--> statement-breakpoint
CREATE TABLE `receipts` (
	`owner_id` text NOT NULL,
	`request_id` text NOT NULL,
	`hash` text NOT NULL,
	`result` text NOT NULL,
	PRIMARY KEY(`owner_id`, `request_id`)
);
--> statement-breakpoint
CREATE TABLE `workspaces` (
	`owner_id` text PRIMARY KEY NOT NULL,
	`revision` integer NOT NULL,
	`state` blob NOT NULL,
	`commit_token` text NOT NULL,
	`updated_at` text NOT NULL
);
