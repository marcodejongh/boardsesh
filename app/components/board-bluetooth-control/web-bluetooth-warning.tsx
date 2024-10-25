// app/components/WebBluetoothWarning.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { Alert, Button } from 'antd';
import { AppleOutlined } from '@ant-design/icons';

const WebBluetoothWarning: React.FC = () => {
  const [showAlert, setShowAlert] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check for Web Bluetooth support
    if (!navigator.bluetooth) {
      setShowAlert(true);
    }

    // Detect if the device is iOS
    const userAgent = navigator.userAgent || navigator.vendor;
    if (/iPhone|iPad|iPod/i.test(userAgent)) {
      setIsIOS(true);
    }
  }, []);

  return (
    <div style={{ textAlign: 'center', marginBottom: 16 }}>
      {showAlert && (
        <Alert
          message="Web Bluetooth Unsupported"
          description={
            <div>
              <p>Your browser does not support Web Bluetooth, this means you wont be able to set routes on the board.
              {isIOS ? (
                <>
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
                </>
              ) : (
                  'For the best experience, please use Chrome on your device.'
              )}
              </p>
            </div>
          }
          type="warning"
          showIcon
          closable
          onClose={() => setShowAlert(false)}
        />
      )}
    </div>
  );
};

export default WebBluetoothWarning;
