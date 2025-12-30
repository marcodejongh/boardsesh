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

const BoardRenderer = React.memo(
  ({ boardDetails, thumbnail, litUpHoldsMap, mirrored, onHoldClick }: BoardProps) => {
    const { boardWidth, boardHeight, holdsData } = boardDetails;

    return (
      <svg
        viewBox={`0 0 ${boardWidth} ${boardHeight}`}
        preserveAspectRatio="xMidYMid meet"
        style={{
          width: '100%',
          height: 'auto',
          display: 'block',
          maxHeight: thumbnail ? '10vh' : '80vh',
        }}
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
  },
  (prevProps, nextProps) => {
    // Compare thumbnail (affects SVG maxHeight)
    if (prevProps.thumbnail !== nextProps.thumbnail) return false;

    // Compare mirrored and onHoldClick (passed to BoardLitupHolds)
    if (prevProps.mirrored !== nextProps.mirrored) return false;
    if (prevProps.onHoldClick !== nextProps.onHoldClick) return false;

    // Compare litUpHoldsMap by reference - different climbs have different map objects
    if (prevProps.litUpHoldsMap !== nextProps.litUpHoldsMap) return false;

    // Compare boardDetails by key identifiers and dimensions
    if (prevProps.boardDetails !== nextProps.boardDetails) {
      const prevBd = prevProps.boardDetails;
      const nextBd = nextProps.boardDetails;

      // Compare identifiers
      if (
        prevBd.board_name !== nextBd.board_name ||
        prevBd.layout_id !== nextBd.layout_id ||
        prevBd.size_id !== nextBd.size_id
      ) {
        return false;
      }

      // Compare dimensions (affects SVG viewBox)
      if (prevBd.boardWidth !== nextBd.boardWidth || prevBd.boardHeight !== nextBd.boardHeight) {
        return false;
      }

      // Compare images (affects image rendering)
      const prevImages = Object.keys(prevBd.images_to_holds);
      const nextImages = Object.keys(nextBd.images_to_holds);
      if (prevImages.length !== nextImages.length) return false;
      for (let i = 0; i < prevImages.length; i++) {
        if (prevImages[i] !== nextImages[i]) return false;
      }

      // Compare holdsData reference (passed to BoardLitupHolds)
      if (prevBd.holdsData !== nextBd.holdsData) return false;
    }

    return true;
  },
);

BoardRenderer.displayName = 'BoardRenderer';

export default BoardRenderer;
