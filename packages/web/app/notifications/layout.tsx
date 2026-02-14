import React from 'react';

export default function NotificationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ minHeight: '100dvh', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {children}
    </div>
  );
}
