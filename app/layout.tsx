// app/layout.tsx (or app/_app.tsx if you are using a global layout)
import React from 'react';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { App } from 'antd';
import WebBluetoothWarning from './components/board-bluetooth-control/web-bluetooth-warning';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        <AntdRegistry>
          <App>
            <WebBluetoothWarning />
            {children}
          </App>
        </AntdRegistry>
      </body>
    </html>
  );
}
