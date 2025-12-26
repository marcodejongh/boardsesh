'use client';

import React from 'react';

/**
 * NavigationLoadingProvider - Simplified version
 *
 * The animated loading overlay has been removed in favor of using
 * Suspense boundaries with skeleton fallbacks for loading states.
 * This provider is kept for backwards compatibility but now just
 * renders children directly.
 */
export function NavigationLoadingProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
