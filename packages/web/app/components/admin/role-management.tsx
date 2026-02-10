'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import Snackbar from '@mui/material/Snackbar';
import { themeTokens } from '@/app/theme/theme-config';
import { useWsAuthToken } from '@/app/components/auth/ws-auth-provider';
import { createGraphQLHttpClient } from '@/app/lib/graphql/client';
import {
  GET_COMMUNITY_ROLES,
  GRANT_ROLE,
  REVOKE_ROLE,
} from '@/app/lib/graphql/operations/proposals';
import type { CommunityRoleAssignment, CommunityRoleType } from '@boardsesh/shared-schema';

export default function RoleManagement() {
  const { token } = useWsAuthToken();
  const [roles, setRoles] = useState<CommunityRoleAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGrantDialog, setShowGrantDialog] = useState(false);
  const [grantUserId, setGrantUserId] = useState('');
  const [grantRole, setGrantRole] = useState<CommunityRoleType>('community_leader');
  const [grantBoardType, setGrantBoardType] = useState('');
  const [snackbar, setSnackbar] = useState('');

  const fetchRoles = useCallback(async () => {
    if (!token) return;
    try {
      const client = createGraphQLHttpClient(token);
      const result = await client.request<{ communityRoles: CommunityRoleAssignment[] }>(GET_COMMUNITY_ROLES);
      setRoles(result.communityRoles);
    } catch (err) {
      console.error('[RoleManagement] Failed to fetch roles:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const handleGrant = useCallback(async () => {
    if (!token || !grantUserId) return;
    try {
      const client = createGraphQLHttpClient(token);
      await client.request(GRANT_ROLE, {
        input: {
          userId: grantUserId,
          role: grantRole,
          boardType: grantBoardType || null,
        },
      });
      setShowGrantDialog(false);
      setGrantUserId('');
      setGrantBoardType('');
      setSnackbar('Role granted');
      fetchRoles();
    } catch (err) {
      setSnackbar('Failed to grant role');
    }
  }, [token, grantUserId, grantRole, grantBoardType, fetchRoles]);

  const handleRevoke = useCallback(async (role: CommunityRoleAssignment) => {
    if (!token) return;
    try {
      const client = createGraphQLHttpClient(token);
      await client.request(REVOKE_ROLE, {
        input: {
          userId: role.userId,
          role: role.role,
          boardType: role.boardType || null,
        },
      });
      setSnackbar('Role revoked');
      fetchRoles();
    } catch (err) {
      setSnackbar('Failed to revoke role');
    }
  }, [token, fetchRoles]);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Community Roles
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setShowGrantDialog(true)}
          sx={{
            textTransform: 'none',
            bgcolor: themeTokens.colors.primary,
            '&:hover': { bgcolor: themeTokens.colors.primaryHover },
          }}
        >
          Grant Role
        </Button>
      </Box>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>User</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Board</TableCell>
              <TableCell>Granted By</TableCell>
              <TableCell>Date</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {roles.map((role) => (
              <TableRow key={role.id}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar src={role.userAvatarUrl || undefined} sx={{ width: 28, height: 28, fontSize: 12 }}>
                      {role.userDisplayName?.[0] || 'U'}
                    </Avatar>
                    <Typography variant="body2">{role.userDisplayName || role.userId}</Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={role.role === 'admin' ? 'Admin' : 'Leader'}
                    size="small"
                    sx={{
                      bgcolor: role.role === 'admin'
                        ? `${themeTokens.colors.error}14`
                        : `${themeTokens.colors.primary}14`,
                      color: role.role === 'admin'
                        ? themeTokens.colors.error
                        : themeTokens.colors.primary,
                      fontWeight: 600,
                      fontSize: 11,
                    }}
                  />
                </TableCell>
                <TableCell>{role.boardType || 'Global'}</TableCell>
                <TableCell>{role.grantedByDisplayName || role.grantedBy || '-'}</TableCell>
                <TableCell>{new Date(role.createdAt).toLocaleDateString()}</TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => handleRevoke(role)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {roles.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography variant="body2" sx={{ color: themeTokens.neutral[400], py: 2 }}>
                    No roles assigned yet
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Grant Role Dialog */}
      <Dialog open={showGrantDialog} onClose={() => setShowGrantDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Grant Role</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="User ID"
              value={grantUserId}
              onChange={(e) => setGrantUserId(e.target.value)}
              size="small"
              fullWidth
              placeholder="Enter user ID"
            />
            <FormControl size="small" fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={grantRole}
                label="Role"
                onChange={(e) => setGrantRole(e.target.value as CommunityRoleType)}
              >
                <MenuItem value="community_leader">Community Leader</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
              <InputLabel>Board Type (optional)</InputLabel>
              <Select
                value={grantBoardType}
                label="Board Type (optional)"
                onChange={(e) => setGrantBoardType(e.target.value)}
              >
                <MenuItem value="">Global (all boards)</MenuItem>
                <MenuItem value="kilter">Kilter</MenuItem>
                <MenuItem value="tension">Tension</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowGrantDialog(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button
            onClick={handleGrant}
            variant="contained"
            disabled={!grantUserId}
            sx={{
              textTransform: 'none',
              bgcolor: themeTokens.colors.primary,
              '&:hover': { bgcolor: themeTokens.colors.primaryHover },
            }}
          >
            Grant
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!snackbar}
        autoHideDuration={3000}
        onClose={() => setSnackbar('')}
        message={snackbar}
      />
    </Box>
  );
}
