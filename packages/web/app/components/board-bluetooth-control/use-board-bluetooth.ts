'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { message } from 'antd';
import { track } from '@vercel/analytics';
import { BoardDetails } from '@/app/lib/types';
import {
  getBluetoothPacket,
  getCharacteristic,
  requestDevice,
  splitMessages,
  writeCharacteristicSeries,
} from './bluetooth';
import { HoldRenderData } from '../board-renderer/types';
import { useWakeLock } from './use-wake-lock';
import { getLedPlacements } from '@/app/lib/__generated__/led-placements-data';

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

interface UseBoardBluetoothOptions {
  boardDetails: BoardDetails;
  onConnectionChange?: (connected: boolean) => void;
}

export function useBoardBluetooth({ boardDetails, onConnectionChange }: UseBoardBluetoothOptions) {
  const [loading, setLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  // Prevent device from sleeping while connected to the board
  useWakeLock(isConnected);

  // Store Bluetooth device and characteristic across renders
  const bluetoothDeviceRef = useRef<BluetoothDevice | null>(null);
  const characteristicRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null);

  // Handler for device disconnection
  const handleDisconnection = useCallback(() => {
    setIsConnected(false);
    characteristicRef.current = null;
    onConnectionChange?.(false);
  }, [onConnectionChange]);

  // Clean up disconnect listener from a device
  const cleanupDeviceListeners = useCallback(
    (device: BluetoothDevice | null) => {
      if (device) {
        device.removeEventListener('gattserverdisconnected', handleDisconnection);
      }
    },
    [handleDisconnection],
  );

  // Function to send frames string to the board
  const sendFramesToBoard = useCallback(
    async (frames: string, mirrored: boolean = false) => {
      if (!characteristicRef.current || !frames) return;

      let framesToSend = frames;
      const placementPositions = getLedPlacements(boardDetails.board_name, boardDetails.layout_id, boardDetails.size_id);

      if (mirrored) {
        framesToSend = convertToMirroredFramesString(frames, boardDetails.holdsData);
      }

      const bluetoothPacket = getBluetoothPacket(framesToSend, placementPositions, boardDetails.board_name);

      try {
        await writeCharacteristicSeries(characteristicRef.current, splitMessages(bluetoothPacket));
        return true;
      } catch (error) {
        console.error('Error sending frames to board:', error);
        return false;
      }
    },
    [boardDetails],
  );

  // Handle connection initiation
  const connect = useCallback(
    async (initialFrames?: string, mirrored?: boolean) => {
      if (!navigator.bluetooth) {
        message.error('Current browser does not support Web Bluetooth.');
        return false;
      }

      setLoading(true);

      try {
        // Clean up any existing device listeners before requesting a new device
        cleanupDeviceListeners(bluetoothDeviceRef.current);

        // Always request a new device to allow connecting to a different board
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

          // Send initial frames if provided
          if (initialFrames) {
            await sendFramesToBoard(initialFrames, mirrored);
          }

          setIsConnected(true);
          onConnectionChange?.(true);
          return true;
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

      return false;
    },
    [cleanupDeviceListeners, handleDisconnection, boardDetails, onConnectionChange, sendFramesToBoard],
  );

  // Disconnect from the board
  const disconnect = useCallback(() => {
    if (bluetoothDeviceRef.current?.gatt?.connected) {
      bluetoothDeviceRef.current.gatt.disconnect();
    }
    cleanupDeviceListeners(bluetoothDeviceRef.current);
    setIsConnected(false);
    characteristicRef.current = null;
    onConnectionChange?.(false);
  }, [cleanupDeviceListeners, onConnectionChange]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      cleanupDeviceListeners(bluetoothDeviceRef.current);
    };
  }, [cleanupDeviceListeners]);

  return {
    isConnected,
    loading,
    connect,
    disconnect,
    sendFramesToBoard,
  };
}
