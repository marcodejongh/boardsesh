'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Avatar from '@mui/material/Avatar';
import MuiTypography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Divider from '@mui/material/Divider';
import MuiButton from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import CloseOutlined from '@mui/icons-material/CloseOutlined';
import LocationOnOutlined from '@mui/icons-material/LocationOnOutlined';
import EditOutlined from '@mui/icons-material/EditOutlined';
import DeleteOutlined from '@mui/icons-material/DeleteOutlined';
import TrendingUpOutlined from '@mui/icons-material/TrendingUpOutlined';
import PersonOutlined from '@mui/icons-material/PersonOutlined';
import PeopleOutlined from '@mui/icons-material/PeopleOutlined';
import ChatBubbleOutlined from '@mui/icons-material/ChatBubbleOutlineOutlined';
import type { UserBoard } from '@boardsesh/shared-schema';
import { useWsAuthToken } from '@/app/hooks/use-ws-auth-token';
import { useSnackbar } from '@/app/components/providers/snackbar-provider';
import { createGraphQLHttpClient } from '@/app/lib/graphql/client';
import {
  GET_BOARD,
  DELETE_BOARD,
  type GetBoardQueryResponse,
  type GetBoardQueryVariables,
  type DeleteBoardMutationVariables,
  type DeleteBoardMutationResponse,
} from '@/app/lib/graphql/operations';
import { useSession } from 'next-auth/react';
import { themeTokens } from '@/app/theme/theme-config';
import FollowBoardButton from './follow-board-button';
import BoardLeaderboard from './board-leaderboard';
import EditBoardForm from './edit-board-form';
import CommentSection from '@/app/components/social/comment-section';

const BOARD_TYPE_LABELS: Record<string, string> = {
  kilter: 'Kilter',
  tension: 'Tension',
  moonboard: 'MoonBoard',
  decoy: 'Decoy',
  touchstone: 'Touchstone',
  grasshopper: 'Grasshopper',
  soill: 'So iLL',
};

interface BoardDetailProps {
  boardUuid: string;
  open: boolean;
  onClose: () => void;
  onDeleted?: () => void;
}

