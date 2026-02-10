-- Add proposal_created notification type
ALTER TYPE "public"."notification_type" ADD VALUE IF NOT EXISTS 'proposal_created';
