CREATE TABLE `google_connections` (
	`owner_id` text PRIMARY KEY NOT NULL,
	`account_sub` text NOT NULL,
	`email` text NOT NULL,
	`scopes` text NOT NULL,
	`tokens` text NOT NULL,
	`updated_at` text NOT NULL,
	`last_sync` text
);
--> statement-breakpoint
CREATE TABLE `google_oauth_states` (
	`hash` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`payload` text NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `mail_threads` (
	`owner_id` text NOT NULL,
	`id` text NOT NULL,
	`client_id` text NOT NULL,
	`project_id` text DEFAULT '' NOT NULL,
	`archived` integer DEFAULT 0 NOT NULL,
	`data` text NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`owner_id`, `id`)
);
--> statement-breakpoint
CREATE TABLE `provider_operations` (
	`owner_id` text NOT NULL,
	`id` text NOT NULL,
	`hash` text NOT NULL,
	`status` text NOT NULL,
	`result` text NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`owner_id`, `id`)
);
