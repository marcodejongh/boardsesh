'use client';
import React from 'react';
import { Climb, BoardDetails } from '@/app/lib/types';
import BoardRenderer from '@/app/components/board-renderer/board-renderer';

type ClimbCardCoverProps = {
  climb?: Climb;
  boardDetails: BoardDetails;
  onClick?: () => void;
};

const ClimbCardCover = ({ climb, boardDetails, onClick }: ClimbCardCoverProps) => {
  return (
    <div
      onClick={onClick}
      style={{
        width: '100%',
        height: 'auto',
        position: 'relative',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <BoardRenderer boardDetails={boardDetails} litUpHoldsMap={climb?.litUpHoldsMap} mirrored={!!climb?.mirrored} />
    </div>
  );
};

export default ClimbCardCover;
