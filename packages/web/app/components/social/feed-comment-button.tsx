'use client';

import React, { useState, useCallback } from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Collapse from '@mui/material/Collapse';
import ChatBubbleOutlineOutlined from '@mui/icons-material/ChatBubbleOutlineOutlined';
import type { SocialEntityType } from '@boardsesh/shared-schema';
import CommentSection from './comment-section';

interface FeedCommentButtonProps {
  entityType: SocialEntityType;
  entityId: string;
  commentCount?: number;
}

export default function FeedCommentButton({
  entityType,
  entityId,
  commentCount = 0,
}: FeedCommentButtonProps) {
  const [open, setOpen] = useState(false);

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setOpen((prev) => !prev);
  }, []);

  return (
    <Box>
      <Box
        sx={{ display: 'flex', alignItems: 'center', gap: 0.25, cursor: 'pointer' }}
        onClick={handleToggle}
        role="button"
        tabIndex={0}
      >
        <IconButton
          size="small"
          aria-label={open ? 'Hide comments' : 'Show comments'}
          sx={{ p: 0.5, color: open ? 'text.primary' : 'text.secondary' }}
          onClick={handleToggle}
        >
          <ChatBubbleOutlineOutlined sx={{ fontSize: 18 }} />
        </IconButton>
        <Typography
          variant="caption"
          sx={{ color: open ? 'text.primary' : 'text.secondary', userSelect: 'none' }}
        >
          {commentCount > 0 ? commentCount : ''}
        </Typography>
      </Box>

      <Collapse in={open} unmountOnExit>
        <Box sx={{ mt: 1 }}>
          <CommentSection entityType={entityType} entityId={entityId} title="Comments" />
        </Box>
      </Collapse>
    </Box>
  );
}
