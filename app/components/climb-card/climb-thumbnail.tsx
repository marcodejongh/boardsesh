import React, { useState } from 'react';
import Link from 'next/link';

import { BoardDetails, Climb } from '@/app/lib/types';
import BoardRenderer from '../board-renderer/board-renderer';
import ClimbCardModal from './climb-card-modal';
import { constructClimbViewUrlWithSlugs } from '@/app/lib/url-utils';

type ClimbThumbnailProps = {
  currentClimb: Climb | null;
  boardDetails: BoardDetails;
  enableNavigation?: boolean;
  onNavigate?: () => void;
};

const ClimbThumbnail = ({ boardDetails, currentClimb, enableNavigation = false, onNavigate }: ClimbThumbnailProps) => {
  const [modalOpen, setModalOpen] = useState(false);

  const handleModalClick = () => {
    if (currentClimb) {
      setModalOpen(true);
    }
  };

  const handleLinkClick = () => {
    onNavigate?.();
  };

  if (enableNavigation && currentClimb) {
    // Use slug-based URL construction if slug names are available
    const climbViewUrl = constructClimbViewUrlWithSlugs(
          boardDetails.board_name,
          boardDetails.layout_name || '',
          boardDetails.size_name || '',
          boardDetails.set_names || [],
          currentClimb.angle,
          currentClimb.uuid,
          currentClimb.name
        );
      

    return (
      <Link href={climbViewUrl} onClick={handleLinkClick}>
        <BoardRenderer
          litUpHoldsMap={currentClimb?.litUpHoldsMap}
          mirrored={!!currentClimb?.mirrored}
          boardDetails={boardDetails}
          thumbnail
        />
      </Link>
    );
  }

  return (
    <>
      <a onClick={handleModalClick} style={{ cursor: currentClimb ? 'pointer' : 'default' }}>
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
