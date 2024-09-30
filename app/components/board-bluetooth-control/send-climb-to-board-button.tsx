'use client';

import React, { useCallback, useRef, useState } from 'react';
import { BulbOutlined, BulbFilled } from '@ant-design/icons';
import { Button } from 'antd';
import { useQueueContext } from '../queue-control/queue-context';
import { BoardDetails } from '@/app/lib/types';
import './send-climb-to-board-button.css'; // Import your custom styles
import {
  getBluetoothPacket,
  getCharacteristic,
  requestDevice,
  splitMessages,
  writeCharacteristicSeries,
} from './bluetooth';

type SendClimbToBoardButtonProps = { boardDetails: BoardDetails };

// React component
const SendClimbToBoardButton: React.FC<SendClimbToBoardButtonProps> = ({ boardDetails }) => {
  const { currentClimbQueueItem } = useQueueContext();
  const [loading, setLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false); // Track Bluetooth connection state

  // Store Bluetooth device and characteristic across renders
  const bluetoothDeviceRef = useRef<BluetoothDevice | null>(null);
  const characteristicRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null);

  const handleClick = useCallback(async () => {
    if (!currentClimbQueueItem) return;

    setLoading(true);

    const { frames } = currentClimbQueueItem.climb;
    const placementPositions = boardDetails.ledPlacements;

    const bluetoothPacket = getBluetoothPacket(frames, placementPositions);

    try {
      const device = await requestDevice('kilterboard');
      const characteristic = await getCharacteristic(device);

      if (characteristic) {
        bluetoothDeviceRef.current = device;
        characteristicRef.current = characteristic;
        setIsConnected(true); // Mark as connected
      }

      if (characteristicRef.current) {
        await writeCharacteristicSeries(characteristicRef.current, splitMessages(bluetoothPacket));
      }
    } catch (error) {
      console.error('Error illuminating climb:', error);
      setIsConnected(false); // Mark as disconnected if an error occurs
    } finally {
      setLoading(false);
    }
  }, [currentClimbQueueItem, boardDetails]);

  return (
    <Button
      id="button-illuminate"
      type="default"
      icon={isConnected ? <BulbFilled className={'connect-button-glow'} /> : <BulbOutlined />} // Conditionally apply "glow" class
      onClick={handleClick}
      loading={loading}
      disabled={!currentClimbQueueItem}
    />
  );
};

export default SendClimbToBoardButton;
