import React from 'react';
import { BoulderProblem, BoardDetails, ParsedBoardRouteParameters } from '@/app/lib/types';
import { constructClimbViewUrl } from '@/app/lib/url-utils';
import BoardRenderer from '@/app/components/board-renderer/board-renderer';
import Link from 'next/link';
type ClimbCardCoverProps = {
  climb: BoulderProblem;
  parsedParams: ParsedBoardRouteParameters;
  boardDetails: BoardDetails;
  linkToClimb?: boolean;
  onClick?: () => void;
};

const ClimbCardCover = ({ climb, parsedParams, boardDetails, onClick, linkToClimb }: ClimbCardCoverProps) => {
  const boardRenderer = (
    <div
      onClick={!linkToClimb ? onClick : undefined}
      style={{
        width: '100%',
        height: 'auto',
        position: 'relative',
        cursor: !linkToClimb && onClick ? 'pointer' : undefined,
      }}
    >
      <BoardRenderer
        boardDetails={boardDetails}
        board_name={parsedParams.board_name}
        holdsData={boardDetails.holdsData}
        litUpHoldsMap={climb.litUpHoldsMap}
      />
    </div>
  );
  if (linkToClimb) {
    return (
      <Link onClick={onClick} href={constructClimbViewUrl(parsedParams, climb.uuid)}>
        {boardRenderer}
      </Link>
    );
  }
  return boardRenderer;
};

export default ClimbCardCover;
