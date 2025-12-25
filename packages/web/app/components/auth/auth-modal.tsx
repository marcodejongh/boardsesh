'use client';

import React, { useState } from 'react';
import { Modal, Form, Input, Button, Tabs, Typography, Divider, message, Space } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, HeartFilled } from '@ant-design/icons';
import { signIn } from 'next-auth/react';

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
        message.info('Please log in with your new account');
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
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Space direction="vertical" style={{ width: '100%', textAlign: 'center' }}>
          <HeartFilled style={{ fontSize: 32, color: '#ff4d4f' }} />
          <Text strong style={{ fontSize: 18 }}>{title}</Text>
          <Text type="secondary">{description}</Text>
        </Space>

        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} centered />

        <Divider style={{ margin: '8px 0' }}>
          <Text type="secondary">or</Text>
        </Divider>

        <Button
          block
          size="large"
          onClick={() => signIn('google')}
          icon={
            <svg viewBox="0 0 24 24" width="16" height="16" style={{ marginRight: 8 }}>
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
          }
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          disabled
        >
          Continue with Google (Coming soon)
        </Button>
      </Space>
    </Modal>
  );
}
