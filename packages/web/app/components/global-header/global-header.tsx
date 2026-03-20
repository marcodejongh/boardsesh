'use client';

import React, { useState } from 'react';
import Button from '@mui/material/Button';
import SearchOutlined from '@mui/icons-material/SearchOutlined';
import PlayCircleOutlineOutlined from '@mui/icons-material/PlayCircleOutlineOutlined';
import SettingsOutlined from '@mui/icons-material/SettingsOutlined';
import UnifiedSearchDrawer from '@/app/components/search-drawer/unified-search-drawer';
import { useSearchDrawerBridge } from '@/app/components/search-drawer/search-drawer-bridge-context';
import UserDrawer from '@/app/components/user-drawer/user-drawer';
import StartSeshDrawer from '@/app/components/session-creation/start-sesh-drawer';
import SeshSettingsDrawer from '@/app/components/sesh-settings/sesh-settings-drawer';
import { usePersistentSession, useIsOnBoardRoute } from '@/app/components/persistent-session/persistent-session-context';
import { BoardConfigData } from '@/app/lib/server-board-configs';
import { themeTokens } from '@/app/theme/theme-config';
import styles from './global-header.module.css';

interface GlobalHeaderProps {
  boardConfigs: BoardConfigData;
}

export default function GlobalHeader({ boardConfigs }: GlobalHeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [startSeshOpen, setStartSeshOpen] = useState(false);
  const [seshSettingsOpen, setSeshSettingsOpen] = useState(false);
  const { activeSession } = usePersistentSession();
  const isOnBoardRoute = useIsOnBoardRoute();
  const { openClimbSearchDrawer, searchPillSummary, hasActiveFilters: filtersActive } = useSearchDrawerBridge();

  const hasActiveSession = !!activeSession;

  // When the bridge is active (on a board list page), delegate to the board route's drawer
  const useClimbSearchBridge = openClimbSearchDrawer !== null;

  const handleSearchClick = () => {
    if (useClimbSearchBridge) {
      openClimbSearchDrawer();
    } else {
      setSearchOpen(true);
    }
  };

  const handleSeshClick = () => {
    if (hasActiveSession) {
      setSeshSettingsOpen(true);
    } else {
      setStartSeshOpen(true);
    }
  };

  const pillText = useClimbSearchBridge && searchPillSummary ? searchPillSummary : 'Search';

  return (
    <>
      <header className={styles.header}>
        <UserDrawer boardConfigs={boardConfigs} />

        <button
          id={useClimbSearchBridge ? 'onboarding-search-button' : undefined}
          className={styles.searchPillButton}
          onClick={handleSearchClick}
          type="button"
        >
          <SearchOutlined className={styles.searchPillIcon} />
          <span className={styles.searchPillText}>{pillText}</span>
          {useClimbSearchBridge && filtersActive && <span className={styles.searchPillActiveIndicator} />}
        </button>

        <Button
          variant="contained"
          size="small"
          startIcon={hasActiveSession ? <SettingsOutlined /> : <PlayCircleOutlineOutlined />}
          onClick={handleSeshClick}
          sx={hasActiveSession ? {
            backgroundColor: themeTokens.colors.success,
            '&:hover': { backgroundColor: themeTokens.colors.successHover },
          } : undefined}
        >
          Sesh
        </Button>
      </header>

      <UnifiedSearchDrawer
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        defaultCategory={isOnBoardRoute ? 'climbs' : 'boards'}
      />

      <StartSeshDrawer
        open={startSeshOpen}
        onClose={() => setStartSeshOpen(false)}
        boardConfigs={boardConfigs}
      />

      <SeshSettingsDrawer
        open={seshSettingsOpen}
        onClose={() => setSeshSettingsOpen(false)}
      />
    </>
  );
}
