import React, { Suspense } from 'react';
import { Metadata } from 'next';
import AuthPageContent from './auth-page-content';
import { Spin, Layout } from 'antd';

export const metadata: Metadata = {
  title: 'Login | Boardsesh',
  description: 'Sign in or create an account on Boardsesh',
};

function AuthPageFallback() {
  return (
    <Layout style={{ minHeight: '100vh', background: 'var(--semantic-background)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <Spin size="large" />
    </Layout>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<AuthPageFallback />}>
      <AuthPageContent />
    </Suspense>
  );
}
