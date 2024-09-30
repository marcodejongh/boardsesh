'use client';

import React, { useCallback, useState } from 'react';
import { BulbOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { useQueueContext } from '../queue-control/queue-context';
import { BoardDetails, LedPlacements } from '@/app/lib/types';
import { holdStateMapping } from '../board-renderer/types';

// Bluetooth constants
const MAX_BLUETOOTH_MESSAGE_SIZE = 20;
const MESSAGE_BODY_MAX_LENGTH = 255;
const PACKET_MIDDLE = 81;
const PACKET_FIRST = 82;
const PACKET_LAST = 83;
const PACKET_ONLY = 84;
const SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
const CHARACTERISTIC_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";
const BLUETOOTH_UNDEFINED = "navigator.bluetooth is undefined";
const BLUETOOTH_CANCELLED = "User cancelled the requestDevice() chooser.";

let bluetoothDevice: BluetoothDevice | null = null;

// Helper functions
const checksum = (data: number[]) => {
  let i = 0;
  for (const value of data) {
    i = (i + value) & 255;
  }
  return ~i & 255;
};

const wrapBytes = (data: number[]) => {
  if (data.length > MESSAGE_BODY_MAX_LENGTH) {
    return [];
  }
  return [1, data.length, checksum(data), 2, ...data, 3];
};

const encodePosition = (position: number) => {
  const position1 = position & 255;
  const position2 = (position & 65280) >> 8;
  return [position1, position2];
};
/**
 * Expected encoded values for Kilter boards:
 * 24 shows up where STARTING (#00DD00) should be.
 * 31 shows up where HAND (#00FFFF) should be.
 * 227 shows up where FINISH (#FF00FF) should be.
 * 244 shows up where FOOT (#FFA500) should be.
 * @param color 
 * @returns 
 */
const encodeColor = (color: string) => {
  const substring = color.substring(0, 2);
  const substring2 = color.substring(2, 4);
  const parsedSubstring = Math.floor(parseInt(substring, 16) / 32);
  const parsedSubstring2 = Math.floor(parseInt(substring2, 16) / 32);
  const parsedResult = (parsedSubstring << 5) | (parsedSubstring2 << 2);
  const substring3 = color.substring(4, 6);
  const parsedSubstring3 = parseInt(substring3, 16) / 64;
  const finalParsedResult = parsedResult | parsedSubstring3;
  return finalParsedResult;
};

const encodePositionAndColor = (position: number, ledColor: string) => {
  return [...encodePosition(position), encodeColor(ledColor)];
};

const getBluetoothPacket = (
  frames: string,
  placementPositions: LedPlacements,
) => {
  const resultArray: number[][] = [];
  let tempArray = [PACKET_MIDDLE];

  frames.split('p').forEach((frame) => {
    if (frame.length > 0) {
      const [placement, role] = frame.split('r');
      
      const encodedFrame = encodePositionAndColor(
        Number(placementPositions[Number(placement)]),
        holdStateMapping['kilter'][Number(role)].color.replace('#', '')
      );

      if (tempArray.length + 3 > MESSAGE_BODY_MAX_LENGTH) {
        resultArray.push(tempArray);
        tempArray = [PACKET_MIDDLE];
      }
      tempArray.push(...encodedFrame);
    }
  });
  resultArray.push(tempArray);

  if (resultArray.length === 1) {
    resultArray[0][0] = PACKET_ONLY;
  } else if (resultArray.length > 1) {
    resultArray[0][0] = PACKET_FIRST;
    resultArray[resultArray.length - 1][0] = PACKET_LAST;
  }

  const finalResultArray: number[] = [];
  for (const currentArray of resultArray) {
    finalResultArray.push(...wrapBytes(currentArray));
  }
  
  return Uint8Array.from(finalResultArray);
};

const splitEvery = (n: number, list: number[]) => {
  if (n <= 0) {
    throw new Error('First argument to splitEvery must be a positive integer');
  }
  const result: number[][] = [];
  let idx = 0;
  while (idx < list.length) {
    result.push(list.slice(idx, (idx += n)));
  }
  return result;
};

const illuminateClimb = async (
  board: string,
  bluetoothPacket: Uint8Array
) => {
  const capitalizedBoard = board[0].toUpperCase() + board.slice(1);
  try {
    const device = await requestDevice(capitalizedBoard);
    const server = await device.gatt?.connect();
    const service = await server?.getPrimaryService(SERVICE_UUID);
    const characteristic = await service?.getCharacteristic(CHARACTERISTIC_UUID);

    if (characteristic) {
      const splitMessages = (buffer: Uint8Array) =>
        splitEvery(MAX_BLUETOOTH_MESSAGE_SIZE, Array.from(buffer)).map(
          (arr) => new Uint8Array(arr)
        );
      await writeCharacteristicSeries(characteristic, splitMessages(bluetoothPacket));
    }
  } catch (error: unknown) {
    if (error instanceof Error && error.message !== BLUETOOTH_CANCELLED) {
      const message =
        error.message === BLUETOOTH_UNDEFINED
          ? 'Web Bluetooth is not supported on this browser. See https://caniuse.com/web-bluetooth for more information.'
          : `Failed to connect to LEDS: ${error}`;
      throw new Error(message);
    } else {
      throw new Error(`Unknown error`)
    } 
  }
};

const writeCharacteristicSeries = async (
  characteristic: BluetoothRemoteGATTCharacteristic,
  messages: Uint8Array[]
) => {
  for (const message of messages) {
    await characteristic.writeValue(message);
  }
};

const requestDevice = async (namePrefix: string) => {
  if (!bluetoothDevice) {
    bluetoothDevice = await navigator.bluetooth.requestDevice({
      filters: [
        {
          namePrefix,
        },
      ],
      optionalServices: [SERVICE_UUID],
    });
  }
  return bluetoothDevice;
};

type SendClimbToBoardButtonProps = { boardDetails: BoardDetails};
// React component
const SendClimbToBoardButton: React.FC<SendClimbToBoardButtonProps> = ({
  boardDetails
}) => {
  const { currentClimbQueueItem } = useQueueContext();
  const [loading, setLoading] = useState(false);

  const handleClick = useCallback(async () => {
    if (!currentClimbQueueItem) {
      return;
    }

    setLoading(true);

    const { frames } = currentClimbQueueItem.climb;
    // You'll need to define these maps appropriately in your app
    const placementPositions = { ...boardDetails.ledPlacements }; 

    const bluetoothPacket = getBluetoothPacket(frames, placementPositions);

    try {
      await illuminateClimb('kilterboard', bluetoothPacket); // Or pass the appropriate board name
    } catch (error) {
      console.error('Error illuminating climb:', error);
    } finally {
      setLoading(false);
    }
  }, [currentClimbQueueItem, boardDetails]);

  return (
    <Button
      id="button-illuminate"
      type="default"
      icon={<BulbOutlined />}
      onClick={handleClick}
      loading={loading}
      disabled={!currentClimbQueueItem}
    />
  );
};

export default SendClimbToBoardButton;
