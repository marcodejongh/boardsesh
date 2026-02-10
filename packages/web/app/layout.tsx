// app/layout.tsx
import React from 'react';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import ThemeRegistry from './components/providers/theme-registry';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import SessionProviderWrapper from './components/providers/session-provider';
import QueryClientProvider from './components/providers/query-client-provider';
import { NavigationLoadingProvider } from './components/providers/navigation-loading-provider';
import PersistentSessionWrapper from './components/providers/persistent-session-wrapper';
import { SnackbarProvider } from './components/providers/snackbar-provider';
import { NotificationProvider } from './components/providers/notification-provider';
import { WsAuthProvider } from './components/providers/ws-auth-provider';
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
      <body>
        <Analytics />
        <QueryClientProvider>
          <SessionProviderWrapper>
            <AppRouterCacheProvider>
              <ThemeRegistry>
                <PersistentSessionWrapper>
                  <WsAuthProvider>
                    <SnackbarProvider>
                      <NotificationProvider>
                        <NavigationLoadingProvider>{children}</NavigationLoadingProvider>
                      </NotificationProvider>
                    </SnackbarProvider>
                  </WsAuthProvider>
                </PersistentSessionWrapper>
              </ThemeRegistry>
            </AppRouterCacheProvider>
          </SessionProviderWrapper>
        </QueryClientProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
