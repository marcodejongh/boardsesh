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
  /** When true, SVG fills container height (use with fixed-height container). Otherwise uses maxHeight. */
  fillHeight?: boolean;
  /** Custom max-height for the board SVG. Defaults to '55vh', or '10vh' for thumbnails. Ignored when fillHeight is true. */
  maxHeight?: string;
  onHoldClick?: (holdId: number) => void;
};

const BoardRenderer = React.memo(
  ({ boardDetails, thumbnail, maxHeight, fillHeight, litUpHoldsMap, mirrored, onHoldClick }: BoardProps) => {
    const { boardWidth, boardHeight, holdsData } = boardDetails;

    const resolvedMaxHeight = thumbnail ? '10vh' : (maxHeight ?? '55vh');

    // When fillHeight is true, SVG fills container and uses preserveAspectRatio to fit
    // Otherwise, use auto height with maxHeight constraint
    const svgStyle = fillHeight
      ? {
          width: '100%',
          height: '100%',
          display: 'block',
        }
      : {
          width: '100%',
          height: 'auto',
          display: 'block',
          maxHeight: resolvedMaxHeight,
        };

    return (
      <svg
        viewBox={`0 0 ${boardWidth} ${boardHeight}`}
        preserveAspectRatio="xMidYMid meet"
        style={svgStyle}
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
    // Compare thumbnail, maxHeight, and fillHeight (affects SVG sizing)
    if (prevProps.thumbnail !== nextProps.thumbnail) return false;
    if (prevProps.maxHeight !== nextProps.maxHeight) return false;
    if (prevProps.fillHeight !== nextProps.fillHeight) return false;

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
