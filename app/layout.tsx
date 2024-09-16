// app/layout.tsx (or app/_app.tsx if you are using a global layout)
import React from 'react';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import PeerProvider from './components/connection-manager/PeerProvider';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <PeerProvider> {/* Ensuring the PeerProvider wraps the entire app */}
          <AntdRegistry>{children}</AntdRegistry>
        </PeerProvider>
      </body>
    </html>
  );
}