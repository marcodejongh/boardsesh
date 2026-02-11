'use client';

import React, { useState, useEffect } from 'react';
import MuiAvatar from '@mui/material/Avatar';
import MuiTypography from '@mui/material/Typography';
import MuiButton from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import PersonOutlined from '@mui/icons-material/PersonOutlined';
import SettingsOutlined from '@mui/icons-material/SettingsOutlined';
import ShowChartOutlined from '@mui/icons-material/ShowChartOutlined';
import LogoutOutlined from '@mui/icons-material/LogoutOutlined';
import LoginOutlined from '@mui/icons-material/LoginOutlined';
import HelpOutlineOutlined from '@mui/icons-material/HelpOutlineOutlined';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import GpsFixedOutlined from '@mui/icons-material/GpsFixedOutlined';
import LocalOfferOutlined from '@mui/icons-material/LocalOfferOutlined';
import SwapHorizOutlined from '@mui/icons-material/SwapHorizOutlined';
import HistoryOutlined from '@mui/icons-material/HistoryOutlined';
import PlayCircleOutlineOutlined from '@mui/icons-material/PlayCircleOutlineOutlined';
import GroupOutlined from '@mui/icons-material/GroupOutlined';
import LightModeOutlined from '@mui/icons-material/LightModeOutlined';
import DarkModeOutlined from '@mui/icons-material/DarkModeOutlined';

import { useSession, signOut } from 'next-auth/react';
import { useColorMode } from '@/app/hooks/use-color-mode';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SwipeableDrawer from '../swipeable-drawer/swipeable-drawer';
import AuthModal from '../auth/auth-modal';
import { HoldClassificationWizard } from '../hold-classification';
import BoardSelectorDrawer from '../board-selector-drawer/board-selector-drawer';
import { BoardDetails } from '@/app/lib/types';
import { BoardConfigData } from '@/app/lib/server-board-configs';
import {
  type StoredSession,
  getRecentSessions,
  formatRelativeTime,
  extractBoardName,
} from '@/app/lib/session-history-db';
import styles from './user-drawer.module.css';

interface UserDrawerProps {
  boardDetails?: BoardDetails | null;
  angle?: number;
  boardConfigs?: BoardConfigData;
}

