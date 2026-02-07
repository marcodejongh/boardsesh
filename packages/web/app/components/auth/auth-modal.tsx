'use client';

import React, { useState } from 'react';
import { Modal, Form, Input, Button, Tabs, Typography, Divider, message, Space } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, HeartFilled } from '@ant-design/icons';
import { signIn } from 'next-auth/react';
import SocialLoginButtons from '@/app/components/auth/social-login-buttons';
import { themeTokens } from '@/app/theme/theme-config';

const { Text } = Typography;

type AuthModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  title?: string;
  description?: string;
};

export default function AuthModal({
  open,
  onClose,
  onSuccess,
  title = "Sign in to continue",
  description = "Create an account or sign in to save your favorites and more."
}: AuthModalProps) {
  const [loginForm] = Form.useForm();
  const [registerForm] = Form.useForm();
  const [loginLoading, setLoginLoading] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('login');

  const handleLogin = async () => {
    try {
      const values = await loginForm.validateFields();
      setLoginLoading(true);

      const result = await signIn('credentials', {
        email: values.email,
        password: values.password,
        redirect: false,
      });

      if (result?.error) {
        message.error('Invalid email or password');
      } else if (result?.ok) {
        message.success('Logged in successfully');
        loginForm.resetFields();
        onClose();
        onSuccess?.();
      }
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async () => {
    try {
      const values = await registerForm.validateFields();
      setRegisterLoading(true);

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: values.email,
          password: values.password,
          name: values.name,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        message.error(data.error || 'Registration failed');
        return;
      }

      // Check if email verification is required
      if (data.requiresVerification) {
        message.info('Please check your email to verify your account');
        setActiveTab('login');
        loginForm.setFieldValue('email', values.email);
        registerForm.resetFields();
        return;
      }

      // Email verification disabled - auto-login after successful registration
      message.success('Account created! Logging you in...');

      const loginResult = await signIn('credentials', {
        email: values.email,
        password: values.password,
        redirect: false,
      });

      if (loginResult?.ok) {
        registerForm.resetFields();
        onClose();
        onSuccess?.();
      } else {
        setActiveTab('login');
        loginForm.setFieldValue('email', values.email);
        message.info('Please log in with your account');
      }
    } catch (error) {
      console.error('Registration error:', error);
      message.error('Registration failed. Please try again.');
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleCancel = () => {
    loginForm.resetFields();
    registerForm.resetFields();
    onClose();
  };

  const tabItems = [
    {
      key: 'login',
      label: 'Login',
      forceRender: true,
      children: (
        <Form form={loginForm} layout="vertical" onFinish={handleLogin}>
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Please enter your email' },
              { type: 'email', message: 'Please enter a valid email' },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="your@email.com" size="large" />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: 'Please enter your password' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Password" size="large" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" loading={loginLoading} block size="large">
              Login
            </Button>
          </Form.Item>
        </Form>
      ),
    },
    {
      key: 'register',
      label: 'Create Account',
      forceRender: true,
      children: (
        <Form form={registerForm} layout="vertical" onFinish={handleRegister}>
          <Form.Item
            name="name"
            label="Name"
            rules={[{ max: 100, message: 'Name must be less than 100 characters' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="Your name (optional)" size="large" />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Please enter your email' },
              { type: 'email', message: 'Please enter a valid email' },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="your@email.com" size="large" />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[
              { required: true, message: 'Please enter a password' },
              { min: 8, message: 'Password must be at least 8 characters' },
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Password (min 8 characters)" size="large" />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="Confirm Password"
            dependencies={['password']}
            rules={[
              { required: true, message: 'Please confirm your password' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Passwords do not match'));
                },
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Confirm password" size="large" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" loading={registerLoading} block size="large">
              Create Account
            </Button>
          </Form.Item>
        </Form>
      ),
    },
  ];

  return (
    <Modal
      open={open}
      onCancel={handleCancel}
      footer={null}
      width={400}
      centered
    >
      <Space orientation="vertical" size="large" style={{ width: '100%' }}>
        <Space orientation="vertical" style={{ width: '100%', textAlign: 'center' }}>
          <HeartFilled style={{ fontSize: 32, color: themeTokens.colors.error }} />
          <Text strong style={{ fontSize: 18 }}>{title}</Text>
          <Text type="secondary">{description}</Text>
        </Space>

        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} centered destroyOnHidden={false} />

        <Divider style={{ margin: '8px 0' }}>
          <Text type="secondary">or</Text>
        </Divider>

        <SocialLoginButtons />
      </Space>
    </Modal>
  );
}
