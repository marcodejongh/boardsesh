'use client';

import React, { useState } from 'react';
import { LightbulbOutlined, Lightbulb } from '@mui/icons-material';
import Apple from '@mui/icons-material/Apple';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import { useBluetoothContext } from './bluetooth-context';
import { useQueueContext } from '../graphql-queue';
import './send-climb-to-board-button.css';

const SendClimbToBoardButton: React.FC = () => {
  const { currentClimbQueueItem } = useQueueContext();
  const { isConnected, loading, connect, isBluetoothSupported, isIOS } =
    useBluetoothContext();
  const [showBluetoothWarning, setShowBluetoothWarning] = useState(false);

  const handleClick = async () => {
    if (!isBluetoothSupported) {
      setShowBluetoothWarning(true);
      return;
    }

    if (currentClimbQueueItem) {
      await connect(
        currentClimbQueueItem.climb.frames,
        !!currentClimbQueueItem.climb.mirrored,
      );
    } else {
      await connect();
    }
  };

  return (
    <>
      <IconButton
        id="button-illuminate"
        color={!isBluetoothSupported ? 'error' : 'default'}
        onClick={handleClick}
        disabled={loading || (isBluetoothSupported && !currentClimbQueueItem)}
      >
        {loading ? (
          <CircularProgress size={16} />
        ) : isConnected ? (
          <Lightbulb className="connect-button-glow" />
        ) : (
          <LightbulbOutlined />
        )}
      </IconButton>
      <Dialog
        open={showBluetoothWarning}
        onClose={() => setShowBluetoothWarning(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Web Bluetooth Not Supported</DialogTitle>
        <DialogContent>
          <Typography variant="body1" component="p">
            <Typography variant="body2" component="span">
              Your browser does not support Web Bluetooth, which means you
              won&#39;t be able to illuminate routes on the board.
            </Typography>
          </Typography>
          {isIOS ? (
            <>
              <Typography variant="body1" component="p">
                To control your board from an iOS device, install the Bluefy
                browser:
              </Typography>
              <Button
                variant="contained"
                startIcon={<Apple />}
                href="https://apps.apple.com/us/app/bluefy-web-ble-browser/id1492822055"
                target="_blank"
              >
                Download Bluefy from the App Store
              </Button>
            </>
          ) : (
            <Typography variant="body1" component="p">
              For the best experience, please use Chrome or another
              Chromium-based browser.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setShowBluetoothWarning(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default SendClimbToBoardButton;
