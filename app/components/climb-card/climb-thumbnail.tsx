import React, { useState } from 'react';

import { BoardDetails, BoulderProblem } from '@/app/lib/types';
import BoardRenderer from '../board-renderer/board-renderer';
import ClimbCardModal from './climb-card-modal';

type ClimbThumbnailProps = {
  currentClimb: BoulderProblem | null;
  boardDetails: BoardDetails;
};

const ClimbThumbnail = ({ boardDetails, currentClimb }: ClimbThumbnailProps) => {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <a onClick={() => setModalOpen(true)}>
        <BoardRenderer
          holdsData={boardDetails.holdsData}
          litUpHoldsMap={currentClimb ? currentClimb.litUpHoldsMap : undefined}
          boardDetails={boardDetails}
          thumbnail
        />
      </a>
      {currentClimb && (
        <ClimbCardModal
          isVisible={modalOpen}
          onClose={() => setModalOpen(false)}
          climb={currentClimb}
          boardDetails={boardDetails}
        />
      )}
    </>
  );
};

export default ClimbThumbnail;
