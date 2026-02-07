'use client';

import React, { useState } from 'react';
import { BulbOutlined, BulbFilled, AppleOutlined } from '@ant-design/icons';
import { Button, Modal, Typography } from 'antd';
import { useBluetoothContext } from './bluetooth-context';
import { useQueueContext } from '../graphql-queue';
import './send-climb-to-board-button.css';

const { Text, Paragraph } = Typography;

type SendClimbToBoardButtonProps = {
  buttonType?: 'default' | 'text';
};

const SendClimbToBoardButton: React.FC<SendClimbToBoardButtonProps> = ({
  buttonType = 'default',
}) => {
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
      <Button
        id="button-illuminate"
        type={buttonType}
        danger={!isBluetoothSupported}
        icon={
          isConnected ? (
            <BulbFilled className="connect-button-glow" />
          ) : (
            <BulbOutlined />
          )
        }
        onClick={handleClick}
        loading={loading}
        disabled={isBluetoothSupported && !currentClimbQueueItem}
      />
      <Modal
        title="Web Bluetooth Not Supported"
        open={showBluetoothWarning}
        onCancel={() => setShowBluetoothWarning(false)}
        footer={
          <Button onClick={() => setShowBluetoothWarning(false)}>Close</Button>
        }
      >
        <Paragraph>
          <Text>
            Your browser does not support Web Bluetooth, which means you
            won&#39;t be able to illuminate routes on the board.
          </Text>
        </Paragraph>
        {isIOS ? (
          <>
            <Paragraph>
              To control your board from an iOS device, install the Bluefy
              browser:
            </Paragraph>
            <Button
              type="primary"
              icon={<AppleOutlined />}
              href="https://apps.apple.com/us/app/bluefy-web-ble-browser/id1492822055"
              target="_blank"
            >
              Download Bluefy from the App Store
            </Button>
          </>
        ) : (
          <Paragraph>
            For the best experience, please use Chrome or another
            Chromium-based browser.
          </Paragraph>
        )}
      </Modal>
    </>
  );
};

export default SendClimbToBoardButton;
