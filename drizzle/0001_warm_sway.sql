CREATE TABLE `share_links` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`share_id` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `share_links_owner` ON `share_links` (`owner_id`);