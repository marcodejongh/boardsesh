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
  defaultExpanded?: boolean;
}

export default function FeedCommentButton({
  entityType,
  entityId,
  commentCount = 0,
  defaultExpanded = false,
}: FeedCommentButtonProps) {
  const [open, setOpen] = useState(defaultExpanded);

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setOpen((prev) => !prev);
  }, []);

  return (
    <Box>
      <IconButton
        size="small"
        aria-label={open ? 'Hide comments' : 'Show comments'}
        sx={{ p: 0.5, color: open ? 'text.primary' : 'text.secondary' }}
        onClick={handleToggle}
      >
        <ChatBubbleOutlineOutlined sx={{ fontSize: 18 }} />
        {commentCount > 0 && (
          <Typography
            variant="caption"
            component="span"
            sx={{ ml: 0.5, color: 'inherit', userSelect: 'none', fontSize: 12 }}
          >
            {commentCount}
          </Typography>
        )}
      </IconButton>

      <Collapse in={open} unmountOnExit>
        <Box sx={{ mt: 1 }}>
          <CommentSection entityType={entityType} entityId={entityId} title="Comments" />
        </Box>
      </Collapse>
    </Box>
  );
}
