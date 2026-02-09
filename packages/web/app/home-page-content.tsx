'use client';

import React, { useState } from 'react';
import Box from '@mui/material/Box';
import MuiButton from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import PersonSearchOutlined from '@mui/icons-material/PersonSearchOutlined';
import HomeOutlined from '@mui/icons-material/HomeOutlined';
import FormatListBulletedOutlined from '@mui/icons-material/FormatListBulletedOutlined';
import LocalOfferOutlined from '@mui/icons-material/LocalOfferOutlined';
import AddOutlined from '@mui/icons-material/AddOutlined';
import Logo from '@/app/components/brand/logo';
import FollowingAscentsFeed from '@/app/components/social/following-ascents-feed';
import UserSearchDrawer from '@/app/components/social/user-search-drawer';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getDefaultBoardCookieClient } from '@/app/lib/default-board-cookie';
import { themeTokens } from '@/app/theme/theme-config';
import styles from '@/app/components/bottom-tab-bar/bottom-tab-bar.module.css';

export default function HomePageContent() {
  const { data: session } = useSession();
  const [searchOpen, setSearchOpen] = useState(false);
  const router = useRouter();

  const handleBoardNav = (suffix: string) => {
    const boardUrl = getDefaultBoardCookieClient();
    if (boardUrl) {
      // Default board cookie stores path like /kilter/original/12x12/led/40/list
      // Strip the trailing segment (/list, /playlists, etc.) and append the desired one
      const basePath = boardUrl.replace(/\/[^/]+$/, '');
      router.push(`${basePath}/${suffix}`);
    } else {
      router.push('/?select=true');
    }
  };

  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', pb: '60px' }}>
      {/* Header */}
      <Box
        component="header"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1.5,
          borderBottom: `1px solid ${themeTokens.neutral[200]}`,
        }}
      >
        <Logo size="sm" showText={false} linkToHome={false} />
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <MuiButton
            startIcon={<PersonSearchOutlined />}
            onClick={() => setSearchOpen(true)}
            size="small"
            variant="outlined"
          >
            Find Climbers
          </MuiButton>
          {session?.user?.id && (
            <MuiButton
              component={Link}
              href={`/crusher/${session.user.id}`}
              size="small"
              variant="text"
            >
              Profile
            </MuiButton>
          )}
        </Box>
      </Box>

      {/* Feed */}
      <Box component="main" sx={{ flex: 1, px: 2, py: 2 }}>
        <Typography variant="h6" component="h1" sx={{ mb: 2 }}>
          Activity
        </Typography>
        <FollowingAscentsFeed onFindClimbers={() => setSearchOpen(true)} />
      </Box>

      {/* Bottom Tab Bar */}
      <div className={styles.tabBar} style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1100 }}>
        {/* Home tab (active) */}
        <button
          className={styles.tabItem}
          style={{ color: themeTokens.colors.primary }}
          aria-label="Home"
          role="tab"
          aria-selected={true}
        >
          <HomeOutlined style={{ fontSize: 20 }} />
          <span className={styles.tabLabel}>Home</span>
        </button>

        {/* Climbs tab */}
        <button
          className={styles.tabItem}
          onClick={() => handleBoardNav('list')}
          style={{ color: themeTokens.neutral[400] }}
          aria-label="Climbs"
          role="tab"
          aria-selected={false}
        >
          <FormatListBulletedOutlined style={{ fontSize: 20 }} />
          <span className={styles.tabLabel}>Climb</span>
        </button>

        {/* Library tab */}
        <button
          className={styles.tabItem}
          onClick={() => handleBoardNav('playlists')}
          style={{ color: themeTokens.neutral[400] }}
          aria-label="Your library"
          role="tab"
          aria-selected={false}
        >
          <LocalOfferOutlined style={{ fontSize: 20 }} />
          <span className={styles.tabLabel}>Your Library</span>
        </button>

        {/* Create tab */}
        <button
          className={styles.tabItem}
          onClick={() => handleBoardNav('create')}
          style={{ color: themeTokens.neutral[400] }}
          aria-label="Create"
          role="tab"
          aria-selected={false}
        >
          <AddOutlined style={{ fontSize: 20 }} />
          <span className={styles.tabLabel}>Create</span>
        </button>
      </div>

      <UserSearchDrawer open={searchOpen} onClose={() => setSearchOpen(false)} />
    </Box>
  );
}
