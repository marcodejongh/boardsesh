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
import { themeTokens } from '@/app/theme/theme-config';
import styles from './user-drawer.module.css';

const { Text } = Typography;

// Session history types and helpers (reused from session-history-panel)
type StoredSession = {
  id: string;
  name: string | null;
  boardPath: string;
  createdAt: string;
  lastActivity: string;
  participantCount?: number;
};

const DB_NAME = 'boardsesh-sessions';
const DB_VERSION = 1;
const STORE_NAME = 'session-history';

async function initSessionDB() {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return null;
  }

  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('lastActivity', 'lastActivity', { unique: false });
      }
    };
  });
}

async function getRecentSessions(): Promise<StoredSession[]> {
  const db = await initSessionDB();
  if (!db) return [];

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const sessions = request.result as StoredSession[];
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const recentSessions = sessions
        .filter((s) => new Date(s.lastActivity || s.createdAt) > sevenDaysAgo)
        .sort(
          (a, b) =>
            new Date(b.lastActivity || b.createdAt).getTime() -
            new Date(a.lastActivity || a.createdAt).getTime(),
        );
      resolve(recentSessions);
    };
  });
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min${diffMins === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  return date.toLocaleDateString();
}

function extractBoardName(boardPath: string): string {
  const parts = boardPath.split('/').filter(Boolean);
  if (parts.length > 0) {
    return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  }
  return 'Unknown Board';
}

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
        .catch(console.error);
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

  return (
    <>
      <Button
        type="text"
        onClick={() => setIsOpen(true)}
        aria-label="User menu"
        style={{ padding: 0, width: 32, height: 32 }}
      >
        <Avatar
          size={28}
          src={userAvatar}
          icon={!userAvatar ? <UserOutlined /> : undefined}
          style={{
            backgroundColor: session?.user ? themeTokens.colors.primary : themeTokens.neutral[300],
            cursor: 'pointer',
          }}
        />
      </Button>

      <SwipeableDrawer
        placement="left"
        open={isOpen}
        onClose={handleClose}
        closable
        width={300}
        styles={{
          body: { padding: `${themeTokens.spacing[3]}px ${themeTokens.spacing[2]}px` },
        }}
        title={null}
      >
        <div className={styles.drawerBody}>
          {/* Profile section */}
          <div className={styles.profileSection}>
            <Avatar
              size={64}
              src={userAvatar}
              icon={!userAvatar ? <UserOutlined /> : undefined}
              style={{
                backgroundColor: session?.user ? themeTokens.colors.primary : themeTokens.neutral[300],
              }}
            />
            {session?.user ? (
              <>
                {userName && (
                  <Text strong style={{ fontSize: themeTokens.typography.fontSize.lg }}>
                    {userName}
                  </Text>
                )}
                {userEmail && (
                  <Text type="secondary" style={{ fontSize: themeTokens.typography.fontSize.sm }}>
                    {userEmail}
                  </Text>
                )}
                <Link
                  href={`/crusher/${session.user.id}`}
                  onClick={handleClose}
                  style={{ textDecoration: 'none' }}
                >
                  <Button type="link" size="small">View Profile</Button>
                </Link>
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
              <Text
                type="secondary"
                style={{
                  fontSize: themeTokens.typography.fontSize.xs,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  fontWeight: themeTokens.typography.fontWeight.semibold,
                  padding: `${themeTokens.spacing[1]}px ${themeTokens.spacing[4]}px`,
                  display: 'block',
                }}
              >
                Recent Sessions
              </Text>
              {recentSessions.slice(0, 5).map((storedSession) => (
                <button
                  key={storedSession.id}
                  className={styles.recentItem}
                  onClick={() => handleResumeSession(storedSession)}
                >
                  <HistoryOutlined style={{ color: themeTokens.neutral[400], fontSize: 16 }} />
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
                  <PlayCircleOutlined style={{ color: themeTokens.colors.primary, fontSize: 16 }} />
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

          {/* Profile link in menu (when logged in) */}
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

          {/* Logout */}
          {session?.user && (
            <>
              <div className={styles.divider} />
              <button
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
