'use client';

import React from 'react';
import Card from 'antd/es/card';

import ClimbCardCover from './climb-card-cover';
import ClimbTitle from './climb-title';
import { Climb, BoardDetails } from '@/app/lib/types';
import { ClimbActions } from '../climb-actions';
import { themeTokens } from '@/app/theme/theme-config';

type ClimbCardProps = {
  climb?: Climb;
  boardDetails: BoardDetails;
  coverLinkToClimb?: boolean;
  onCoverClick?: () => void;
  selected?: boolean;
  actions?: React.JSX.Element[];
  /** Optional expanded content to render below the cover */
  expandedContent?: React.ReactNode;
};

/**
 * Compare actions arrays for memo equality.
 * Handles common cases: both undefined, both empty arrays, or same reference.
 */
const areActionsEqual = (
  prev: React.JSX.Element[] | undefined,
  next: React.JSX.Element[] | undefined,
): boolean => {
  // Same reference (including both undefined)
  if (prev === next) return true;
  // One undefined, one not
  if (!prev || !next) return false;
  // Both empty arrays (common case: actions={[]} passed each render)
  if (prev.length === 0 && next.length === 0) return true;
  // Different lengths
  if (prev.length !== next.length) return false;
  // Compare by keys (React elements should have stable keys)
  return prev.every((el, i) => el.key === next[i].key);
};

const ClimbCard = React.memo(
  ({ climb, boardDetails, onCoverClick, selected, actions, expandedContent }: ClimbCardProps) => {
    const cover = <ClimbCardCover climb={climb} boardDetails={boardDetails} onClick={onCoverClick} />;

    const cardTitle = climb ? (
      <ClimbTitle climb={climb} layout="horizontal" showSetterInfo />
    ) : (
      'Loading...'
    );

    // Get actions and expanded content if not provided
    let cardActions = actions;
    let inlineExpandedContent = expandedContent;

    if (!actions && climb) {
      const result = ClimbActions.asCardActionsWithContent({
        climb,
        boardDetails,
        angle: climb.angle,
        exclude: ['tick', 'openInApp', 'mirror', 'share', 'addToList'],
      });
      cardActions = result.actions as React.JSX.Element[];
      inlineExpandedContent = result.expandedContent;
    }

    return (
      <div data-testid="climb-card">
        <Card
          title={cardTitle}
          size="small"
          style={{
            borderColor: selected ? themeTokens.colors.primary : undefined,
          }}
          styles={{
            header: { paddingTop: 8, paddingBottom: 6 },
            body: {
              padding: 6,
              backgroundColor: selected ? themeTokens.semantic.selectedLight : undefined,
            },
          }}
          actions={cardActions || []}
        >
          {cover}
          {inlineExpandedContent}
        </Card>
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Compare climb by uuid (stable identifier)
    if (prevProps.climb?.uuid !== nextProps.climb?.uuid) return false;
    // Compare selected state
    if (prevProps.selected !== nextProps.selected) return false;
    // Compare boardDetails by reference (stable from server) or by key identifiers
    if (prevProps.boardDetails !== nextProps.boardDetails) {
      // Fallback: compare by stable identifiers if references differ
      const prevBd = prevProps.boardDetails;
      const nextBd = nextProps.boardDetails;
      if (
        prevBd.board_name !== nextBd.board_name ||
        prevBd.layout_id !== nextBd.layout_id ||
        prevBd.size_id !== nextBd.size_id
      ) {
        return false;
      }
    }
    // Compare callbacks by reference (parent should memoize with useCallback)
    if (prevProps.onCoverClick !== nextProps.onCoverClick) return false;
    // Compare actions arrays properly
    if (!areActionsEqual(prevProps.actions, nextProps.actions)) return false;

    return true;
  },
);

ClimbCard.displayName = 'ClimbCard';

export default ClimbCard;
