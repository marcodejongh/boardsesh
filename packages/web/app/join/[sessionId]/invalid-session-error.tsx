'use client';

import { Result, Button, Typography } from 'antd';
import Link from 'next/link';

const { Paragraph, Text } = Typography;

interface InvalidSessionErrorProps {
  sessionId: string;
  errorMessage: string;
}

export default function InvalidSessionError({ sessionId, errorMessage }: InvalidSessionErrorProps) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
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
        <div style={{ textAlign: 'left' }}>
          <Paragraph>
            <Text strong>Session ID provided: </Text>
            <Text code>{sessionId}</Text>
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
        </div>
      </Result>
    </div>
  );
}
