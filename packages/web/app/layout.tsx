// app/layout.tsx (or app/_app.tsx if you are using a global layout)
import React from 'react';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { App, ConfigProvider } from 'antd';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import SessionProviderWrapper from './components/providers/session-provider';
import QueryClientProvider from './components/providers/query-client-provider';
import { NavigationLoadingProvider } from './components/providers/navigation-loading-provider';
import { antdTheme } from './theme/antd-theme';
import './components/index.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body style={{ margin: 0 }}>
        <Analytics />
        <QueryClientProvider>
          <SessionProviderWrapper>
            <AntdRegistry>
              <ConfigProvider theme={antdTheme}>
                <App>
                  <NavigationLoadingProvider>{children}</NavigationLoadingProvider>
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
