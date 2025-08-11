'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { PeerProvider } from './peer-context';
import { WebSocketProvider } from './websocket-context';

export const ConnectionProviderWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const searchParams = useSearchParams();
  const controllerUrl = searchParams.get('controllerUrl');
  const isControllerMode = !!controllerUrl;

  // Use WebSocket for controller mode, PeerJS for party mode
  if (isControllerMode) {
    return (
      <WebSocketProvider>
        {children}
      </WebSocketProvider>
    );
  }

  return (
    <PeerProvider>
      {children}
    </PeerProvider>
  );
};