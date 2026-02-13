'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Avatar from '@mui/material/Avatar';
import MuiTypography from '@mui/material/Typography';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Divider from '@mui/material/Divider';
import MuiButton from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';
import CloseOutlined from '@mui/icons-material/CloseOutlined';
import LocationOnOutlined from '@mui/icons-material/LocationOnOutlined';
import EditOutlined from '@mui/icons-material/EditOutlined';
import DeleteOutlined from '@mui/icons-material/DeleteOutlined';
import FitnessCenterOutlined from '@mui/icons-material/FitnessCenterOutlined';
import PersonOutlined from '@mui/icons-material/PersonOutlined';
import PeopleOutlined from '@mui/icons-material/PeopleOutlined';
import ChatBubbleOutlined from '@mui/icons-material/ChatBubbleOutlineOutlined';
import type { Gym } from '@boardsesh/shared-schema';
import { useWsAuthToken } from '@/app/hooks/use-ws-auth-token';
import { useSnackbar } from '@/app/components/providers/snackbar-provider';
import { createGraphQLHttpClient } from '@/app/lib/graphql/client';
import {
  GET_GYM,
  DELETE_GYM,
  FOLLOW_GYM,
  UNFOLLOW_GYM,
  type GetGymQueryResponse,
  type GetGymQueryVariables,
  type DeleteGymMutationVariables,
  type DeleteGymMutationResponse,
} from '@/app/lib/graphql/operations';
import { useSession } from 'next-auth/react';
import { themeTokens } from '@/app/theme/theme-config';
import FollowButton from '@/app/components/ui/follow-button';
import EditGymForm from './edit-gym-form';
import GymMemberManagement from './gym-member-management';
import CommentSection from '@/app/components/social/comment-section';

interface GymDetailProps {
  gymUuid: string;
  open: boolean;
  onClose: () => void;
  onDeleted?: () => void;
  anchor?: 'top' | 'bottom';
}

