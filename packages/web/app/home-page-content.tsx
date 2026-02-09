'use client';

import React, { useState } from 'react';
import Box from '@mui/material/Box';
import MuiButton from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import PersonSearchOutlined from '@mui/icons-material/PersonSearchOutlined';
import SwapHorizOutlined from '@mui/icons-material/SwapHorizOutlined';
import Logo from '@/app/components/brand/logo';
import FollowingAscentsFeed from '@/app/components/social/following-ascents-feed';
import UserSearchDrawer from '@/app/components/social/user-search-drawer';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { themeTokens } from '@/app/theme/theme-config';

export default function HomePageContent() {
  const { data: session } = useSession();
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
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
        <Logo size="sm" showText />
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

      {/* Footer link to board selector */}
      <Box sx={{ px: 2, py: 2, textAlign: 'center' }}>
        <MuiButton
          component={Link}
          href="/?select=true"
          startIcon={<SwapHorizOutlined />}
          variant="text"
          size="small"
        >
          Switch Board
        </MuiButton>
      </Box>

      <UserSearchDrawer open={searchOpen} onClose={() => setSearchOpen(false)} />
    </Box>
  );
}
