'use client';

import { useEffect } from 'react';
import { useNavigationLoading } from '../providers/navigation-loading-provider';

/**
 * A component that signals to the NavigationLoadingProvider that the page content
 * has finished rendering. Place this at the end of your page component to hide
 * the loading overlay once the page is ready.
 */
export default function PageReadySignal() {
  const { signalPageReady } = useNavigationLoading();

  useEffect(() => {
    signalPageReady();
  }, [signalPageReady]);

  return null;
}
