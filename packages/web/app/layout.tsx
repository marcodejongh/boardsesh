// app/layout.tsx (or app/_app.tsx if you are using a global layout)
import React from 'react';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { App, ConfigProvider } from 'antd';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import SessionProviderWrapper from './components/providers/session-provider';
import QueryClientProvider from './components/providers/query-client-provider';
import { NavigationLoadingProvider } from './components/providers/navigation-loading-provider';
import PersistentSessionWrapper from './components/providers/persistent-session-wrapper';
import { antdTheme } from './theme/antd-theme';
import './components/index.css';
import type { Viewport } from 'next';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#ffffff',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        <Analytics />
        <QueryClientProvider>
          <SessionProviderWrapper>
            <AntdRegistry>
              <ConfigProvider theme={antdTheme}>
                <App style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
                  <PersistentSessionWrapper>
                    <NavigationLoadingProvider>{children}</NavigationLoadingProvider>
                  </PersistentSessionWrapper>
                </App>
              </ConfigProvider>
            </AntdRegistry>
          </SessionProviderWrapper>
        </QueryClientProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
