'use client';

import React from 'react';
import Box from '@mui/material/Box';
import VoteButton from './vote-button';
import CommentSection from './comment-section';
import ProposalSection from './proposal-section';

interface ClimbSocialSectionProps {
  climbUuid: string;
  boardType?: string;
  angle?: number;
  currentClimbDifficulty?: string;
  boardName?: string;
}

export default function ClimbSocialSection({ climbUuid, boardType, angle, currentClimbDifficulty, boardName }: ClimbSocialSectionProps) {
  return (
    <Box>
      {boardType && angle != null && (
        <ProposalSection
          climbUuid={climbUuid}
          boardType={boardType}
          angle={angle}
          currentClimbDifficulty={currentClimbDifficulty}
          boardName={boardName}
        />
      )}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <VoteButton entityType="climb" entityId={climbUuid} />
      </Box>
      <CommentSection entityType="climb" entityId={climbUuid} title="Discussion" />
    </Box>
  );
}
