'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BulbOutlined, BulbFilled, AppleOutlined } from '@ant-design/icons';
import { Button, Modal, Typography } from 'antd';
import { track } from '@vercel/analytics';

const { Text, Paragraph } = Typography;
import { useQueueContext } from '../graphql-queue';
import { BoardDetails } from '@/app/lib/types';
import './send-climb-to-board-button.css'; // Import your custom styles
import {
  getBluetoothPacket,
  getCharacteristic,
  requestDevice,
  splitMessages,
  writeCharacteristicSeries,
} from './bluetooth';
import { useWakeLock } from './use-wake-lock';
import { convertToMirroredFramesString, createLedPlacementsFetcher } from './bluetooth-utils';

type SendClimbToBoardButtonProps = { boardDetails: BoardDetails };

// React component
const SendClimbToBoardButton: React.FC<SendClimbToBoardButtonProps> = ({ boardDetails }) => {
  const { currentClimbQueueItem } = useQueueContext();
  const [loading, setLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false); // Track Bluetooth connection state
  const [showBluetoothWarning, setShowBluetoothWarning] = useState(false);

  // Prevent device from sleeping while connected to the board
  useWakeLock(isConnected);

  // Detect if the device is iOS
  const isIOS =
    typeof navigator !== 'undefined' &&
    /iPhone|iPad|iPod/i.test(navigator.userAgent || (navigator as { vendor?: string }).vendor || '');

  // Check if Web Bluetooth is supported
  const isBluetoothSupported = typeof navigator !== 'undefined' && !!navigator.bluetooth;

  // Store Bluetooth device and characteristic across renders
  const bluetoothDeviceRef = useRef<BluetoothDevice | null>(null);
  const characteristicRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null);

  // Create a cached LED placements fetcher (stable across renders)
  const fetchLedPlacementsCached = useRef(createLedPlacementsFetcher()).current;

  // Handler for device disconnection
  const handleDisconnection = useCallback(() => {
    setIsConnected(false);
    characteristicRef.current = null;
    // Don't clear the device ref so we can potentially reconnect to the same device
  }, []);

  // Clean up disconnect listener from a device
  const cleanupDeviceListeners = useCallback(
    (device: BluetoothDevice | null) => {
      if (device) {
        device.removeEventListener('gattserverdisconnected', handleDisconnection);
      }
    },
    [handleDisconnection],
  );

  // Function to send climb data to the board
  const sendClimbToBoard = useCallback(async () => {
    if (!currentClimbQueueItem || !characteristicRef.current) return;

    let { frames } = currentClimbQueueItem.climb;

    const placementPositions = await fetchLedPlacementsCached(
      boardDetails.board_name,
      boardDetails.layout_id,
      boardDetails.size_id
    );
    if (!placementPositions) {
      console.error('Failed to get LED placements');
      return;
    }

    if (currentClimbQueueItem.climb?.mirrored) {
      frames = convertToMirroredFramesString(frames, boardDetails.holdsData);
    }
    const bluetoothPacket = getBluetoothPacket(frames, placementPositions, boardDetails.board_name);

    try {
      if (characteristicRef.current) {
        await writeCharacteristicSeries(characteristicRef.current, splitMessages(bluetoothPacket));
        track('Climb Sent to Board Success', {
          climbUuid: currentClimbQueueItem.climb?.uuid,
          boardLayout: `${boardDetails.layout_name}`,
        });
      }
    } catch (error) {
      console.error('Error sending climb to board:', error);
      track('Climb Sent to Board Failure', {
        climbUuid: currentClimbQueueItem.climb?.uuid,
        boardLayout: `${boardDetails.layout_name}`,
      });
    }
  }, [currentClimbQueueItem, boardDetails, fetchLedPlacementsCached]);

  // Handle button click to initiate Bluetooth connection
  const handleClick = useCallback(async () => {
    if (!navigator.bluetooth) {
      setShowBluetoothWarning(true);
      return;
    }

    setLoading(true);

    try {
      // Clean up any existing device listeners before requesting a new device
      cleanupDeviceListeners(bluetoothDeviceRef.current);

      // Always request a new device to allow connecting to a different board
      // or reconnecting to the same board
      const device = await requestDevice();
      const characteristic = await getCharacteristic(device);

      if (characteristic) {
        // Set up disconnection listener
        device.addEventListener('gattserverdisconnected', handleDisconnection);

        bluetoothDeviceRef.current = device;
        characteristicRef.current = characteristic;

        track('Bluetooth Connection Success', {
          boardLayout: `${boardDetails.layout_name}`,
        });

        // Send the current climb immediately after connection is established
        // Button is disabled when no climb is selected, so currentClimbQueueItem should always exist here
        if (currentClimbQueueItem) {
          try {
            let { frames } = currentClimbQueueItem.climb;
            const placementPositions = await fetchLedPlacementsCached(
              boardDetails.board_name,
              boardDetails.layout_id,
              boardDetails.size_id
            );
            if (!placementPositions) {
              console.error('Failed to get LED placements');
            } else {
              if (currentClimbQueueItem.climb?.mirrored) {
                frames = convertToMirroredFramesString(frames, boardDetails.holdsData);
              }
              const bluetoothPacket = getBluetoothPacket(frames, placementPositions, boardDetails.board_name);
              await writeCharacteristicSeries(characteristic, splitMessages(bluetoothPacket));
              track('Climb Sent to Board Success', {
                climbUuid: currentClimbQueueItem.climb?.uuid,
                boardLayout: `${boardDetails.layout_name}`,
              });
            }
          } catch (sendError) {
            console.error('Error sending climb after connection:', sendError);
          }
        }

        // Set connected state after successful send attempt
        setIsConnected(true);
      }
    } catch (error) {
      console.error('Error connecting to Bluetooth:', error);
      setIsConnected(false);
      characteristicRef.current = null;
      track('Bluetooth Connection Failed', {
        boardLayout: `${boardDetails.layout_name}`,
      });
    } finally {
      setLoading(false);
    }
  }, [cleanupDeviceListeners, handleDisconnection, boardDetails, currentClimbQueueItem, fetchLedPlacementsCached]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      cleanupDeviceListeners(bluetoothDeviceRef.current);
    };
  }, [cleanupDeviceListeners]);

  // Automatically send climb when currentClimbQueueItem changes (only if connected)
  useEffect(() => {
    if (isConnected) {
      sendClimbToBoard();
    }
  }, [currentClimbQueueItem, isConnected, sendClimbToBoard]);

  return (
    <>
      <Button
        id="button-illuminate"
        type="default"
        danger={!isBluetoothSupported}
        icon={isConnected ? <BulbFilled className={'connect-button-glow'} /> : <BulbOutlined />}
        onClick={handleClick}
        loading={loading}
        disabled={isBluetoothSupported && !currentClimbQueueItem}
      />
      <Modal
        title="Web Bluetooth Not Supported"
        open={showBluetoothWarning}
        onCancel={() => setShowBluetoothWarning(false)}
        footer={<Button onClick={() => setShowBluetoothWarning(false)}>Close</Button>}
      >
        <Paragraph>
          <Text>
            Your browser does not support Web Bluetooth, which means you won&#39;t be able to illuminate routes on the
            board.
          </Text>
        </Paragraph>
        {isIOS ? (
          <>
            <Paragraph>To control your board from an iOS device, install the Bluefy browser:</Paragraph>
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
          <Paragraph>For the best experience, please use Chrome or another Chromium-based browser.</Paragraph>
        )}
      </Modal>
    </>
  );
};

export default SendClimbToBoardButton;
