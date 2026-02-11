'use client';

import React, { useState } from 'react';
import MuiAlert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import MailOutlined from '@mui/icons-material/MailOutlined';
import CancelOutlined from '@mui/icons-material/CancelOutlined';
import { useSearchParams } from 'next/navigation';
import Logo from '@/app/components/brand/logo';
import BackButton from '@/app/components/back-button';
import { useSnackbar } from '@/app/components/providers/snackbar-provider';
import { themeTokens } from '@/app/theme/theme-config';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type EmailErrors = { email?: string };

function validateEmail(email: string): EmailErrors {
  const errors: EmailErrors = {};
  if (!email) {
    errors.email = 'Please enter your email';
  } else if (!EMAIL_REGEX.test(email)) {
    errors.email = 'Please enter a valid email';
  }
  return errors;
}

export default function VerifyRequestContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const [resendLoading, setResendLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<EmailErrors>({});
  const { showMessage } = useSnackbar();

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
    const validationErrors = validateEmail(email);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    try {
      setResendLoading(true);

      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        showMessage('Verification email sent! Check your inbox.', 'success');
      } else {
        showMessage(data.error || 'Failed to send verification email', 'error');
      }
    } catch (err) {
      console.error('Resend error:', err);
    } finally {
      setResendLoading(false);
    }
  };

  const errorMessage = getErrorMessage();

  return (
    <Box sx={{ minHeight: '100vh', background: 'var(--semantic-background)' }}>
      <Box
        component="header"
        sx={{
          background: 'var(--semantic-surface)',
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
          Email Verification
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
        <Card sx={{ width: '100%', maxWidth: 400, textAlign: 'center' }}>
          <CardContent>
            <Stack spacing={3} sx={{ width: '100%' }}>
              {errorMessage ? (
                <>
                  <CancelOutlined sx={{ fontSize: 48, color: themeTokens.colors.error, mx: 'auto' }} />
                  <MuiAlert severity="error">{errorMessage}</MuiAlert>
                </>
              ) : (
                <>
                  <MailOutlined sx={{ fontSize: 48, color: themeTokens.colors.primary, mx: 'auto' }} />
                  <Typography variant="h3">Check your email</Typography>
                  <Typography variant="body1" component="p" color="text.secondary">
                    We sent you a verification link. Click the link in your email to verify your account.
                  </Typography>
                </>
              )}

              <Box
                component="form"
                onSubmit={(e: React.FormEvent) => { e.preventDefault(); handleResend(); }}
                sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
              >
                <TextField
                  placeholder="Enter your email to resend"
                  variant="outlined"
                  size="medium"
                  fullWidth
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors({});
                  }}
                  error={!!errors.email}
                  helperText={errors.email}
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

                <Button
                  variant="contained"
                  type="submit"
                  disabled={resendLoading}
                  startIcon={resendLoading ? <CircularProgress size={16} /> : undefined}
                  fullWidth
                  size="large"
                >
                  Resend Verification Email
                </Button>
              </Box>

              <Button variant="text" href="/auth/login">
                Back to Login
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
