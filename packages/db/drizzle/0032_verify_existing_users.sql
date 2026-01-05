-- Mark all existing users with credentials as verified
-- This ensures users who registered before email verification was required can still log in
-- Uses NOW() as the verification timestamp since created_at column may not exist in all environments

UPDATE users
SET "emailVerified" = NOW()
WHERE "emailVerified" IS NULL
  AND id IN (
    SELECT user_id FROM user_credentials
  );
