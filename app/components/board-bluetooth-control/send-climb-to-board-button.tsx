'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BulbOutlined, BulbFilled } from '@ant-design/icons';
import { Button, message } from 'antd';
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

  // Function to send climb data to the board
  const sendClimbToBoard = useCallback(async () => {
    if (!currentClimbQueueItem || !characteristicRef.current) return;

    const { frames } = currentClimbQueueItem.climb;
    const placementPositions = boardDetails.ledPlacements;

    const bluetoothPacket = getBluetoothPacket(frames, placementPositions, boardDetails.board_name);

    try {
      if (characteristicRef.current) {
        await writeCharacteristicSeries(characteristicRef.current, splitMessages(bluetoothPacket));
      }
    } catch (error) {
      console.error('Error sending climb to board:', error);
    }
  }, [currentClimbQueueItem, boardDetails]);

  // Handle button click to initiate Bluetooth connection
  const handleClick = useCallback(async () => {
    if (!navigator.bluetooth) {
      return message.error('Current browser does not support Web Bluetooth.');
    }

    setLoading(true);

    try {
      // Request Bluetooth connection if not already connected
      if (!bluetoothDeviceRef.current || !characteristicRef.current) {
        const bluetoothboardname = boardDetails.board_name[0].toUpperCase() + boardDetails.board_name.slice(1);
        const device = await requestDevice(bluetoothboardname);
        const characteristic = await getCharacteristic(device);

        if (characteristic) {
          bluetoothDeviceRef.current = device;
          characteristicRef.current = characteristic;
          setIsConnected(true); // Mark as connected
        }
      }

      // Immediately send the climb after connecting
      if (characteristicRef.current) {
        await sendClimbToBoard();
      }
    } catch (error) {
      console.error('Error connecting to Bluetooth:', error);
      setIsConnected(false); // Mark as disconnected if an error occurs
    } finally {
      setLoading(false);
    }
  }, [sendClimbToBoard, boardDetails]);

  // Automatically send climb when currentClimbQueueItem changes (only if connected)
  useEffect(() => {
    if (isConnected) {
      sendClimbToBoard();
    }
  }, [currentClimbQueueItem, isConnected, sendClimbToBoard]);

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
