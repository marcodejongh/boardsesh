// app/layout.tsx (or app/_app.tsx if you are using a global layout)
import React from 'react';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { App } from 'antd';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import SessionProviderWrapper from './components/providers/session-provider';
import WebBluetoothWarning from './components/board-bluetooth-control/web-bluetooth-warning';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      </head>
      <body style={{ margin: 0 }}>
        <Analytics />
        <SessionProviderWrapper>
          <AntdRegistry>
            <App>
              <WebBluetoothWarning />
              {children}
            </App>
          </AntdRegistry>
        </SessionProviderWrapper>
        <SpeedInsights />
      </body>
    </html>
  );
}
