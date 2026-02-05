'use client';

import { Result, Button, Typography, Flex } from 'antd';
import Link from 'next/link';
import { SESSION_ID_MAX_LENGTH } from '@/app/lib/validation/session';

const { Paragraph, Text } = Typography;

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
    <Flex
      align="center"
      justify="center"
      style={{ minHeight: '100vh', padding: 24 }}
    >
      <Result
        status="error"
        title="Invalid Session ID"
        subTitle={errorMessage}
        extra={[
          <Link key="home" href="/">
            <Button type="primary">Go Home</Button>
          </Link>,
        ]}
      >
        <Flex vertical align="start">
          <Paragraph>
            <Text strong>Session ID provided: </Text>
            <Text code>{sanitizedSessionId}</Text>
          </Paragraph>
          <Paragraph>
            <Text strong>Valid session IDs:</Text>
          </Paragraph>
          <ul>
            <li>Can contain letters (a-z, A-Z), numbers (0-9), and hyphens (-)</li>
            <li>Must be between 1 and 100 characters</li>
            <li>Cannot contain spaces or special characters</li>
          </ul>
          <Paragraph>
            <Text type="secondary">
              Examples: <Text code>my-session</Text>, <Text code>climbing-night-2024</Text>,{' '}
              <Text code>MarcoSession1</Text>
            </Text>
          </Paragraph>
        </Flex>
      </Result>
    </Flex>
  );
}
