import React from 'react';
import { getImageUrl } from './util';
import { BoardDetails } from '@/app/lib/types';
import BoardLitupHolds from './board-litup-holds';
import { LitUpHoldsMap } from './types';
import styles from './board-renderer.module.css';
import MoonBoardRenderer from '../moonboard-renderer/moonboard-renderer';

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
    // Delegate to MoonBoardRenderer for Moonboard (uses grid-based rendering)
    if (boardDetails.board_name === 'moonboard' && boardDetails.layoutFolder) {
      return (
        <MoonBoardRenderer
          layoutFolder={boardDetails.layoutFolder}
          holdSetImages={boardDetails.holdSetImages || []}
          litUpHoldsMap={litUpHoldsMap}
          mirrored={mirrored}
          thumbnail={thumbnail}
          onHoldClick={onHoldClick}
        />
      );
    }

    const { boardWidth, boardHeight, holdsData } = boardDetails;

    // When fillHeight is true, SVG fills container and uses preserveAspectRatio to fit
    // Otherwise, use auto height with maxHeight constraint
    const svgClassName = fillHeight
      ? `${styles.svg} ${styles.svgFillHeight}`
      : `${styles.svg} ${styles.svgAutoHeight}`;

    // Only compute maxHeight when not using fillHeight
    const svgStyle = fillHeight ? undefined : { maxHeight: maxHeight ?? (thumbnail ? '10vh' : '55vh') };

    return (
      <svg
        viewBox={`0 0 ${boardWidth} ${boardHeight}`}
        preserveAspectRatio="xMidYMid meet"
        className={svgClassName}
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
            thumbnail={thumbnail}
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
