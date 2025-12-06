'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BulbOutlined, BulbFilled } from '@ant-design/icons';
import { Button, message } from 'antd';
import { track } from '@vercel/analytics';
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
import { HoldRenderData } from '../board-renderer/types';
import { useWakeLock } from './use-wake-lock';

type SendClimbToBoardButtonProps = { boardDetails: BoardDetails };

export const convertToMirroredFramesString = (frames: string, holdsData: HoldRenderData[]): string => {
  // Create a map for quick lookup of mirroredHoldId
  const holdIdToMirroredIdMap = new Map<number, number>();
  holdsData.forEach((hold) => {
    if (hold.mirroredHoldId) {
      holdIdToMirroredIdMap.set(hold.id, hold.mirroredHoldId);
    }
  });

  return frames
    .split('p') // Split into hold data entries
    .filter((hold) => hold) // Remove empty entries
    .map((holdData) => {
      const [holdId, stateCode] = holdData.split('r').map((str) => Number(str)); // Split hold data into holdId and stateCode
      const mirroredHoldId = holdIdToMirroredIdMap.get(holdId);

      if (mirroredHoldId === undefined) {
        throw new Error(`Mirrored hold ID is not defined for hold ID ${holdId}.`);
      }

      // Construct the mirrored hold data
      return `p${mirroredHoldId}r${stateCode}`;
    })
    .join(''); // Reassemble into a single string
};

// React component
const SendClimbToBoardButton: React.FC<SendClimbToBoardButtonProps> = ({ boardDetails }) => {
  const { currentClimbQueueItem } = useQueueContext();
  const [loading, setLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false); // Track Bluetooth connection state

  // Prevent device from sleeping while connected to the board
  useWakeLock(isConnected);

  // Store Bluetooth device and characteristic across renders
  const bluetoothDeviceRef = useRef<BluetoothDevice | null>(null);
  const characteristicRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null);

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

    const placementPositions = boardDetails.ledPlacements;
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
  }, [currentClimbQueueItem, boardDetails]);

  // Handle button click to initiate Bluetooth connection
  const handleClick = useCallback(async () => {
    if (!navigator.bluetooth) {
      return message.error('Current browser does not support Web Bluetooth.');
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
        setIsConnected(true);
        track('Bluetooth Connection Success', {
          boardLayout: `${boardDetails.layout_name}`,
        });

        // Send the current climb immediately after connection is established
        if (currentClimbQueueItem) {
          let { frames } = currentClimbQueueItem.climb;
          const placementPositions = boardDetails.ledPlacements;
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
  }, [cleanupDeviceListeners, handleDisconnection, boardDetails, currentClimbQueueItem]);

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
    <Button
      id="button-illuminate"
      type="default"
      icon={isConnected ? <BulbFilled className={'connect-button-glow'} /> : <BulbOutlined />}
      onClick={handleClick}
      loading={loading}
      disabled={!currentClimbQueueItem}
    />
  );
};

export default SendClimbToBoardButton;
