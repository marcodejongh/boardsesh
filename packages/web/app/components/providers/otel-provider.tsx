'use client';

import { useEffect } from 'react';
import { initWebTracing } from '@/app/otel/init-otel';

export default function OtelProvider() {
  useEffect(() => {
    initWebTracing();
  }, []);

  return null;
}
