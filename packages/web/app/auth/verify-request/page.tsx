import React, { Suspense } from 'react';
import { Metadata } from 'next';
import VerifyRequestContent from './verify-request-content';

export const metadata: Metadata = {
  title: 'Verify Email | Boardsesh',
  description: 'Verify your email address',
};

export default function VerifyRequestPage() {
  return (
    <Suspense fallback={null}>
      <VerifyRequestContent />
    </Suspense>
  );
}
