'use client';

import React from 'react';
import { PartyProfileProvider } from './party-profile-context';

interface PartyProfileWrapperProps {
  children: React.ReactNode;
}

/**
 * Wrapper component that provides party profile context.
 * The profile ID is used for user identification in party mode.
 * Username and avatar are now derived from NextAuth session.
 */
const PartyProfileWrapper: React.FC<PartyProfileWrapperProps> = ({ children }) => {
  return <PartyProfileProvider>{children}</PartyProfileProvider>;
};

export default PartyProfileWrapper;
