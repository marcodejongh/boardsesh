-- Seed admin role for marco@sent.com
INSERT INTO community_roles (user_id, role, board_type, granted_by, created_at)
SELECT u.id, 'admin', NULL, u.id, NOW()
FROM users u
WHERE u.email = 'marco@sent.com'
  AND NOT EXISTS (
    SELECT 1 FROM community_roles cr
    WHERE cr.user_id = u.id AND cr.role = 'admin' AND cr.board_type IS NULL
  );
