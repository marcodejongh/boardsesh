'use client';

import MuiButton from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Link from 'next/link';
import { SESSION_ID_MAX_LENGTH } from '@/app/lib/validation/session';
import { ResultPage } from '@/app/components/ui/result-page';

// Typography destructuring removed - using MUI Typography directly

interface InvalidSessionErrorProps {
  sessionId: string;
  errorMessage: string;
}

/**
 * Sanitizes a session ID for safe display.
 * Removes any characters that don't match the allowed pattern and truncates if needed.
 * This provides defense-in-depth even though React already escapes HTML entities.
 */
function sanitizeSessionIdForDisplay(sessionId: string): string {
  // Remove any characters that aren't alphanumeric or hyphens
  const sanitized = sessionId.replace(/[^a-zA-Z0-9-]/g, '');
  // Truncate to max length with ellipsis if needed
  if (sanitized.length > SESSION_ID_MAX_LENGTH) {
    return sanitized.slice(0, SESSION_ID_MAX_LENGTH) + '…';
  }
  return sanitized || '(empty)';
}

export default function InvalidSessionError({ sessionId, errorMessage }: InvalidSessionErrorProps) {
  const sanitizedSessionId = sanitizeSessionIdForDisplay(sessionId);

  return (
    <Box
      sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 3 }}
    >
      <ResultPage
        status="error"
        title="Invalid Session ID"
        subTitle={errorMessage}
        extra={
          <Link href="/">
            <MuiButton variant="contained">Go Home</MuiButton>
          </Link>
        }
      />
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', mt: 2 }}>
        <Typography variant="body1" component="p">
          <Typography variant="body2" component="span" fontWeight={600}>Session ID provided: </Typography>
          <code>{sanitizedSessionId}</code>
        </Typography>
        <Typography variant="body1" component="p">
          <Typography variant="body2" component="span" fontWeight={600}>Valid session IDs:</Typography>
        </Typography>
        <ul>
          <li>Can contain letters (a-z, A-Z), numbers (0-9), and hyphens (-)</li>
          <li>Must be between 1 and 100 characters</li>
          <li>Cannot contain spaces or special characters</li>
        </ul>
        <Typography variant="body1" component="p">
          <Typography variant="body2" component="span" color="text.secondary">
            Examples: <code>my-session</code>, <code>climbing-night-2024</code>,{' '}
            <code>MarcoSession1</code>
          </Typography>
        </Typography>
      </Box>
    </Box>
  );
}
