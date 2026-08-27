CREATE TABLE `attachments` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`kind` text DEFAULT 'proposta' NOT NULL,
	`title` text NOT NULL,
	`file_name` text NOT NULL,
	`mime_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`storage_key` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `attachments_client_idx` ON `attachments` (`client_id`);--> statement-breakpoint
ALTER TABLE `clients` ADD `attendance` text DEFAULT 'presencial' NOT NULL;--> statement-breakpoint
ALTER TABLE `clients` ADD `credit_cents` integer;--> statement-breakpoint
ALTER TABLE `clients` ADD `adesao_cents` integer;--> statement-breakpoint
ALTER TABLE `clients` ADD `analysis_started_at` text;--> statement-breakpoint
ALTER TABLE `clients` ADD `approved_at` text;--> statement-breakpoint
ALTER TABLE `clients` ADD `closed_at` text;--> statement-breakpoint
ALTER TABLE `clients` ADD `lost_at` text;--> statement-breakpoint
ALTER TABLE `clients` ADD `lost_reason` text;--> statement-breakpoint
CREATE INDEX `clients_approved_idx` ON `clients` (`approved_at`);--> statement-breakpoint
UPDATE `clients` SET `status` = 'atendido' WHERE `status` = 'visitou';--> statement-breakpoint
UPDATE `clients` SET `approved_at` = COALESCE(`approved_at`, `updated_at`), `closed_at` = COALESCE(`closed_at`, `updated_at`) WHERE `status` = 'fechou';--> statement-breakpoint
UPDATE `clients` SET `lost_at` = COALESCE(`lost_at`, `updated_at`) WHERE `status` = 'perdido';
