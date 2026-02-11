'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import MuiButton from '@mui/material/Button';
import MuiTypography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Drawer from '@mui/material/Drawer';
import CloseOutlined from '@mui/icons-material/CloseOutlined';
import AddOutlined from '@mui/icons-material/AddOutlined';
import { useWsAuthToken } from '@/app/hooks/use-ws-auth-token';
import { usePathname } from 'next/navigation';
import { getPreference, setPreference } from '@/app/lib/user-preferences-db';
import { themeTokens } from '@/app/theme/theme-config';
import { constructBoardSlugListUrl } from '@/app/lib/url-utils';
import { useRouter } from 'next/navigation';
import CreateBoardForm from './create-board-form';
import type { UserBoard } from '@boardsesh/shared-schema';

const DISMISS_KEY_PREFIX = 'boardCreationBannerDismissed:';

interface BoardCreationBannerProps {
  boardType: string;
  layoutId: number;
  sizeId: number;
  setIds: string;
  angle: number;
}

export default function BoardCreationBanner({
  boardType,
  layoutId,
  sizeId,
  setIds,
  angle,
}: BoardCreationBannerProps) {
  const [isDismissed, setIsDismissed] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { isAuthenticated } = useWsAuthToken();
  const router = useRouter();
  const pathname = usePathname();

  const dismissKey = `${DISMISS_KEY_PREFIX}${boardType}:${layoutId}:${sizeId}:${setIds}`;

  useEffect(() => {
    if (!isAuthenticated) return;

    const checkDismissed = async () => {
      const dismissed = await getPreference<boolean>(dismissKey);
      setIsDismissed(dismissed === true);
    };
    checkDismissed();
  }, [isAuthenticated, dismissKey]);

  const handleDismiss = useCallback(async () => {
    setIsDismissed(true);
    await setPreference(dismissKey, true);
  }, [dismissKey]);

  const handleBoardCreated = useCallback((board: UserBoard) => {
    setIsDrawerOpen(false);
    setIsDismissed(true);
    router.push(constructBoardSlugListUrl(board.slug, angle));
  }, [router, angle]);

  // Already on a /b/ slug route — user has a board, don't show banner
  if (pathname.startsWith('/b/')) {
    return null;
  }

  if (!isAuthenticated || isDismissed) {
    return null;
  }

  return (
    <>
      <Card
        variant="outlined"
        sx={{
          mb: 2,
          borderColor: themeTokens.colors.primary,
          borderRadius: `${themeTokens.borderRadius.lg}px`,
          backgroundColor: 'var(--semantic-selected-light)',
        }}
      >
        <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
            <Box sx={{ flex: 1 }}>
              <MuiTypography
                variant="body2"
                sx={{ fontWeight: themeTokens.typography.fontWeight.medium }}
              >
                Climbing here? Save this board for leaderboards and a personalized feed.
              </MuiTypography>
            </Box>
            <IconButton size="small" onClick={handleDismiss} sx={{ mt: -0.5, mr: -0.5 }}>
              <CloseOutlined sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>
          <MuiButton
            variant="contained"
            size="small"
            startIcon={<AddOutlined />}
            onClick={() => setIsDrawerOpen(true)}
            sx={{ mt: 1, textTransform: 'none' }}
          >
            Save Board
          </MuiButton>
        </CardContent>
      </Card>

      <Drawer
        anchor="bottom"
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        PaperProps={{
          sx: {
            maxHeight: '80dvh',
            borderTopLeftRadius: themeTokens.borderRadius.xl,
            borderTopRightRadius: themeTokens.borderRadius.xl,
            p: 2,
          },
        }}
      >
        <CreateBoardForm
          boardType={boardType}
          layoutId={layoutId}
          sizeId={sizeId}
          setIds={setIds}
          defaultAngle={angle}
          onSuccess={handleBoardCreated}
          onCancel={() => setIsDrawerOpen(false)}
        />
      </Drawer>
    </>
  );
}
