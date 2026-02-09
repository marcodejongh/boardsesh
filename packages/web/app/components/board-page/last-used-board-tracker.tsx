'use client';

import { useEffect } from 'react';
import { setLastUsedBoard } from '@/app/lib/last-used-board-db';

interface LastUsedBoardTrackerProps {
  url: string;
  boardName: string;
  layoutName: string;
  sizeName: string;
  sizeDescription?: string;
  setNames: string[];
  angle: number;
}

export default function LastUsedBoardTracker({
  url,
  boardName,
  layoutName,
  sizeName,
  sizeDescription,
  setNames,
  angle,
}: LastUsedBoardTrackerProps) {
  useEffect(() => {
    setLastUsedBoard({
      url,
      boardName,
      layoutName,
      sizeName,
      sizeDescription,
      setNames,
      angle,
    });
  }, [url, boardName, layoutName, sizeName, sizeDescription, setNames, angle]);

  return null;
}
