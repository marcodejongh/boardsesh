// app/layout.tsx (or app/_app.tsx if you are using a global layout)
import React from 'react';
import { AntdRegistry } from '@ant-design/nextjs-registry';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{overflow: 'hidden'}}>
        <AntdRegistry>{children}</AntdRegistry>
      </body>
    </html>
  );
}