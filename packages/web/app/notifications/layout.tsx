import React from 'react';

export default function NotificationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ minHeight: '100dvh', paddingTop: 'calc(max(8dvh, 48px) + env(safe-area-inset-top, 0px))', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {children}
    </div>
  );
}
