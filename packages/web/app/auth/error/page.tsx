import React, { Suspense } from 'react';
import { Metadata } from 'next';
import AuthErrorContent from './auth-error-content';

export const metadata: Metadata = {
  title: 'Authentication Error | Boardsesh',
  description: 'An error occurred during authentication',
};

export default function AuthErrorPage() {
  return (
    <Suspense fallback={null}>
      <AuthErrorContent />
    </Suspense>
  );
}
