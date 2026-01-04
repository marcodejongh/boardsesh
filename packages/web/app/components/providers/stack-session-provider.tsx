'use client';

import React from 'react';
import { StackProvider, StackTheme } from "@stackframe/stack";
import { stackClientApp } from '@/app/lib/auth/stack-client';
import { ReactNode } from 'react';

interface StackSessionProviderProps {
  children: ReactNode;
}

export default function StackSessionProvider({ children }: StackSessionProviderProps) {
  return (
    <StackProvider app={stackClientApp}>
      <StackTheme>
        {children}
      </StackTheme>
    </StackProvider>
  );
}
