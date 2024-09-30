'use client';
import React, { useState } from 'react';
import { BoulderProblem, BoardDetails } from '@/app/lib/types';
import BoardRenderer from '@/app/components/board-renderer/board-renderer';
import ClimbCardModal from './climb-card-modal';

type ClimbCardCoverProps = {
  climb?: BoulderProblem;
  boardDetails: BoardDetails;
  onClick?: () => void;
};

const ClimbCardCover = ({ climb, boardDetails, onClick }: ClimbCardCoverProps) => {
  const [modalOpen, setModalOpen] = useState(false);

  const boardRenderer = (
    <div
      onClick={onClick ? onClick : () => setModalOpen(true)}
      style={{
        width: '100%',
        height: 'auto',
        position: 'relative',
        cursor: 'pointer',
      }}
    >
      <BoardRenderer
        boardDetails={boardDetails}
        holdsData={boardDetails.holdsData}
        litUpHoldsMap={climb && climb.litUpHoldsMap}
      />
      <ClimbCardModal
        isVisible={modalOpen}
        onClose={() => setModalOpen(false)}
        climb={climb}
        boardDetails={boardDetails}
      />
    </div>
  );

  return boardRenderer;
};

export default ClimbCardCover;
