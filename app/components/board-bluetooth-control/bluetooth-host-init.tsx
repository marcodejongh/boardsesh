'use client';

import { useEffect } from 'react';
import { getGlobalBluetoothHost } from './bluetooth-host';

export function BluetoothHostInit() {
  useEffect(() => {
    // Initialize the global Bluetooth host when component mounts
    getGlobalBluetoothHost();
  }, []);

  // This component renders nothing - it's just for initialization
  return null;
}