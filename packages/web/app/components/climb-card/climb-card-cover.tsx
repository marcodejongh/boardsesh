'use client';
import React from 'react';
import { Climb, BoardDetails } from '@/app/lib/types';
import BoardRenderer from '@/app/components/board-renderer/board-renderer';

type ClimbCardCoverProps = {
  climb?: Climb;
  boardDetails: BoardDetails;
  onClick?: () => void;
  onDoubleClick?: () => void;
};

const ClimbCardCover = ({ climb, boardDetails, onClick, onDoubleClick }: ClimbCardCoverProps) => {
  return (
    <div
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      style={{
        width: '100%',
        height: 'auto',
        position: 'relative',
        cursor: onClick || onDoubleClick ? 'pointer' : 'default',
      }}
    >
      <BoardRenderer boardDetails={boardDetails} litUpHoldsMap={climb?.litUpHoldsMap} mirrored={!!climb?.mirrored} />
    </div>
  );
};

export default ClimbCardCover;
