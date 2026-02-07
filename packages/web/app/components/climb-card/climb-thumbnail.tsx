import React from 'react';
import Link from 'next/link';

import { BoardDetails, Climb } from '@/app/lib/types';
import BoardRenderer from '../board-renderer/board-renderer';
import { constructClimbViewUrl, constructClimbViewUrlWithSlugs, parseBoardRouteParams } from '@/app/lib/url-utils';

type ClimbThumbnailProps = {
  currentClimb: Climb | null;
  boardDetails: BoardDetails;
  enableNavigation?: boolean;
  onNavigate?: () => void;
  maxHeight?: string;
};

const ClimbThumbnail = ({ boardDetails, currentClimb, enableNavigation = false, onNavigate, maxHeight }: ClimbThumbnailProps) => {
  if (enableNavigation && currentClimb) {
    // Use slug-based URL construction if slug names are available
    const climbViewUrl =
      boardDetails.layout_name && boardDetails.size_name && boardDetails.set_names
        ? constructClimbViewUrlWithSlugs(
            boardDetails.board_name,
            boardDetails.layout_name,
            boardDetails.size_name,
            boardDetails.size_description,
            boardDetails.set_names,
            currentClimb.angle,
            currentClimb.uuid,
            currentClimb.name,
          )
        : (() => {
            const routeParams = parseBoardRouteParams({
              board_name: boardDetails.board_name,
              layout_id: boardDetails.layout_id.toString(),
              size_id: boardDetails.size_id.toString(),
              set_ids: boardDetails.set_ids.join(','),
              angle: currentClimb.angle.toString(),
            });
            return constructClimbViewUrl(routeParams, currentClimb.uuid, currentClimb.name);
          })();

    return (
      <Link href={climbViewUrl} onClick={() => onNavigate?.()}>
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
