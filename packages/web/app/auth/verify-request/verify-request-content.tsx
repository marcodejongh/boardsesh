'use client';

import React, { useState } from 'react';
import { Card, Typography, Button, Alert, Input, Form, message } from 'antd';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { MailOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useSearchParams } from 'next/navigation';
import Logo from '@/app/components/brand/logo';
import BackButton from '@/app/components/back-button';
import { themeTokens } from '@/app/theme/theme-config';

const { Title, Text, Paragraph } = Typography;

export default function VerifyRequestContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const [resendLoading, setResendLoading] = useState(false);
  const [form] = Form.useForm();

  const getErrorMessage = () => {
    switch (error) {
      case 'EmailNotVerified':
        return 'Please verify your email before signing in.';
      case 'InvalidToken':
        return 'The verification link is invalid. Please request a new one.';
      case 'TokenExpired':
        return 'The verification link has expired. Please request a new one.';
      case 'TooManyAttempts':
        return 'Too many verification attempts. Please wait a minute and try again.';
      default:
        return null;
    }
  };

  const handleResend = async () => {
    try {
      const values = await form.validateFields();
      setResendLoading(true);

      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: values.email }),
      });

      const data = await response.json();

      if (response.ok) {
        message.success('Verification email sent! Check your inbox.');
      } else {
        message.error(data.error || 'Failed to send verification email');
      }
    } catch (err) {
      console.error('Resend error:', err);
    } finally {
      setResendLoading(false);
    }
  };

  const errorMessage = getErrorMessage();

  return (
    <Box sx={{ minHeight: '100vh', background: themeTokens.semantic.background }}>
      <Box
        component="header"
        sx={{
          background: themeTokens.semantic.surface,
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          boxShadow: themeTokens.shadows.xs,
          height: 64,
        }}
      >
        <BackButton />
        <Logo size="sm" showText={false} />
        <Title level={4} style={{ margin: 0, flex: 1 }}>
          Email Verification
        </Title>
      </Box>

      <Box
        component="main"
        sx={{
          padding: '24px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          paddingTop: '48px',
        }}
      >
        <Card style={{ width: '100%', maxWidth: 400, textAlign: 'center' }}>
          <Stack spacing={3} sx={{ width: '100%' }}>
            {errorMessage ? (
              <>
                <CloseCircleOutlined style={{ fontSize: 48, color: themeTokens.colors.error }} />
                <Alert type="error" title={errorMessage} showIcon />
              </>
            ) : (
              <>
                <MailOutlined style={{ fontSize: 48, color: themeTokens.colors.primary }} />
                <Title level={3}>Check your email</Title>
                <Paragraph type="secondary">
                  We sent you a verification link. Click the link in your email to verify your account.
                </Paragraph>
              </>
            )}

            <Form form={form} layout="vertical" onFinish={handleResend}>
              <Form.Item
                name="email"
                rules={[
                  { required: true, message: 'Please enter your email' },
                  { type: 'email', message: 'Please enter a valid email' },
                ]}
              >
                <Input
                  prefix={<MailOutlined />}
                  placeholder="Enter your email to resend"
                  size="large"
                />
              </Form.Item>

              <Button
                type="primary"
                htmlType="submit"
                loading={resendLoading}
                block
                size="large"
              >
                Resend Verification Email
              </Button>
            </Form>

            <Button type="link" href="/auth/login">
              Back to Login
            </Button>
          </Stack>
        </Card>
      </Box>
    </Box>
  );
}
