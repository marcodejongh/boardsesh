import React, { Suspense } from 'react';
import { Metadata } from 'next';
import AuthPageContent from './auth-page-content';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';

export const metadata: Metadata = {
  title: 'Login | Boardsesh',
  description: 'Sign in or create an account on Boardsesh',
};

function AuthPageFallback() {
  return (
    <Box sx={{ minHeight: '100vh', background: 'var(--semantic-background)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <CircularProgress />
    </Box>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<AuthPageFallback />}>
      <AuthPageContent />
    </Suspense>
  );
}
