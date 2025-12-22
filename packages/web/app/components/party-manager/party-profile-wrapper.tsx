'use client';

import React, { useState, useEffect } from 'react';
import { PartyProfileProvider, usePartyProfile } from './party-profile-context';
import PartyProfileModal from './party-profile-modal';
import { useConnectionSettings } from '@/app/components/connection-manager/connection-settings-context';

interface PartyProfileWrapperInnerProps {
  children: React.ReactNode;
}

/**
 * Inner component that handles the modal logic
 * Must be inside PartyProfileProvider and ConnectionSettingsProvider
 */
const PartyProfileWrapperInner: React.FC<PartyProfileWrapperInnerProps> = ({ children }) => {
  const { hasUsername, isLoading: profileLoading } = usePartyProfile();
  const { partyMode, daemonUrl, isLoaded: settingsLoaded } = useConnectionSettings();
  const [showModal, setShowModal] = useState(false);
  const [hasShownModal, setHasShownModal] = useState(false);

  const isDaemonMode = partyMode === 'daemon';

  // Show modal when:
  // 1. Settings and profile are loaded
  // 2. In daemon mode (party mode active)
  // 3. Username is not set
  // 4. Haven't already shown modal this session
  useEffect(() => {
    if (settingsLoaded && !profileLoading && isDaemonMode && !hasUsername && !hasShownModal) {
      setShowModal(true);
      setHasShownModal(true);
    }
  }, [settingsLoaded, profileLoading, isDaemonMode, hasUsername, hasShownModal]);

  const handleCloseModal = () => {
    setShowModal(false);
  };

  return (
    <>
      {children}
      <PartyProfileModal
        open={showModal}
        onClose={handleCloseModal}
        isDaemonMode={isDaemonMode}
        daemonUrl={daemonUrl || undefined}
      />
    </>
  );
};

interface PartyProfileWrapperProps {
  children: React.ReactNode;
}

/**
 * Wrapper component that provides party profile context and handles modal display
 * Should be placed inside ConnectionSettingsProvider in the component tree
 */
const PartyProfileWrapper: React.FC<PartyProfileWrapperProps> = ({ children }) => {
  return (
    <PartyProfileProvider>
      <PartyProfileWrapperInner>{children}</PartyProfileWrapperInner>
    </PartyProfileProvider>
  );
};

export default PartyProfileWrapper;
