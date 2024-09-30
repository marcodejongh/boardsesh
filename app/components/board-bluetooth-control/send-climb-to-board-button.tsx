'use client';

import React, { useCallback, useRef, useState } from 'react';
import { BulbOutlined, BulbFilled } from '@ant-design/icons';
import { Button } from 'antd';
import { useQueueContext } from '../queue-control/queue-context';
import { BoardDetails, LedPlacements } from '@/app/lib/types';
import { holdStateMapping } from '../board-renderer/types';
import './send-climb-to-board-button.css'; // Import your custom styles

// Bluetooth constants
const MAX_BLUETOOTH_MESSAGE_SIZE = 20;
const MESSAGE_BODY_MAX_LENGTH = 255;
const PACKET_MIDDLE = 81;
const PACKET_FIRST = 82;
const PACKET_LAST = 83;
const PACKET_ONLY = 84;
const SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
const CHARACTERISTIC_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";

// Helper functions (same as before)
const checksum = (data: number[]) => data.reduce((acc, value) => (acc + value) & 255, 0) ^ 255;

const wrapBytes = (data: number[]) =>
  data.length > MESSAGE_BODY_MAX_LENGTH ? [] : [1, data.length, checksum(data), 2, ...data, 3];

const encodePosition = (position: number) => [position & 255, (position >> 8) & 255];

const encodeColor = (color: string) => {
  const parsedColor = [
    Math.floor(parseInt(color.substring(0, 2), 16) / 32) << 5,
    Math.floor(parseInt(color.substring(2, 4), 16) / 32) << 2,
    Math.floor(parseInt(color.substring(4, 6), 16) / 64),
  ].reduce((acc, val) => acc | val);
  return parsedColor;
};

const encodePositionAndColor = (position: number, ledColor: string) =>
  [...encodePosition(position), encodeColor(ledColor)];

const getBluetoothPacket = (frames: string, placementPositions: LedPlacements) => {
  const resultArray: number[][] = [];
  let tempArray = [PACKET_MIDDLE];

  frames.split('p').forEach((frame) => {
    if (!frame) return;

    const [placement, role] = frame.split('r');
    const encodedFrame = encodePositionAndColor(
      Number(placementPositions[Number(placement)]),
      holdStateMapping['kilter'][Number(role)].color.replace('#', '')
    );

    if (tempArray.length + encodedFrame.length > MESSAGE_BODY_MAX_LENGTH) {
      resultArray.push(tempArray);
      tempArray = [PACKET_MIDDLE];
    }
    tempArray.push(...encodedFrame);
  });

  resultArray.push(tempArray);
  if (resultArray.length === 1) resultArray[0][0] = PACKET_ONLY;
  else {
    resultArray[0][0] = PACKET_FIRST;
    resultArray[resultArray.length - 1][0] = PACKET_LAST;
  }

  return Uint8Array.from(resultArray.flatMap(wrapBytes));
};

const splitMessages = (buffer: Uint8Array) =>
  Array.from({ length: Math.ceil(buffer.length / MAX_BLUETOOTH_MESSAGE_SIZE) }, (_, i) =>
    buffer.slice(i * MAX_BLUETOOTH_MESSAGE_SIZE, (i + 1) * MAX_BLUETOOTH_MESSAGE_SIZE)
  );

const writeCharacteristicSeries = async (
  characteristic: BluetoothRemoteGATTCharacteristic,
  messages: Uint8Array[]
) => {
  for (const message of messages) {
    await characteristic.writeValue(message);
  }
};

const requestDevice = async (namePrefix: string) =>
  navigator.bluetooth.requestDevice({
    filters: [{ namePrefix }],
    optionalServices: [SERVICE_UUID],
  });

const getCharacteristic = async (device: BluetoothDevice) => {
  const server = await device.gatt?.connect();
  const service = await server?.getPrimaryService(SERVICE_UUID);
  return await service?.getCharacteristic(CHARACTERISTIC_UUID);
};

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
