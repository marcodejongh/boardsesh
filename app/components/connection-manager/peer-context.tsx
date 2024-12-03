'use client';

import React, { useState, useEffect, createContext, useContext, useCallback, useRef } from 'react';
import Peer, { DataConnection } from 'peerjs';
import { PeerContextType, PeerProviderProps, PeerConnectionState, PeerData } from './types';
import { useSearchParams } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';

export const PeerContext = createContext<PeerContextType | undefined>(undefined);

export const usePeerContext = () => {
  const context = useContext(PeerContext);
  if (!context) {
    throw new Error('usePeerContext must be used within a PeerProvider');
  }
  return context;
};

const PeerProvider: React.FC<PeerProviderProps> = ({ children }) => {
  return (
    <PeerContext.Provider
      value={{ readyToConnect, receivedData, sendData, connectToPeer, peerId, connections, hostId }}
    >
      {children}
    </PeerContext.Provider>
  );
};

export default PeerProvider;
