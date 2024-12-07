'use client';

import React, { useContext, createContext } from 'react';

type ConnectedUser = {
  username: string;
  avatar?: string;
  id: string;
  isHost?: boolean;
};

type PartyContextType = {
  userName: string;
  connectedUsers: ConnectedUser[];
};

// Create some dummy users for development
const dummyUsers: ConnectedUser[] = [
  {
    id: '1',
    username: 'Alice Smith',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice',
    isHost: true,
  },
  {
    id: '2',
    username: 'Bob Johnson',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob',
  },
  {
    id: '3',
    username: 'Carol Wilson',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Carol',
  },
  {
    id: '4',
    username: 'David Brown',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David',
    isHost: true,
  },
];

const PartyContext = createContext<PartyContextType | undefined>(undefined);

export const PartyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // In a real implementation, this would likely use useState and be updated
  // based on peer connections/disconnections
  const contextValue: PartyContextType = {
    userName: 'Current User',
    connectedUsers: dummyUsers,
  };

  return <PartyContext.Provider value={contextValue}>{children}</PartyContext.Provider>;
};

export const usePartyContext = () => {
  const context = useContext(PartyContext);
  if (!context) {
    throw new Error('usePartyContext must be used within a PartyProvider');
  }
  return context;
};

export default PartyContext;
