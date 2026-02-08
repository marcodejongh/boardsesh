'use client';

import React, { useEffect, useState } from 'react';
import IconButton from '@mui/material/IconButton';
import ArrowBackOutlined from '@mui/icons-material/ArrowBackOutlined';
import { useRouter } from 'next/navigation';

type BackButtonProps = {
  fallbackUrl?: string;
  className?: string;
};

const BackButton = ({ fallbackUrl, className }: BackButtonProps) => {
  const router = useRouter();
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasHistory = window.history.length > 1;
      const referrer = document.referrer;
      const isSameOrigin =
        referrer !== '' && (referrer.startsWith(window.location.origin) || referrer.includes('boardsesh.com'));

      setCanGoBack(hasHistory && isSameOrigin);
    }
  }, []);

  // Prefetch fallback URL for faster navigation
  useEffect(() => {
    if (!canGoBack && fallbackUrl) {
      router.prefetch(fallbackUrl);
    }
  }, [canGoBack, fallbackUrl, router]);

  const handleClick = () => {
    if (canGoBack) {
      window.history.back();
    } else if (fallbackUrl) {
      router.push(fallbackUrl);
    } else {
      router.back();
    }
  };

  return <IconButton onClick={handleClick} className={className}><ArrowBackOutlined /></IconButton>;
};

export default BackButton;
