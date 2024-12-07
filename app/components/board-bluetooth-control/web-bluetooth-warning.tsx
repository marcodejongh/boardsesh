'use client';

import React, { useEffect, useState } from 'react';
import { Alert, Button, Space } from 'antd';
import { AppleOutlined } from '@ant-design/icons';
import { openDB } from 'idb';

const DB_NAME = 'app-preferences';
const DB_VERSION = 1;
const STORE_NAME = 'preferences';
const PREF_KEY = 'bluetooth-warning-dismissed';

const initDB = async () => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Create the store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    },
  });
};

const WebBluetoothWarning: React.FC = () => {
  const [showAlert, setShowAlert] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkPreferences = async () => {
      try {
        const db = await initDB();
        const isDismissed = await db.get(STORE_NAME, PREF_KEY);

        // Only show alert if not previously dismissed and bluetooth is not supported
        if (!isDismissed && !navigator.bluetooth) {
          setShowAlert(true);
        }

        // Detect if the device is iOS
        const userAgent = navigator.userAgent || navigator.vendor;
        if (/iPhone|iPad|iPod/i.test(userAgent)) {
          setIsIOS(true);
        }
      } catch (error) {
        console.error('Error checking preferences:', error);
        // Fallback: show the alert if bluetooth is not supported
        if (!navigator.bluetooth) {
          setShowAlert(true);
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkPreferences();
  }, []);

  const handleDismiss = () => {
    setShowAlert(false);
  };

  const handleDismissForever = async () => {
    try {
      const db = await initDB();
      await db.put(STORE_NAME, true, PREF_KEY);
      setShowAlert(false);
    } catch (error) {
      console.error('Error saving preference:', error);
      // Still hide the alert even if saving fails
      setShowAlert(false);
    }
  };

  if (isLoading) {
    return null; // Or a loading spinner if preferred
  }

  return (
    <>
      {showAlert && (
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <Alert
            message="Web Bluetooth Unsupported"
            description={
              <div>
                <p>
                  Your browser does not support Web Bluetooth, this means you won't be able to set routes on the board.
                  {isIOS ? (
                    <div>
                      To fix this you can install bluefy on your iOS device:
                      <Button
                        type="primary"
                        icon={<AppleOutlined />}
                        href="https://apps.apple.com/us/app/bluefy-web-ble-browser/id1492822055"
                        target="_blank"
                        style={{
                          backgroundColor: '#0070C9',
                          borderColor: '#0070C9',
                          color: '#fff',
                          marginTop: 8,
                        }}
                      >
                        Download Bluefy in the App Store
                      </Button>
                    </div>
                  ) : (
                    'For the best experience, please use Chrome on your device.'
                  )}
                </p>
                <Space size="middle" style={{ marginTop: 12 }}>
                  <Button onClick={handleDismiss}>Dismiss</Button>
                  <Button type="primary" onClick={handleDismissForever}>
                    Don't Show Again
                  </Button>
                </Space>
              </div>
            }
            type="warning"
            showIcon
          />
        </div>
      )}
    </>
  );
};

export default WebBluetoothWarning;
