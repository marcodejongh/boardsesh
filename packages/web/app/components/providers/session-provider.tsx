'use client';

import React from 'react';
import { SessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';

interface SessionProviderWrapperProps {
  children: ReactNode;
}

export default function SessionProviderWrapper({ children }: SessionProviderWrapperProps) {
  return (
    <SessionProvider
      refetchOnWindowFocus={false}
      refetchWhenOffline={false}
    >
      {children}
    </SessionProvider>
  );
}