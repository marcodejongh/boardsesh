'use client';

import React from 'react';
import { PartyProfileProvider } from '../party-manager/party-profile-context';
import { PersistentSessionProvider } from '../persistent-session';
import { QueueBridgeProvider, useQueueBridgeBoardInfo } from '../queue-control/queue-bridge-context';
import QueueControlBar from '../queue-control/queue-control-bar';
import BottomTabBar from '../bottom-tab-bar/bottom-tab-bar';
import { BoardProvider } from '../board-provider/board-provider-context';
import { ConnectionSettingsProvider } from '../connection-manager/connection-settings-context';
import { BluetoothProvider } from '../board-bluetooth-control/bluetooth-context';
import ErrorBoundary from '../error-boundary';
import bottomBarStyles from '../bottom-tab-bar/bottom-bar-wrapper.module.css';
import { BoardConfigData } from '@/app/lib/server-board-configs';

interface PersistentSessionWrapperProps {
  children: React.ReactNode;
  boardConfigs: BoardConfigData;
}

/**
 * Root-level wrapper that provides:
 * 1. PartyProfileProvider - user profile from IndexedDB and NextAuth session
 * 2. PersistentSessionProvider - WebSocket connection management that persists across navigation
 * 3. QueueBridgeProvider - bridges queue context from board routes to the persistent bottom bar
 * 4. RootBottomBar - always-rendered queue control bar + bottom tab bar
 */
export default function PersistentSessionWrapper({ children, boardConfigs }: PersistentSessionWrapperProps) {
  return (
    <PartyProfileProvider>
      <PersistentSessionProvider>
        <QueueBridgeProvider>
          {children}
          <RootBottomBar boardConfigs={boardConfigs} />
        </QueueBridgeProvider>
      </PersistentSessionProvider>
    </PartyProfileProvider>
  );
}

/**
 * Persistent bottom bar rendered at the root level.
 * Always renders — the QueueBridge provides queue context from whichever provider is active.
 * QueueControlBar is only shown when there is an active queue (board details available).
 */
function RootBottomBar({ boardConfigs }: { boardConfigs: BoardConfigData }) {
  const { boardDetails, angle, hasActiveQueue } = useQueueBridgeBoardInfo();

  return (
    <div className={bottomBarStyles.bottomBarWrapper}>
      {hasActiveQueue && boardDetails && (
        <ErrorBoundary>
          <BoardProvider boardName={boardDetails.board_name}>
            <ConnectionSettingsProvider>
              <BluetoothProvider boardDetails={boardDetails}>
                <QueueControlBar boardDetails={boardDetails} angle={angle} />
              </BluetoothProvider>
            </ConnectionSettingsProvider>
          </BoardProvider>
        </ErrorBoundary>
      )}
      <BottomTabBar boardConfigs={boardConfigs} />
    </div>
  );
}
