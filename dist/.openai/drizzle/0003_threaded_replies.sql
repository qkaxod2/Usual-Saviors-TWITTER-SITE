-- Keep existing parent links and expose only conversations with active ancestors.
CREATE VIEW visible_posts AS
WITH RECURSIVE conversation AS (
 SELECT p.*,p.id AS root_id FROM posts p JOIN users u ON u.id=p.user_id
 WHERE p.parent_id IS NULL AND u.status='active'
 UNION ALL
 SELECT p.*,conversation.root_id FROM posts p JOIN conversation ON p.parent_id=conversation.id
 JOIN users u ON u.id=p.user_id WHERE u.status='active'
)
SELECT * FROM conversation;
--> statement-breakpoint
CREATE TRIGGER posts_delete_descendants BEFORE DELETE ON posts BEGIN
 DELETE FROM posts WHERE id IN (
  WITH RECURSIVE descendants(id) AS (
   SELECT id FROM posts WHERE parent_id=OLD.id
   UNION ALL SELECT p.id FROM posts p JOIN descendants d ON p.parent_id=d.id
  ) SELECT id FROM descendants
 );
END;