export default function BoardDetail({ boardUuid, open, onClose, onDeleted }: BoardDetailProps) {
  const [board, setBoard] = useState<UserBoard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { token } = useWsAuthToken();
  const { data: session } = useSession();
  const { showMessage } = useSnackbar();
  const currentUserId = session?.user?.id ?? null;

  const fetchBoard = useCallback(async () => {
    if (!token || !boardUuid) return;
    setIsLoading(true);
    try {
      const client = createGraphQLHttpClient(token);
      const data = await client.request<GetBoardQueryResponse, GetBoardQueryVariables>(
        GET_BOARD,
        { boardUuid },
      );
      setBoard(data.board ?? null);
    } catch (error) {
      console.error('Failed to fetch board:', error);
    } finally {
      setIsLoading(false);
    }
  }, [token, boardUuid]);

  useEffect(() => {
    if (open) {
      fetchBoard();
      setIsEditing(false);
      setActiveTab(0);
    }
  }, [open, fetchBoard]);

  const isOwner = !!currentUserId && board?.ownerId === currentUserId;

  const handleDelete = async () => {
    if (!token || !board) return;
    if (!window.confirm(`Delete "${board.name}"? This action can be undone later.`)) return;

    setIsDeleting(true);
    try {
      const client = createGraphQLHttpClient(token);
      await client.request<DeleteBoardMutationResponse, DeleteBoardMutationVariables>(
        DELETE_BOARD,
        { boardUuid: board.uuid },
      );
      showMessage('Board deleted', 'success');
      onDeleted?.();
      onClose();
    } catch (error) {
      console.error('Failed to delete board:', error);
      showMessage('Failed to delete board', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditSuccess = (updatedBoard: UserBoard) => {
    setBoard(updatedBoard);
    setIsEditing(false);
  };

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          height: '90dvh',
          borderTopLeftRadius: themeTokens.borderRadius.xl,
          borderTopRightRadius: themeTokens.borderRadius.xl,
        },
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Handle bar */}
        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1 }}>
          <Box
            sx={{
              width: 36,
              height: 4,
              borderRadius: 2,
              backgroundColor: themeTokens.neutral[300],
            }}
          />
        </Box>

        {/* Close button */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', px: 1 }}>
          <IconButton onClick={onClose} size="small">
            <CloseOutlined />
          </IconButton>
        </Box>

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
            <CircularProgress />
          </Box>
        ) : !board ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
            <MuiTypography color="text.secondary">Board not found</MuiTypography>
          </Box>
        ) : isEditing ? (
          <Box sx={{ px: 2, pb: 2, overflow: 'auto', flex: 1 }}>
            <EditBoardForm
              board={board}
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
                    {board.name}
                  </MuiTypography>
                  {board.locationName && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                      <LocationOnOutlined sx={{ fontSize: 16, color: themeTokens.neutral[400] }} />
                      <MuiTypography variant="body2" color="text.secondary">
                        {board.locationName}
                      </MuiTypography>
                    </Box>
                  )}
                </Box>
                <Chip
                  label={BOARD_TYPE_LABELS[board.boardType] || board.boardType}
                  size="small"
                  variant="outlined"
                />
              </Box>

              {/* Owner info */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.5 }}>
                <Avatar
                  src={board.ownerAvatarUrl ?? undefined}
                  sx={{ width: 24, height: 24, fontSize: 11 }}
                >
                  {board.ownerDisplayName?.[0]?.toUpperCase()}
                </Avatar>
                <MuiTypography variant="body2" color="text.secondary">
                  {board.ownerDisplayName}
                </MuiTypography>
              </Box>

              {board.description && (
                <MuiTypography variant="body2" sx={{ mt: 1.5, color: themeTokens.neutral[600] }}>
                  {board.description}
                </MuiTypography>
              )}

              {/* Stats */}
              <Box sx={{ display: 'flex', gap: 2.5, mt: 2, flexWrap: 'wrap' }}>
                <StatChip icon={<TrendingUpOutlined sx={{ fontSize: 16 }} />} value={board.totalAscents} label="ascents" />
                <StatChip icon={<PersonOutlined sx={{ fontSize: 16 }} />} value={board.uniqueClimbers} label="climbers" />
                <StatChip icon={<PeopleOutlined sx={{ fontSize: 16 }} />} value={board.followerCount} label="followers" />
                <StatChip icon={<ChatBubbleOutlined sx={{ fontSize: 16 }} />} value={board.commentCount} label="comments" />
              </Box>

              {/* Actions */}
              <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                {!isOwner && (
                  <FollowBoardButton
                    boardUuid={board.uuid}
                    initialIsFollowing={board.isFollowedByMe}
                    onFollowChange={() => fetchBoard()}
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
                      onClick={handleDelete}
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
              <Tab label="Leaderboard" sx={{ textTransform: 'none' }} />
              <Tab label="Comments" sx={{ textTransform: 'none' }} />
            </Tabs>

            {/* Tab content */}
            <Box sx={{ flex: 1, overflow: 'auto', px: 2, py: 2 }}>
              {activeTab === 0 && <BoardLeaderboard boardUuid={board.uuid} />}
              {activeTab === 1 && (
                <CommentSection
                  entityType="board"
                  entityId={board.uuid}
                  title="Board Discussion"
                />
              )}
            </Box>
          </>
        )}
      </Box>
    </Drawer>
  );
}

function StatChip({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <Box sx={{ color: themeTokens.neutral[400], display: 'flex' }}>{icon}</Box>
      <MuiTypography variant="body2" sx={{ fontWeight: themeTokens.typography.fontWeight.semibold }}>
        {value}
      </MuiTypography>
      <MuiTypography variant="body2" color="text.secondary">
        {label}
      </MuiTypography>
    </Box>
  );
}
