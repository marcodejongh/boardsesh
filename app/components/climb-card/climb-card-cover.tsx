'use client';
import React, { useState } from 'react';
import { Climb, BoardDetails } from '@/app/lib/types';
import BoardRenderer from '@/app/components/board-renderer/board-renderer';
import ClimbCardModal from './climb-card-modal';

type ClimbCardCoverProps = {
  climb?: Climb;
  boardDetails: BoardDetails;
  onClick?: () => void;
};

const ClimbCardCover = ({ climb, boardDetails, onClick }: ClimbCardCoverProps) => {
  const [modalOpen, setModalOpen] = useState(false);

  const boardRenderer = (
    <div
      onClick={onClick ? undefined : () => setModalOpen(true)}
      onDoubleClick={onClick ? onClick : undefined}
      style={{
        width: '100%',
        height: 'auto',
        position: 'relative',
        cursor: 'pointer',
      }}
    >
      <BoardRenderer
        boardDetails={boardDetails}
        climb={climb}
      />
      <ClimbCardModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        climb={climb}
        boardDetails={boardDetails}
      />
    </div>
  );

  return boardRenderer;
};

export default ClimbCardCover;
