CREATE TABLE `goals` (
	`period_key` text PRIMARY KEY NOT NULL,
	`target_cents` integer NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `appointments` ADD `duration_minutes` integer DEFAULT 60 NOT NULL;--> statement-breakpoint
ALTER TABLE `leaders` ADD `photo_key` text;--> statement-breakpoint
CREATE INDEX `clients_closed_idx` ON `clients` (`closed_at`);