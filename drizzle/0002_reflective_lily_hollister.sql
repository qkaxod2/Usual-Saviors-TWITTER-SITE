CREATE TABLE `receipts` (
	`key` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`digest` text NOT NULL,
	`response` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `notifications` ADD `post_id` text REFERENCES posts(id) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `notifications` ADD `action_id` text REFERENCES actions(id) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `notifications` ADD `notice_id` text REFERENCES notices(id) ON DELETE CASCADE;
