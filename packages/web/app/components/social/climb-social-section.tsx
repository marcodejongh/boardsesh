'use client';

import React from 'react';
import Box from '@mui/material/Box';
import VoteButton from './vote-button';
import CommentSection from './comment-section';

interface ClimbSocialSectionProps {
  climbUuid: string;
}

export default function ClimbSocialSection({ climbUuid }: ClimbSocialSectionProps) {
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <VoteButton entityType="climb" entityId={climbUuid} />
      </Box>
      <CommentSection entityType="climb" entityId={climbUuid} title="Discussion" />
    </Box>
  );
}
