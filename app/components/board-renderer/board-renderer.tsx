import React from 'react';
import { getImageUrl } from './util';
import { BoardDetails, Climb } from '@/app/lib/types';
import BoardLitupHolds from './board-litup-holds';

export type BoardProps = {
  boardDetails: BoardDetails;
  climb?: Climb;
  thumbnail?: boolean;
};

const BoardRenderer = ({ boardDetails, thumbnail, climb }: BoardProps) => {
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
      {climb && climb.litUpHoldsMap && <BoardLitupHolds holdsData={holdsData} climb={climb} />}
    </svg>
  );
};

export default BoardRenderer;
