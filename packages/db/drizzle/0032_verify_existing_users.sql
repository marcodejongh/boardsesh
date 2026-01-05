-- Mark all existing users with credentials as verified
-- This ensures users who registered before email verification was required can still log in
-- We use created_at as the verification timestamp for existing users

UPDATE users
SET email_verified = created_at
WHERE email_verified IS NULL
  AND id IN (
    SELECT user_id FROM user_credentials
  );