export default function GymDetail({ gymUuid, open, onClose, onDeleted, anchor = 'bottom' }: GymDetailProps) {
  const [gym, setGym] = useState<Gym | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { token } = useWsAuthToken();
  const { data: session } = useSession();
  const { showMessage } = useSnackbar();
  const currentUserId = session?.user?.id ?? null;

  const fetchGym = useCallback(async () => {
    if (!token || !gymUuid) return;
    setIsLoading(true);
    try {
      const client = createGraphQLHttpClient(token);
      const data = await client.request<GetGymQueryResponse, GetGymQueryVariables>(
        GET_GYM,
        { gymUuid },
      );
      setGym(data.gym ?? null);
    } catch (error) {
      console.error('Failed to fetch gym:', error);
    } finally {
      setIsLoading(false);
    }
  }, [token, gymUuid]);

  useEffect(() => {
    if (open) {
      fetchGym();
      setIsEditing(false);
      setActiveTab(0);
    }
  }, [open, fetchGym]);

  const isOwner = !!currentUserId && gym?.ownerId === currentUserId;
  const isOwnerOrAdmin = isOwner || gym?.myRole === 'admin';

  const handleDeleteConfirm = async () => {
    if (!token || !gym) return;

    setShowDeleteDialog(false);
    setIsDeleting(true);
    try {
      const client = createGraphQLHttpClient(token);
      await client.request<DeleteGymMutationResponse, DeleteGymMutationVariables>(
        DELETE_GYM,
        { gymUuid: gym.uuid },
      );
      showMessage('Gym deleted', 'success');
      onDeleted?.();
      onClose();
    } catch (error) {
      console.error('Failed to delete gym:', error);
      showMessage('Failed to delete gym', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditSuccess = (updatedGym: Gym) => {
    setGym(updatedGym);
    setIsEditing(false);
  };

  return (
    <Drawer
      anchor={anchor}
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          height: '90dvh',
          ...(anchor === 'bottom'
            ? {
                borderTopLeftRadius: themeTokens.borderRadius.xl,
                borderTopRightRadius: themeTokens.borderRadius.xl,
              }
            : {
                borderBottomLeftRadius: themeTokens.borderRadius.xl,
                borderBottomRightRadius: themeTokens.borderRadius.xl,
              }),
        },
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {anchor === 'bottom' && (
          <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1 }}>
            <Box sx={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'var(--neutral-300)' }} />
          </Box>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', px: 1 }}>
          <IconButton onClick={onClose} size="small">
            <CloseOutlined />
          </IconButton>
        </Box>

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
            <CircularProgress />
          </Box>
        ) : !gym ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
            <MuiTypography color="text.secondary">Gym not found</MuiTypography>
          </Box>
        ) : isEditing ? (
          <Box sx={{ px: 2, pb: 2, overflow: 'auto', flex: 1 }}>
            <EditGymForm
              gym={gym}
              onSuccess={handleEditSuccess}
              onCancel={() => setIsEditing(false)}
            />
          </Box>
        ) : (
          <>
            {/* Header */}
            <Box sx={{ px: 2, pb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <MuiTypography
                    variant="h5"
                    sx={{ fontWeight: themeTokens.typography.fontWeight.bold }}
                  >
                    {gym.name}
                  </MuiTypography>
                  {gym.address && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                      <LocationOnOutlined sx={{ fontSize: 16, color: 'var(--neutral-400)' }} />
                      <MuiTypography variant="body2" color="text.secondary">
                        {gym.address}
                      </MuiTypography>
                    </Box>
                  )}
                </Box>
              </Box>

              {/* Owner info */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.5 }}>
                <Avatar
                  src={gym.ownerAvatarUrl ?? undefined}
                  sx={{ width: 24, height: 24, fontSize: 11 }}
                >
                  {gym.ownerDisplayName?.[0]?.toUpperCase()}
                </Avatar>
                <MuiTypography variant="body2" color="text.secondary">
                  {gym.ownerDisplayName}
                </MuiTypography>
              </Box>

              {gym.description && (
                <MuiTypography variant="body2" sx={{ mt: 1.5, color: 'var(--neutral-600)' }}>
                  {gym.description}
                </MuiTypography>
              )}

              {/* Stats */}
              <Box sx={{ display: 'flex', gap: 2.5, mt: 2, flexWrap: 'wrap' }}>
                <StatChip icon={<FitnessCenterOutlined sx={{ fontSize: 16 }} />} value={gym.boardCount} label="boards" />
                <StatChip icon={<PersonOutlined sx={{ fontSize: 16 }} />} value={gym.memberCount} label="members" />
                <StatChip icon={<PeopleOutlined sx={{ fontSize: 16 }} />} value={gym.followerCount} label="followers" />
                <StatChip icon={<ChatBubbleOutlined sx={{ fontSize: 16 }} />} value={gym.commentCount} label="comments" />
              </Box>

              {/* Actions */}
              <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                {!isOwner && (
                  <FollowButton
                    entityId={gym.uuid}
                    initialIsFollowing={gym.isFollowedByMe}
                    followMutation={FOLLOW_GYM}
                    unfollowMutation={UNFOLLOW_GYM}
                    entityLabel="gym"
                    getFollowVariables={(id) => ({ input: { gymUuid: id } })}
                    onFollowChange={() => fetchGym()}
                  />
                )}
                {isOwner && (
                  <>
                    <MuiButton
                      variant="outlined"
                      size="small"
                      startIcon={<EditOutlined />}
                      onClick={() => setIsEditing(true)}
                      sx={{ textTransform: 'none' }}
                    >
                      Edit
                    </MuiButton>
                    <MuiButton
                      variant="outlined"
                      size="small"
                      color="error"
                      startIcon={<DeleteOutlined />}
                      onClick={() => setShowDeleteDialog(true)}
                      disabled={isDeleting}
                      sx={{ textTransform: 'none' }}
                    >
                      {isDeleting ? <CircularProgress size={16} /> : 'Delete'}
                    </MuiButton>
                  </>
                )}
              </Box>
            </Box>

            <Divider />

            {/* Tabs */}
            <Tabs
              value={activeTab}
              onChange={(_, v) => setActiveTab(v)}
              sx={{ px: 2 }}
            >
              <Tab label="Members" sx={{ textTransform: 'none' }} />
              <Tab label="Comments" sx={{ textTransform: 'none' }} />
            </Tabs>

            {/* Tab content */}
            <Box sx={{ flex: 1, overflow: 'auto', px: 2, py: 2 }}>
              {activeTab === 0 && (
                <GymMemberManagement gymUuid={gym.uuid} isOwnerOrAdmin={isOwnerOrAdmin} />
              )}
              {activeTab === 1 && (
                <CommentSection
                  entityType="gym"
                  entityId={gym.uuid}
                  title="Gym Discussion"
                />
              )}
            </Box>
          </>
        )}

        {anchor === 'top' && (
          <Box sx={{ display: 'flex', justifyContent: 'center', pb: 1 }}>
            <Box sx={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'var(--neutral-300)' }} />
          </Box>
        )}
      </Box>

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteDialog} onClose={() => setShowDeleteDialog(false)}>
        <DialogTitle>Delete Gym</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Delete &quot;{gym?.name}&quot;? This action can be undone later.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <MuiButton onClick={() => setShowDeleteDialog(false)}>Cancel</MuiButton>
          <MuiButton onClick={handleDeleteConfirm} color="error" autoFocus>
            Delete
          </MuiButton>
        </DialogActions>
      </Dialog>
    </Drawer>
  );
}

function StatChip({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <Box sx={{ color: 'var(--neutral-400)', display: 'flex' }}>{icon}</Box>
      <MuiTypography variant="body2" sx={{ fontWeight: themeTokens.typography.fontWeight.semibold }}>
        {value}
      </MuiTypography>
      <MuiTypography variant="body2" color="text.secondary">
        {label}
      </MuiTypography>
    </Box>
  );
}
