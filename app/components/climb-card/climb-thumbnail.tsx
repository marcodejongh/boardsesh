import React, { useState } from 'react';

import { BoardDetails, Climb } from '@/app/lib/types';
import BoardRenderer from '../board-renderer/board-renderer';
import ClimbCardModal from './climb-card-modal';

type ClimbThumbnailProps = {
  currentClimb: Climb | null;
  boardDetails: BoardDetails;
};

const ClimbThumbnail = ({ boardDetails, currentClimb }: ClimbThumbnailProps) => {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <a onClick={currentClimb ? () => setModalOpen(true) : undefined}>
        <BoardRenderer
          litUpHoldsMap={currentClimb?.litUpHoldsMap}
          mirrored={!!currentClimb?.mirrored}
          boardDetails={boardDetails}
          thumbnail
        />
      </a>
      {currentClimb && (
        <ClimbCardModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          climb={currentClimb}
          boardDetails={boardDetails}
        />
      )}
    </>
  );
};

export default ClimbThumbnail;
