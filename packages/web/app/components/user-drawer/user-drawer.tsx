'use client';

import React, { useState, useEffect } from 'react';
import { Avatar, Typography, Button } from 'antd';
import {
  UserOutlined,
  SettingOutlined,
  LineChartOutlined,
  LogoutOutlined,
  LoginOutlined,
  QuestionCircleOutlined,
  InfoCircleOutlined,
  AimOutlined,
  TagOutlined,
  SwapOutlined,
  HistoryOutlined,
  PlayCircleOutlined,
  TeamOutlined,
} from '@ant-design/icons';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SwipeableDrawer from '../swipeable-drawer/swipeable-drawer';
import AuthModal from '../auth/auth-modal';
import { HoldClassificationWizard } from '../hold-classification';
import { BoardDetails } from '@/app/lib/types';
import { generateLayoutSlug, generateSizeSlug, generateSetSlug } from '@/app/lib/url-utils';
import {
  type StoredSession,
  getRecentSessions,
  formatRelativeTime,
  extractBoardName,
} from '@/app/lib/session-history-db';
import styles from './user-drawer.module.css';

interface UserDrawerProps {
  boardDetails: BoardDetails;
  angle?: number;
}

export default function UserDrawer({ boardDetails, angle }: UserDrawerProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showHoldClassification, setShowHoldClassification] = useState(false);
  const [recentSessions, setRecentSessions] = useState<StoredSession[]>([]);

  const isMoonboard = boardDetails.board_name === 'moonboard';

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

  const playlistsUrl = (() => {
    const { board_name, layout_name, size_name, size_description, set_names } = boardDetails;
    if (layout_name && size_name && set_names && angle !== undefined) {
      return `/${board_name}/${generateLayoutSlug(layout_name)}/${generateSizeSlug(size_name, size_description)}/${generateSetSlug(set_names)}/${angle}/playlists`;
    }
    return null;
  })();

  const userAvatar = session?.user?.image;
  const userName = session?.user?.name;
  const userEmail = session?.user?.email;
  const avatarClass = session?.user ? styles.avatarLoggedIn : styles.avatarLoggedOut;

  return (
    <>
      <Button
        type="text"
        onClick={() => setIsOpen(true)}
        aria-label="User menu"
        className={styles.avatarButton}
      >
        <Avatar
          size={28}
          src={userAvatar}
          icon={!userAvatar ? <UserOutlined /> : undefined}
          className={avatarClass}
        />
      </Button>

      <SwipeableDrawer
        placement="left"
        open={isOpen}
        onClose={handleClose}
        closable
        width={300}
        title={null}
      >
        <div className={styles.drawerBody}>
          {/* Profile section */}
          <div className={styles.profileSection}>
            <Avatar
              size={64}
              src={userAvatar}
              icon={!userAvatar ? <UserOutlined /> : undefined}
              className={avatarClass}
            />
            {session?.user ? (
              <>
                {userName && (
                  <Typography.Text strong className={styles.userName}>
                    {userName}
                  </Typography.Text>
                )}
                {userEmail && (
                  <Typography.Text type="secondary" className={styles.userEmail}>
                    {userEmail}
                  </Typography.Text>
                )}
              </>
            ) : (
              <Button
                type="primary"
                icon={<LoginOutlined />}
                onClick={() => {
                  handleClose();
                  setShowAuthModal(true);
                }}
              >
                Sign in
              </Button>
            )}
          </div>

          <div className={styles.divider} />

          {/* Navigation section */}
          <nav>
            <Link
              href="/"
              className={styles.menuItem}
              onClick={handleClose}
            >
              <span className={styles.menuItemIcon}><SwapOutlined /></span>
              <span className={styles.menuItemLabel}>Change Board</span>
            </Link>

            {session?.user && (
              <Link
                href={`/crusher/${session.user.id}`}
                className={styles.menuItem}
                onClick={handleClose}
              >
                <span className={styles.menuItemIcon}><LineChartOutlined /></span>
                <span className={styles.menuItemLabel}>Profile</span>
              </Link>
            )}

            <Link
              href="/settings"
              className={styles.menuItem}
              onClick={handleClose}
            >
              <span className={styles.menuItemIcon}><SettingOutlined /></span>
              <span className={styles.menuItemLabel}>Settings</span>
            </Link>

            {!isMoonboard && (
              <button
                type="button"
                className={styles.menuItem}
                onClick={() => {
                  handleClose();
                  setShowHoldClassification(true);
                }}
              >
                <span className={styles.menuItemIcon}><AimOutlined /></span>
                <span className={styles.menuItemLabel}>Classify Holds</span>
              </button>
            )}

            {playlistsUrl && !isMoonboard && (
              <Link
                href={playlistsUrl}
                className={styles.menuItem}
                onClick={handleClose}
              >
                <span className={styles.menuItemIcon}><TagOutlined /></span>
                <span className={styles.menuItemLabel}>My Playlists</span>
              </Link>
            )}
          </nav>

          {/* Recents section */}
          {recentSessions.length > 0 && (
            <>
              <div className={styles.divider} />
              <Typography.Text type="secondary" className={styles.sectionLabel}>
                Recent Sessions
              </Typography.Text>
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
                        <> <TeamOutlined /> {storedSession.participantCount}</>
                      )}
                      {' '}{formatRelativeTime(storedSession.lastActivity || storedSession.createdAt)}
                    </div>
                  </div>
                  <PlayCircleOutlined className={styles.recentItemAction} />
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
            <span className={styles.menuItemIcon}><QuestionCircleOutlined /></span>
            <span className={styles.menuItemLabel}>Help</span>
          </Link>

          <Link
            href="/about"
            className={styles.menuItem}
            onClick={handleClose}
          >
            <span className={styles.menuItemIcon}><InfoCircleOutlined /></span>
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
        </div>
      </SwipeableDrawer>

      <AuthModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        title="Sign in to Boardsesh"
        description="Sign in to access all features including saving favorites, tracking ascents, and more."
      />

      <HoldClassificationWizard
        open={showHoldClassification}
        onClose={() => setShowHoldClassification(false)}
        boardDetails={boardDetails}
      />
    </>
  );
}
