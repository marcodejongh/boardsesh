// app/layout.tsx (or app/_app.tsx if you are using a global layout)

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
          {children}
        </PeerProvider>
      </body>
    </html>
  );
}