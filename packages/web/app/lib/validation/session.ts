import { z } from 'zod';

/**
 * Maximum length for session names (user-defined session names)
 * Keep in sync with backend SessionNameSchema
 */
export const SESSION_NAME_MAX_LENGTH = 100;

/**
 * Maximum length for session IDs
 * Allows UUIDs (36 chars) and custom alphanumeric IDs with hyphens
 */
export const SESSION_ID_MAX_LENGTH = 100;

/**
 * Session ID validation schema
 * Allows UUIDs and alphanumeric strings with hyphens (for custom session names)
 *
 * Valid formats:
 * - UUIDs: "550e8400-e29b-41d4-a716-446655440000"
 * - Custom names: "my-session", "climbing-night-2024", "MarcoSession1"
 *
 * Invalid:
 * - Empty strings
 * - Strings over 100 characters
 * - Special characters (except hyphens): "my session!", "test@123"
 */
export const SessionIdSchema = z
  .string()
  .min(1, 'Session ID cannot be empty')
  .max(SESSION_ID_MAX_LENGTH, `Session ID must be ${SESSION_ID_MAX_LENGTH} characters or less`)
  .regex(
    /^[a-zA-Z0-9-]+$/,
    'Session ID can only contain letters, numbers, and hyphens'
  );

/**
 * Session name validation schema (for user-defined session names)
 * More permissive than session ID - allows spaces and common punctuation
 *
 * Valid formats:
 * - "Marco's Climbing Night"
 * - "Tuesday Board Session"
 * - "Kilter @ The Gym"
 */
export const SessionNameSchema = z
  .string()
  .max(SESSION_NAME_MAX_LENGTH, `Session name must be ${SESSION_NAME_MAX_LENGTH} characters or less`)
  .optional();

/**
 * Type for validated session ID
 */
export type ValidSessionId = z.infer<typeof SessionIdSchema>;

/**
 * Type for validated session name
 */
export type ValidSessionName = z.infer<typeof SessionNameSchema>;

/**
 * Validate a session ID and return a result object
 * Useful for form validation where you want to show errors to the user
 */
export function validateSessionId(sessionId: unknown): {
  success: boolean;
  data?: ValidSessionId;
  error?: string;
} {
  const result = SessionIdSchema.safeParse(sessionId);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    error: result.error.issues[0]?.message || 'Invalid session ID',
  };
}

/**
 * Validate a session name and return a result object
 */
export function validateSessionName(sessionName: unknown): {
  success: boolean;
  data?: ValidSessionName;
  error?: string;
} {
  const result = SessionNameSchema.safeParse(sessionName);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    error: result.error.issues[0]?.message || 'Invalid session name',
  };
}
