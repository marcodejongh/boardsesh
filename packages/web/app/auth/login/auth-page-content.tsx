'use client';

import React, { useState, useEffect } from 'react';
import { Form } from 'antd';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import MuiDivider from '@mui/material/Divider';
import PersonOutlined from '@mui/icons-material/PersonOutlined';
import LockOutlined from '@mui/icons-material/LockOutlined';
import MailOutlined from '@mui/icons-material/MailOutlined';
import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Logo from '@/app/components/brand/logo';
import BackButton from '@/app/components/back-button';
import SocialLoginButtons from '@/app/components/auth/social-login-buttons';
import { TabPanel } from '@/app/components/ui/tab-panel';
import { useSnackbar } from '@/app/components/providers/snackbar-provider';
import { themeTokens } from '@/app/theme/theme-config';

export default function AuthPageContent() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  const error = searchParams.get('error');
  const { showMessage } = useSnackbar();

  const [loginForm] = Form.useForm();
  const [registerForm] = Form.useForm();
  const [loginLoading, setLoginLoading] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('login');

  const verified = searchParams.get('verified');

  // Show error message from NextAuth
  useEffect(() => {
    if (error) {
      if (error === 'CredentialsSignin') {
        showMessage('Invalid email or password', 'error');
      } else {
        showMessage('Authentication failed. Please try again.', 'error');
      }
    }
  }, [error, showMessage]);

  // Show success message when email is verified
  useEffect(() => {
    if (verified === 'true') {
      showMessage('Email verified! You can now log in.', 'success');
    }
  }, [verified, showMessage]);

  // Redirect if already authenticated
  useEffect(() => {
    if (status === 'authenticated') {
      router.push(callbackUrl);
    }
  }, [status, router, callbackUrl]);

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
        router.push(callbackUrl);
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

      // Call registration API
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
        router.push(callbackUrl);
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

  if (status === 'loading') {
    return null;
  }

  if (status === 'authenticated') {
    return null;
  }

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
        <Typography variant="h4" sx={{ margin: 0, flex: 1 }}>
          Welcome
        </Typography>
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
        <Card sx={{ width: '100%', maxWidth: 400 }}>
          <CardContent>
            <Stack spacing={1} sx={{ width: '100%', textAlign: 'center', marginBottom: 3 }}>
              <Logo size="md" />
              <Typography variant="body2" component="span" color="text.secondary">Sign in or create an account to continue</Typography>
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

            <MuiDivider>
              <Typography variant="body2" component="span" color="text.secondary">or</Typography>
            </MuiDivider>

            <SocialLoginButtons callbackUrl={callbackUrl} />
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
