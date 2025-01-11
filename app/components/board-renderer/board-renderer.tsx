import React from 'react';
import { getImageUrl } from './util';
import { BoardDetails } from '@/app/lib/types';
import BoardLitupHolds from './board-litup-holds';
import { LitUpHoldsMap } from './types';

export type BoardProps = {
  boardDetails: BoardDetails;
  litUpHoldsMap?: LitUpHoldsMap;
  mirrored: boolean;
  thumbnail?: boolean;
  onHoldClick?: (holdId: number) => void;
};

const BoardRenderer = ({ boardDetails, thumbnail, litUpHoldsMap, mirrored, onHoldClick }: BoardProps) => {
  const { boardWidth, boardHeight, holdsData } = boardDetails;

  return (
    <svg
      viewBox={`0 0 ${boardWidth} ${boardHeight}`}
      preserveAspectRatio="xMidYMid meet" // Ensures aspect ratio is maintained
      style={{
        width: '100%',
        height: 'auto',
        display: 'block',
        maxHeight: thumbnail ? '10vh' : '55vh', // TODO: Find better size
      }} // Ensures scaling
    >
      {Object.keys(boardDetails.images_to_holds).map((imageUrl) => (
        <image key={imageUrl} href={getImageUrl(imageUrl, boardDetails.board_name)} width="100%" height="100%" />
      ))}
      {litUpHoldsMap && (
        <BoardLitupHolds
          onHoldClick={onHoldClick}
          holdsData={holdsData}
          litUpHoldsMap={litUpHoldsMap}
          mirrored={mirrored}
        />
      )}
    </svg>
  );
};

export default BoardRenderer;
