'use client';

import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { track } from '@vercel/analytics';
import { useBoardBluetooth } from './use-board-bluetooth';
import { useQueueContext } from '../graphql-queue';
import type { BoardDetails } from '@/app/lib/types';

interface BluetoothContextValue {
  isConnected: boolean;
  loading: boolean;
  connect: (initialFrames?: string, mirrored?: boolean) => Promise<boolean>;
  disconnect: () => void;
  sendFramesToBoard: (frames: string, mirrored?: boolean) => Promise<boolean | undefined>;
  isBluetoothSupported: boolean;
  isIOS: boolean;
}

const BluetoothContext = createContext<BluetoothContextValue | null>(null);

export function BluetoothProvider({
  boardDetails,
  children,
}: {
  boardDetails: BoardDetails;
  children: React.ReactNode;
}) {
  const { currentClimbQueueItem } = useQueueContext();
  const { isConnected, loading, connect, disconnect, sendFramesToBoard } =
    useBoardBluetooth({ boardDetails });

  const isBluetoothSupported =
    typeof navigator !== 'undefined' && !!navigator.bluetooth;

  const isIOS = useMemo(
    () =>
      typeof navigator !== 'undefined' &&
      /iPhone|iPad|iPod/i.test(
        navigator.userAgent || (navigator as { vendor?: string }).vendor || '',
      ),
    [],
  );

  // Auto-send climb when currentClimbQueueItem changes (only if connected)
  useEffect(() => {
    if (isConnected && currentClimbQueueItem) {
      const sendClimb = async () => {
        const success = await sendFramesToBoard(
          currentClimbQueueItem.climb.frames,
          !!currentClimbQueueItem.climb.mirrored,
        );
        if (success) {
          track('Climb Sent to Board Success', {
            climbUuid: currentClimbQueueItem.climb?.uuid,
            boardLayout: `${boardDetails.layout_name}`,
          });
        } else {
          track('Climb Sent to Board Failure', {
            climbUuid: currentClimbQueueItem.climb?.uuid,
            boardLayout: `${boardDetails.layout_name}`,
          });
        }
      };
      sendClimb();
    }
  }, [currentClimbQueueItem, isConnected, sendFramesToBoard, boardDetails.layout_name]);

  const value = useMemo(
    () => ({
      isConnected,
      loading,
      connect,
      disconnect,
      sendFramesToBoard,
      isBluetoothSupported,
      isIOS,
    }),
    [
      isConnected,
      loading,
      connect,
      disconnect,
      sendFramesToBoard,
      isBluetoothSupported,
      isIOS,
    ],
  );

  return (
    <BluetoothContext.Provider value={value}>
      {children}
    </BluetoothContext.Provider>
  );
}

export function useBluetoothContext() {
  const context = useContext(BluetoothContext);
  if (!context) {
    throw new Error(
      'useBluetoothContext must be used within a BluetoothProvider',
    );
  }
  return context;
}

export { BluetoothContext };
