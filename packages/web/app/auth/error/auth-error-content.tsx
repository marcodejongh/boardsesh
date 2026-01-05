'use client';

import React from 'react';
import { Layout, Card, Typography, Button, Space, Alert } from 'antd';
import { CloseCircleOutlined } from '@ant-design/icons';
import { useSearchParams } from 'next/navigation';
import Logo from '@/app/components/brand/logo';
import BackButton from '@/app/components/back-button';
import { themeTokens } from '@/app/theme/theme-config';

const { Content, Header } = Layout;
const { Title } = Typography;

export default function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const getErrorMessage = () => {
    switch (error) {
      case 'Configuration':
        return 'There is a problem with the server configuration.';
      case 'AccessDenied':
        return 'Access denied. You do not have permission to sign in.';
      case 'Verification':
        return 'The verification link has expired or is invalid.';
      case 'OAuthSignin':
        return 'Error starting the sign-in flow. Please try again.';
      case 'OAuthCallback':
        return 'Error completing the sign-in. Please try again.';
      case 'OAuthCreateAccount':
        return 'Could not create an account with this provider.';
      case 'EmailCreateAccount':
        return 'Could not create an email account.';
      case 'Callback':
        return 'Error in the authentication callback.';
      case 'OAuthAccountNotLinked':
        return 'This email is already associated with another account. Please sign in using your original method.';
      case 'SessionRequired':
        return 'You must be signed in to access this page.';
      default:
        return 'An unexpected authentication error occurred.';
    }
  };

  return (
    <Layout style={{ minHeight: '100vh', background: themeTokens.semantic.background }}>
      <Header
        style={{
          background: themeTokens.semantic.surface,
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          boxShadow: themeTokens.shadows.xs,
        }}
      >
        <BackButton />
        <Logo size="sm" showText={false} />
        <Title level={4} style={{ margin: 0, flex: 1 }}>
          Authentication Error
        </Title>
      </Header>

      <Content
        style={{
          padding: '24px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          paddingTop: '48px',
        }}
      >
        <Card style={{ width: '100%', maxWidth: 400, textAlign: 'center' }}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <CloseCircleOutlined style={{ fontSize: 48, color: themeTokens.colors.error }} />
            <Title level={3}>Authentication Error</Title>
            <Alert type="error" message={getErrorMessage()} showIcon />
            <Button type="primary" href="/auth/login" block size="large">
              Back to Login
            </Button>
          </Space>
        </Card>
      </Content>
    </Layout>
  );
}
