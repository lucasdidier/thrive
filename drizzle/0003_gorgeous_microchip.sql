CREATE TABLE `form_uploads` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`form_id` text NOT NULL,
	`question_id` text NOT NULL,
	`request_id` text NOT NULL,
	`share_id` text NOT NULL,
	`form_revision` text NOT NULL,
	`name` text NOT NULL,
	`size` integer NOT NULL,
	`object_key` text NOT NULL,
	`status` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `form_uploads_owner` ON `form_uploads` (`owner_id`,`created_at`);