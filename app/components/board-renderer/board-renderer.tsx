import React from 'react';
import { getImageUrl } from './util';
import { BoardName, BoardDetails } from '@/app/lib/types';
import { HoldRenderData, LitUpHoldsMap } from './types';
import BoardLitupHolds from './board-litup-holds';

export type BoardProps = {
  boardDetails: BoardDetails;
  board_name: BoardName;
  holdsData: HoldRenderData[];
  litUpHoldsMap?: LitUpHoldsMap;
  thumbnail?: boolean;
};

const BoardRenderer = ({ boardDetails, board_name, litUpHoldsMap, holdsData, thumbnail }: BoardProps) => {
  const { boardWidth, boardHeight } = boardDetails;

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
        <image key={imageUrl} href={getImageUrl(imageUrl, board_name)} width="100%" height="100%" />
      ))}
      {litUpHoldsMap && <BoardLitupHolds holdsData={holdsData} litUpHoldsMap={litUpHoldsMap} />}
    </svg>
  );
};

export default BoardRenderer;
