import React, { Suspense } from 'react';
import { Metadata } from 'next';
import AuthPageContent from './auth-page-content';

export const metadata: Metadata = {
  title: 'Login | Boardsesh',
  description: 'Sign in or create an account on Boardsesh',
};

function AuthPageFallback() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--semantic-background)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ width: 40, height: 40, border: '3px solid var(--neutral-200)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<AuthPageFallback />}>
      <AuthPageContent />
    </Suspense>
  );
}
