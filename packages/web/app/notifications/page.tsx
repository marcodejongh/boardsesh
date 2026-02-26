import React from 'react';
import Box from '@mui/material/Box';
import MuiTypography from '@mui/material/Typography';
import { cookies } from 'next/headers';
import { NotificationList } from '@/app/components/notifications';
import { serverGroupedNotifications } from '@/app/lib/graphql/server-cached-client';

export default async function NotificationsPage() {
  // Read the NextAuth JWT from the cookie (same token the ws-auth endpoint returns)
  const cookieStore = await cookies();
  const authToken =
    cookieStore.get('__Secure-next-auth.session-token')?.value ??
    cookieStore.get('next-auth.session-token')?.value;

  let initialData = null;
  if (authToken) {
    try {
      initialData = await serverGroupedNotifications(authToken);
    } catch (error) {
      console.error('[notifications/page] SSR fetch failed, falling back to client:', error);
    }
  }

  return (
    <Box sx={{ pb: 10 }}>
      <Box sx={{ px: 2, pt: 2, pb: 1 }}>
        <MuiTypography variant="h6" fontWeight={600}>
          Notifications
        </MuiTypography>
      </Box>
      <NotificationList initialData={initialData} />
    </Box>
  );
}
