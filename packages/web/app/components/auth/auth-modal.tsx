'use client';

import React, { useState } from 'react';
import { Form } from 'antd';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import MuiDivider from '@mui/material/Divider';
import PersonOutlined from '@mui/icons-material/PersonOutlined';
import LockOutlined from '@mui/icons-material/LockOutlined';
import MailOutlined from '@mui/icons-material/MailOutlined';
import Favorite from '@mui/icons-material/Favorite';
import { signIn } from 'next-auth/react';
import SocialLoginButtons from '@/app/components/auth/social-login-buttons';
import { TabPanel } from '@/app/components/ui/tab-panel';
import { useSnackbar } from '@/app/components/providers/snackbar-provider';
import { themeTokens } from '@/app/theme/theme-config';

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
  const { showMessage } = useSnackbar();

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
        showMessage('Invalid email or password', 'error');
      } else if (result?.ok) {
        showMessage('Logged in successfully', 'success');
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
        showMessage(data.error || 'Registration failed', 'error');
        return;
      }

      // Check if email verification is required
      if (data.requiresVerification) {
        showMessage('Please check your email to verify your account', 'info');
        setActiveTab('login');
        loginForm.setFieldValue('email', values.email);
        registerForm.resetFields();
        return;
      }

      // Email verification disabled - auto-login after successful registration
      showMessage('Account created! Logging you in...', 'success');

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
        showMessage('Please log in with your account', 'info');
      }
    } catch (error) {
      console.error('Registration error:', error);
      showMessage('Registration failed. Please try again.', 'error');
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleCancel = () => {
    loginForm.resetFields();
    registerForm.resetFields();
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      maxWidth="xs"
      fullWidth
    >
      <DialogContent>
        <Stack spacing={3} sx={{ width: '100%' }}>
          <Stack spacing={1} sx={{ width: '100%', textAlign: 'center' }}>
            <Favorite sx={{ fontSize: 32, color: themeTokens.colors.error, mx: 'auto' }} />
            <Typography variant="body2" component="span" fontWeight={600} sx={{ fontSize: 18 }}>{title}</Typography>
            <Typography variant="body2" component="span" color="text.secondary">{description}</Typography>
          </Stack>

          <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} centered>
            <Tab label="Login" value="login" />
            <Tab label="Create Account" value="register" />
          </Tabs>

          <TabPanel value={activeTab} index="login">
            <Form form={loginForm} layout="vertical" onFinish={handleLogin}>
              <Form.Item
                name="email"
                label="Email"
                rules={[
                  { required: true, message: 'Please enter your email' },
                  { type: 'email', message: 'Please enter a valid email' },
                ]}
              >
                <TextField
                  placeholder="your@email.com"
                  variant="outlined"
                  size="medium"
                  fullWidth
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <MailOutlined />
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              </Form.Item>

              <Form.Item
                name="password"
                label="Password"
                rules={[{ required: true, message: 'Please enter your password' }]}
              >
                <TextField
                  type="password"
                  placeholder="Password"
                  variant="outlined"
                  size="medium"
                  fullWidth
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockOutlined />
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              </Form.Item>

              <Form.Item style={{ marginBottom: 0 }}>
                <Button
                  variant="contained"
                  type="submit"
                  disabled={loginLoading}
                  startIcon={loginLoading ? <CircularProgress size={16} /> : undefined}
                  fullWidth
                  size="large"
                >
                  Login
                </Button>
              </Form.Item>
            </Form>
          </TabPanel>

          <TabPanel value={activeTab} index="register">
            <Form form={registerForm} layout="vertical" onFinish={handleRegister}>
              <Form.Item
                name="name"
                label="Name"
                rules={[{ max: 100, message: 'Name must be less than 100 characters' }]}
              >
                <TextField
                  placeholder="Your name (optional)"
                  variant="outlined"
                  size="medium"
                  fullWidth
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonOutlined />
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              </Form.Item>

              <Form.Item
                name="email"
                label="Email"
                rules={[
                  { required: true, message: 'Please enter your email' },
                  { type: 'email', message: 'Please enter a valid email' },
                ]}
              >
                <TextField
                  placeholder="your@email.com"
                  variant="outlined"
                  size="medium"
                  fullWidth
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <MailOutlined />
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              </Form.Item>

              <Form.Item
                name="password"
                label="Password"
                rules={[
                  { required: true, message: 'Please enter a password' },
                  { min: 8, message: 'Password must be at least 8 characters' },
                ]}
              >
                <TextField
                  type="password"
                  placeholder="Password (min 8 characters)"
                  variant="outlined"
                  size="medium"
                  fullWidth
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockOutlined />
                        </InputAdornment>
                      ),
                    },
                  }}
                />
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
                <TextField
                  type="password"
                  placeholder="Confirm password"
                  variant="outlined"
                  size="medium"
                  fullWidth
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockOutlined />
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              </Form.Item>

              <Form.Item style={{ marginBottom: 0 }}>
                <Button
                  variant="contained"
                  type="submit"
                  disabled={registerLoading}
                  startIcon={registerLoading ? <CircularProgress size={16} /> : undefined}
                  fullWidth
                  size="large"
                >
                  Create Account
                </Button>
              </Form.Item>
            </Form>
          </TabPanel>

          <MuiDivider sx={{ margin: '8px 0' }}>
            <Typography variant="body2" component="span" color="text.secondary">or</Typography>
          </MuiDivider>

          <SocialLoginButtons />
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
