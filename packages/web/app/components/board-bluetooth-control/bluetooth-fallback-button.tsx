'use client';

import React, { useState } from 'react';
import LightbulbOutlined from '@mui/icons-material/LightbulbOutlined';
import AppleOutlined from '@mui/icons-material/Apple';
import IconButton from '@mui/material/IconButton';
import MuiButton from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import SwipeableDrawer from '../swipeable-drawer/swipeable-drawer';
import { useBluetoothContext } from './bluetooth-context';
import { themeTokens } from '@/app/theme/theme-config';

export const BluetoothFallbackButton = () => {
  const { isIOS } = useBluetoothContext();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <>
      <IconButton
        aria-label="Bluetooth not supported"
        onClick={() => setIsDrawerOpen(true)}
        color="error"
      >
        <LightbulbOutlined />
      </IconButton>
      <SwipeableDrawer
        title="Connect to Board"
        placement="bottom"
        onClose={() => setIsDrawerOpen(false)}
        open={isDrawerOpen}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
              padding: '12px',
              background: 'var(--color-warning-bg)',
              border: `1px solid ${themeTokens.colors.warning}`,
              borderRadius: themeTokens.borderRadius.md,
            }}
          >
            <Typography variant="body2">
              Your browser does not support Web Bluetooth, which means you
              won&#39;t be able to illuminate routes on the board.
            </Typography>
            {isIOS ? (
              <>
                <Typography variant="body2">
                  To control your board from an iOS device, install the Bluefy
                  browser:
                </Typography>
                <MuiButton
                  variant="contained"
                  startIcon={<AppleOutlined />}
                  href="https://apps.apple.com/us/app/bluefy-web-ble-browser/id1492822055"
                  target="_blank"
                >
                  Download Bluefy from the App Store
                </MuiButton>
              </>
            ) : (
              <Typography variant="body2">
                For the best experience, please use Chrome or another
                Chromium-based browser.
              </Typography>
            )}
          </Box>
        </Box>
      </SwipeableDrawer>
    </>
  );
};
