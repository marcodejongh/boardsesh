import React from 'react';
import Box from '@mui/material/Box';
import MuiTypography from '@mui/material/Typography';
import { NotificationList } from '@/app/components/notifications';

export default function NotificationsPage() {
  return (
    <Box sx={{ pb: 10 }}>
      <Box sx={{ px: 2, pt: 2, pb: 1 }}>
        <MuiTypography variant="h6" fontWeight={600}>
          Notifications
        </MuiTypography>
      </Box>
      <NotificationList />
    </Box>
  );
}
