'use client';

import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Alert from '@mui/material/Alert';
import { themeTokens } from '@/app/theme/theme-config';
import { useWsAuthToken } from '@/app/hooks/use-ws-auth-token';
import { createGraphQLHttpClient } from '@/app/lib/graphql/client';
import { GET_MY_ROLES } from '@/app/lib/graphql/operations/proposals';
import type { CommunityRoleAssignment } from '@boardsesh/shared-schema';
import RoleManagement from '@/app/components/admin/role-management';
import CommunitySettingsPanel from '@/app/components/admin/community-settings-panel';

export default function AdminPage() {
  const { token } = useWsAuthToken();
  const [tab, setTab] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkRole() {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const client = createGraphQLHttpClient(token);
        const result = await client.request<{ myRoles: CommunityRoleAssignment[] }>(GET_MY_ROLES);
        const hasAdmin = result.myRoles.some((r) => r.role === 'admin');
        setIsAdmin(hasAdmin);
      } catch {
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    }
    checkRole();
  }, [token]);

  if (loading) return null;

  if (!token) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="warning">Please sign in to access the admin panel.</Alert>
      </Container>
    );
  }

  if (!isAdmin) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">You do not have admin access.</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 3, color: themeTokens.neutral[800] }}>
        Admin Panel
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: themeTokens.neutral[200], mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="Roles" sx={{ textTransform: 'none' }} />
          <Tab label="Settings" sx={{ textTransform: 'none' }} />
        </Tabs>
      </Box>

      {tab === 0 && <RoleManagement />}
      {tab === 1 && <CommunitySettingsPanel />}
    </Container>
  );
}
