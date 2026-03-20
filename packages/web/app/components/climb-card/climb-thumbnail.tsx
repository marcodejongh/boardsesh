import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { BoardDetails, Climb } from '@/app/lib/types';
import BoardRenderer from '../board-renderer/board-renderer';
import { getContextAwareClimbViewUrl } from '@/app/lib/url-utils';

type ClimbThumbnailProps = {
  currentClimb: Climb | null;
  boardDetails: BoardDetails;
  enableNavigation?: boolean;
  onNavigate?: () => void;
  maxHeight?: string;
};

const ClimbThumbnail = ({ boardDetails, currentClimb, enableNavigation = false, onNavigate, maxHeight }: ClimbThumbnailProps) => {
  const pathname = usePathname();

  if (enableNavigation && currentClimb) {
    const climbViewUrl = getContextAwareClimbViewUrl(
      pathname,
      boardDetails,
      currentClimb.angle,
      currentClimb.uuid,
      currentClimb.name,
    );

    return (
      <Link href={climbViewUrl} onClick={() => onNavigate?.()} data-testid="climb-thumbnail-link">
        <BoardRenderer
          litUpHoldsMap={currentClimb?.litUpHoldsMap}
          mirrored={!!currentClimb?.mirrored}
          boardDetails={boardDetails}
          thumbnail
          maxHeight={maxHeight}
        />
      </Link>
    );
  }

  return (
    <BoardRenderer
      litUpHoldsMap={currentClimb?.litUpHoldsMap}
      mirrored={!!currentClimb?.mirrored}
      boardDetails={boardDetails}
      thumbnail
      maxHeight={maxHeight}
    />
  );
};

export default ClimbThumbnail;
