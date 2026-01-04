'use client';

import React, { useEffect } from 'react';
import { Layout, Spin } from 'antd';
import { useUser } from '@stackframe/stack';
import { useRouter, useSearchParams } from 'next/navigation';

export default function AuthPageContent() {
  const user = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';

  useEffect(() => {
    if (user) {
      // User is authenticated, redirect to callback URL
      router.push(callbackUrl);
    } else {
      // User is not authenticated, redirect to Stack Auth sign-in
      const signInUrl = `/handler/sign-in?after_auth_return_to=${encodeURIComponent(callbackUrl)}`;
      router.push(signInUrl);
    }
  }, [user, router, callbackUrl]);

  // Show loading while redirecting
  return (
    <Layout style={{
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <Spin size="large" />
    </Layout>
  );
}
