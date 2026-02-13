'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import MuiButton from '@mui/material/Button';
import MuiTypography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import RemoveCircleOutlined from '@mui/icons-material/RemoveCircleOutline';
import { useWsAuthToken } from '@/app/hooks/use-ws-auth-token';
import { useSnackbar } from '@/app/components/providers/snackbar-provider';
import { createGraphQLHttpClient } from '@/app/lib/graphql/client';
import {
  GET_GYM_MEMBERS,
  REMOVE_GYM_MEMBER,
  type GetGymMembersQueryVariables,
  type GetGymMembersQueryResponse,
  type RemoveGymMemberMutationVariables,
  type RemoveGymMemberMutationResponse,
} from '@/app/lib/graphql/operations';
import type { GymMember } from '@boardsesh/shared-schema';

interface GymMemberManagementProps {
  gymUuid: string;
  isOwnerOrAdmin: boolean;
}

export default function GymMemberManagement({ gymUuid, isOwnerOrAdmin }: GymMemberManagementProps) {
  const [members, setMembers] = useState<GymMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const { token } = useWsAuthToken();
  const { showMessage } = useSnackbar();

  const fetchMembers = useCallback(async (offset = 0) => {
    if (!token) return;
    setLoading(true);
    try {
      const client = createGraphQLHttpClient(token);
      const data = await client.request<GetGymMembersQueryResponse, GetGymMembersQueryVariables>(
        GET_GYM_MEMBERS,
        { input: { gymUuid, limit: 20, offset } },
      );

      if (offset === 0) {
        setMembers(data.gymMembers.members);
      } else {
        setMembers((prev) => [...prev, ...data.gymMembers.members]);
      }
      setHasMore(data.gymMembers.hasMore);
      setTotalCount(data.gymMembers.totalCount);
    } catch (error) {
      console.error('Failed to fetch members:', error);
    } finally {
      setLoading(false);
    }
  }, [token, gymUuid]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleRemove = async (userId: string) => {
    if (!token) return;
    if (!window.confirm('Remove this member from the gym?')) return;

    try {
      const client = createGraphQLHttpClient(token);
      await client.request<RemoveGymMemberMutationResponse, RemoveGymMemberMutationVariables>(
        REMOVE_GYM_MEMBER,
        { input: { gymUuid, userId } },
      );
      setMembers((prev) => prev.filter((m) => m.userId !== userId));
      setTotalCount((prev) => prev - 1);
      showMessage('Member removed', 'success');
    } catch (error) {
      console.error('Failed to remove member:', error);
      showMessage('Failed to remove member', 'error');
    }
  };

  if (loading && members.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (members.length === 0) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <MuiTypography variant="body2" color="text.secondary">
          No members yet
        </MuiTypography>
      </Box>
    );
  }

  return (
    <Box>
      <List disablePadding>
        {members.map((member) => (
          <ListItem
            key={member.userId}
            secondaryAction={
              isOwnerOrAdmin ? (
                <IconButton
                  edge="end"
                  size="small"
                  onClick={() => handleRemove(member.userId)}
                >
                  <RemoveCircleOutlined fontSize="small" />
                </IconButton>
              ) : undefined
            }
          >
            <ListItemAvatar>
              <Avatar
                src={member.avatarUrl ?? undefined}
                sx={{ width: 32, height: 32, fontSize: 13 }}
              >
                {member.displayName?.[0]?.toUpperCase()}
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={member.displayName ?? 'Unknown User'}
              secondary={
                <Chip
                  label={member.role}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: 11, height: 20, mt: 0.5 }}
                />
              }
            />
          </ListItem>
        ))}
      </List>
      {hasMore && (
        <Box sx={{ p: 2 }}>
          <MuiButton
            onClick={() => fetchMembers(members.length)}
            disabled={loading}
            variant="outlined"
            fullWidth
            size="small"
          >
            {loading ? 'Loading...' : `Load more (${members.length} of ${totalCount})`}
          </MuiButton>
        </Box>
      )}
    </Box>
  );
}