export default function UserDrawer({ boardDetails, boardConfigs }: UserDrawerProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showHoldClassification, setShowHoldClassification] = useState(false);
  const [showBoardSelector, setShowBoardSelector] = useState(false);
  const [recentSessions, setRecentSessions] = useState<StoredSession[]>([]);

  const { mode, toggleMode } = useColorMode();
  const isMoonboard = boardDetails?.board_name === 'moonboard';

  // Load recent sessions when drawer opens
  useEffect(() => {
    if (isOpen) {
      getRecentSessions()
        .then(setRecentSessions)
        .catch(() => {
          // IndexedDB may be unavailable (e.g. private browsing).
          // Silently fall back to an empty list — the section simply won't render.
          setRecentSessions([]);
        });
    }
  }, [isOpen]);

  const handleClose = () => setIsOpen(false);

  const handleSignOut = () => {
    signOut();
    handleClose();
  };

  const handleResumeSession = (storedSession: StoredSession) => {
    const url = new URL(storedSession.boardPath, window.location.origin);
    url.searchParams.set('session', storedSession.id);
    router.push(url.pathname + url.search);
    handleClose();
  };

  const playlistsUrl = '/my-library';

  const userAvatar = session?.user?.image ?? undefined;
  const userName = session?.user?.name;
  const userEmail = session?.user?.email;
  const avatarClass = session?.user ? styles.avatarLoggedIn : styles.avatarLoggedOut;

  return (
    <>
      <IconButton
        onClick={() => setIsOpen(true)}
        aria-label="User menu"
        className={styles.avatarButton}
      >
        <MuiAvatar
          sx={{ width: 28, height: 28 }}
          src={userAvatar}
          className={avatarClass}
        >
          {!userAvatar ? <PersonOutlined /> : null}
        </MuiAvatar>
      </IconButton>

      <SwipeableDrawer
        placement="left"
        open={isOpen}
        onClose={handleClose}
        width={300}
        title={null}
      >
        <div className={styles.drawerBody}>
          {/* Profile section */}
          <div className={styles.profileSection}>
            <MuiAvatar
              sx={{ width: 64, height: 64 }}
              src={userAvatar}
              className={avatarClass}
            >
              {!userAvatar ? <PersonOutlined /> : null}
            </MuiAvatar>
            {session?.user ? (
              <>
                {userName && (
                  <MuiTypography variant="body2" component="span" fontWeight={600} className={styles.userName}>
                    {userName}
                  </MuiTypography>
                )}
                {userEmail && (
                  <MuiTypography variant="body2" component="span" color="text.secondary" className={styles.userEmail}>
                    {userEmail}
                  </MuiTypography>
                )}
              </>
            ) : (
              <MuiButton
                variant="contained"
                startIcon={<LoginOutlined />}
                onClick={() => {
                  handleClose();
                  setShowAuthModal(true);
                }}
              >
                Sign in
              </MuiButton>
            )}
          </div>

          <div className={styles.divider} />

          {/* Navigation section */}
          <nav>
            <button
              type="button"
              className={styles.menuItem}
              onClick={() => {
                handleClose();
                if (boardConfigs) {
                  setShowBoardSelector(true);
                } else {
                  router.push('/?select=true');
                }
              }}
            >
              <span className={styles.menuItemIcon}><SwapHorizOutlined /></span>
              <span className={styles.menuItemLabel}>Change Board</span>
            </button>

            {session?.user && (
              <Link
                href={`/crusher/${session.user.id}`}
                className={styles.menuItem}
                onClick={handleClose}
              >
                <span className={styles.menuItemIcon}><ShowChartOutlined /></span>
                <span className={styles.menuItemLabel}>Profile</span>
              </Link>
            )}

            <Link
              href="/settings"
              className={styles.menuItem}
              onClick={handleClose}
            >
              <span className={styles.menuItemIcon}><SettingsOutlined /></span>
              <span className={styles.menuItemLabel}>Settings</span>
            </Link>

            {boardDetails && !isMoonboard && (
              <button
                type="button"
                className={styles.menuItem}
                onClick={() => {
                  handleClose();
                  setShowHoldClassification(true);
                }}
              >
                <span className={styles.menuItemIcon}><GpsFixedOutlined /></span>
                <span className={styles.menuItemLabel}>Classify Holds</span>
              </button>
            )}

            <Link
              href={playlistsUrl}
              className={styles.menuItem}
              onClick={handleClose}
            >
              <span className={styles.menuItemIcon}><LocalOfferOutlined /></span>
              <span className={styles.menuItemLabel}>My Playlists</span>
            </Link>
          </nav>

          {/* Recents section */}
          {recentSessions.length > 0 && (
            <>
              <div className={styles.divider} />
              <MuiTypography variant="body2" component="span" color="text.secondary" className={styles.sectionLabel}>
                Recent Sessions
              </MuiTypography>
              {recentSessions.slice(0, 5).map((storedSession) => (
                <button
                  type="button"
                  key={storedSession.id}
                  className={styles.recentItem}
                  onClick={() => handleResumeSession(storedSession)}
                >
                  <HistoryOutlined className={styles.recentItemIcon} />
                  <div className={styles.recentItemInfo}>
                    <div className={styles.recentItemName}>
                      {storedSession.name || `${extractBoardName(storedSession.boardPath)} Session`}
                    </div>
                    <div className={styles.recentItemMeta}>
                      {extractBoardName(storedSession.boardPath)}
                      {storedSession.participantCount !== undefined && storedSession.participantCount > 0 && (
                        <> <GroupOutlined /> {storedSession.participantCount}</>
                      )}
                      {' '}{formatRelativeTime(storedSession.lastActivity || storedSession.createdAt)}
                    </div>
                  </div>
                  <PlayCircleOutlineOutlined className={styles.recentItemAction} />
                </button>
              ))}
            </>
          )}

          <div className={styles.divider} />

          {/* Help/About section */}
          <Link
            href="/help"
            className={styles.menuItem}
            onClick={handleClose}
          >
            <span className={styles.menuItemIcon}><HelpOutlineOutlined /></span>
            <span className={styles.menuItemLabel}>Help</span>
          </Link>

          <Link
            href="/about"
            className={styles.menuItem}
            onClick={handleClose}
          >
            <span className={styles.menuItemIcon}><InfoOutlined /></span>
            <span className={styles.menuItemLabel}>About</span>
          </Link>

          {/* Logout */}
          {session?.user && (
            <>
              <div className={styles.divider} />
              <button
                type="button"
                className={`${styles.menuItem} ${styles.dangerItem}`}
                onClick={handleSignOut}
              >
                <span className={styles.menuItemIcon}><LogoutOutlined /></span>
                <span className={styles.menuItemLabel}>Logout</span>
              </button>
            </>
          )}

          {/* Spacer to push toggle to bottom */}
          <div className={styles.bottomSpacer} />

          {/* Sun/Moon toggle */}
          <div className={styles.themeToggleContainer}>
            <div className={styles.themeToggle} onClick={toggleMode} role="button" tabIndex={0} aria-label="Toggle dark mode">
              <div className={`${styles.themeToggleThumb} ${mode === 'dark' ? styles.themeToggleThumbDark : ''}`} />
              <div className={`${styles.themeToggleOption} ${mode === 'light' ? styles.themeToggleOptionActive : ''}`}>
                <LightModeOutlined sx={{ fontSize: 16 }} />
              </div>
              <div className={`${styles.themeToggleOption} ${mode === 'dark' ? styles.themeToggleOptionActive : ''}`}>
                <DarkModeOutlined sx={{ fontSize: 16 }} />
              </div>
            </div>
          </div>
        </div>
      </SwipeableDrawer>

      <AuthModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        title="Sign in to Boardsesh"
        description="Sign in to access all features including saving favorites, tracking ascents, and more."
      />

      {boardDetails && (
        <HoldClassificationWizard
          open={showHoldClassification}
          onClose={() => setShowHoldClassification(false)}
          boardDetails={boardDetails}
        />
      )}

      {boardConfigs && (
        <BoardSelectorDrawer
          open={showBoardSelector}
          onClose={() => setShowBoardSelector(false)}
          boardConfigs={boardConfigs}
        />
      )}
    </>
  );
}
