'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { PeerProvider } from './peer-context';
import { WebSocketProvider } from './websocket-context';
import { DaemonProvider } from './daemon-context';
import { useDaemonUrl, usePartyMode } from './connection-settings-context';

export const ConnectionProviderWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const searchParams = useSearchParams();
  const controllerUrl = searchParams.get('controllerUrl');
  const isControllerMode = !!controllerUrl;

  const { daemonUrl } = useDaemonUrl();
  const { partyMode } = usePartyMode();

  // Priority:
  // 1. Controller mode (explicit controllerUrl param)
  // 2. Daemon mode (partyMode is 'daemon' AND daemonUrl is available)
  // 3. Direct mode (PeerJS - default)

  if (isControllerMode) {
    return <WebSocketProvider>{children}</WebSocketProvider>;
  }

  if (partyMode === 'daemon' && daemonUrl) {
    return <DaemonProvider>{children}</DaemonProvider>;
  }

  return <PeerProvider>{children}</PeerProvider>;
};