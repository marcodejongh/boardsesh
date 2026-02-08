// app/layout.tsx (or app/_app.tsx if you are using a global layout)
import React from 'react';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { App, ConfigProvider } from 'antd';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import SessionProviderWrapper from './components/providers/session-provider';
import QueryClientProvider from './components/providers/query-client-provider';
import { NavigationLoadingProvider } from './components/providers/navigation-loading-provider';
import PersistentSessionWrapper from './components/providers/persistent-session-wrapper';
import { SnackbarProvider } from './components/providers/snackbar-provider';
import { antdTheme } from './theme/antd-theme';
import { muiTheme } from './theme/mui-theme';
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
            <AppRouterCacheProvider>
              <ThemeProvider theme={muiTheme}>
                <CssBaseline />
                <AntdRegistry>
                  <ConfigProvider theme={antdTheme}>
                    <App style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
                      <PersistentSessionWrapper>
                        <SnackbarProvider>
                          <NavigationLoadingProvider>{children}</NavigationLoadingProvider>
                        </SnackbarProvider>
                      </PersistentSessionWrapper>
                    </App>
                  </ConfigProvider>
                </AntdRegistry>
              </ThemeProvider>
            </AppRouterCacheProvider>
          </SessionProviderWrapper>
        </QueryClientProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
