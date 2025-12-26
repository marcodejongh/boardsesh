'use client';

import { useState, useEffect } from 'react';
import AnimatedBoardLoading from '@/app/components/loading/animated-board-loading';
import { BoardDetails } from '@/app/lib/types';

export default function Loading() {
  const [boardDetails, setBoardDetails] = useState<BoardDetails | null>(null);

  useEffect(() => {
    // Try to get board details from sessionStorage (set by setup wizard)
    try {
      const stored = sessionStorage.getItem('loadingBoardDetails');
      if (stored) {
        setBoardDetails(JSON.parse(stored));
        // Clear after reading so it doesn't persist
        sessionStorage.removeItem('loadingBoardDetails');
      }
    } catch (e) {
      // Ignore storage errors
    }
  }, []);

  return <AnimatedBoardLoading isVisible={true} boardDetails={boardDetails} />;
}
