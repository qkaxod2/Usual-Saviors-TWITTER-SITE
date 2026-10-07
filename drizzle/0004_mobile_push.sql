CREATE TABLE push_subscriptions (
 id TEXT PRIMARY KEY NOT NULL,
 endpoint TEXT NOT NULL UNIQUE,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 session_hash TEXT NOT NULL REFERENCES sessions(token_hash) ON DELETE CASCADE,
 p256dh TEXT NOT NULL,
 auth TEXT NOT NULL,
 created_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE INDEX push_subscriptions_user ON push_subscriptions(user_id);
--> statement-breakpoint
CREATE TABLE push_deliveries (
 notification_id TEXT NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
 subscription_id TEXT NOT NULL REFERENCES push_subscriptions(id) ON DELETE CASCADE,
 created_at INTEGER NOT NULL,
 attempts INTEGER NOT NULL DEFAULT 0,
 lease_until INTEGER NOT NULL DEFAULT 0,
 delivered_at INTEGER,
 last_error TEXT,
 PRIMARY KEY(notification_id,subscription_id)
);
--> statement-breakpoint
CREATE TRIGGER queue_notification_push AFTER INSERT ON notifications BEGIN
 INSERT INTO push_deliveries(notification_id,subscription_id,created_at)
 SELECT NEW.id,p.id,NEW.created_at FROM push_subscriptions p
 JOIN sessions s ON s.token_hash=p.session_hash
 WHERE p.user_id=NEW.user_id AND s.expires_at>NEW.created_at;
END;
