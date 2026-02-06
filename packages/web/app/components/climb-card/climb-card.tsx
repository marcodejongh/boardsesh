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
  onCoverDoubleClick?: () => void;
  selected?: boolean;
  actions?: React.JSX.Element[];
  /** Optional expanded content to render over the cover */
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

/**
 * Inner component that handles dynamic action generation.
 * Separated to allow proper hook usage without affecting memoization of static cases.
 * Note: This component generates its own actions - external props are not supported.
 *
 * Uses ClimbActions component directly to ensure hooks are called within the React component tree.
 */
function ClimbCardWithActions({
  climb,
  boardDetails,
  onCoverClick,
  onCoverDoubleClick,
  selected,
}: {
  climb: Climb;
  boardDetails: BoardDetails;
  onCoverClick?: () => void;
  onCoverDoubleClick?: () => void;
  selected?: boolean;
}) {
  const cover = <ClimbCardCover climb={climb} boardDetails={boardDetails} onClick={onCoverClick} onDoubleClick={onCoverDoubleClick} />;
  const cardTitle = <ClimbTitle climb={climb} layout="horizontal" showSetterInfo />;

  // Build exclude list - MoonBoard doesn't have a view details page yet
  const excludeActions: ('tick' | 'openInApp' | 'mirror' | 'share' | 'viewDetails')[] = [
    'tick',
    'openInApp',
    'mirror',
    'share',
  ];
  if (boardDetails.board_name === 'moonboard') {
    excludeActions.push('viewDetails');
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
          header: { paddingTop: themeTokens.spacing[2], paddingBottom: themeTokens.spacing[1] + 2 },
          body: {
            padding: themeTokens.spacing[1] + 2,
            backgroundColor: selected ? themeTokens.semantic.selectedLight : undefined,
          },
        }}
      >
        <div style={{ position: 'relative' }}>
          {cover}
        </div>
        {/* Actions rendered as a proper component to support hooks */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
            borderTop: `1px solid ${themeTokens.neutral[200]}`,
            marginTop: themeTokens.spacing[2],
            paddingTop: themeTokens.spacing[2],
          }}
        >
          <ClimbActions
            climb={climb}
            boardDetails={boardDetails}
            angle={climb.angle}
            viewMode="icon"
            exclude={excludeActions}
          />
        </div>
      </Card>
    </div>
  );
}

/**
 * Memoized component for when actions are provided externally.
 */
const ClimbCardStatic = React.memo(
  ({
    climb,
    boardDetails,
    onCoverClick,
    onCoverDoubleClick,
    selected,
    actions,
    expandedContent,
  }: ClimbCardProps) => {
    const cover = <ClimbCardCover climb={climb} boardDetails={boardDetails} onClick={onCoverClick} onDoubleClick={onCoverDoubleClick} />;
    const cardTitle = climb ? (
      <ClimbTitle climb={climb} layout="horizontal" showSetterInfo />
    ) : (
      'Loading...'
    );

    return (
      <div data-testid="climb-card">
        <Card
          title={cardTitle}
          size="small"
          style={{
            borderColor: selected ? themeTokens.colors.primary : undefined,
          }}
          styles={{
            header: { paddingTop: themeTokens.spacing[2], paddingBottom: themeTokens.spacing[1] + 2 },
            body: {
              padding: themeTokens.spacing[1] + 2,
              backgroundColor: selected ? themeTokens.semantic.selectedLight : undefined,
            },
          }}
          actions={actions || []}
        >
          <div style={{ position: 'relative' }}>
            {cover}
            {expandedContent}
          </div>
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
    if (prevProps.onCoverDoubleClick !== nextProps.onCoverDoubleClick) return false;
    // Compare actions arrays properly
    if (!areActionsEqual(prevProps.actions, nextProps.actions)) return false;
    // Compare expandedContent by reference
    if (prevProps.expandedContent !== nextProps.expandedContent) return false;

    return true;
  },
);

ClimbCardStatic.displayName = 'ClimbCardStatic';

/**
 * ClimbCard component that displays a climb in a card format.
 *
 * Behavior:
 * - When `actions` or `expandedContent` props are provided, uses memoized static component
 * - When neither is provided and climb exists, generates actions dynamically (allows action state like playlist selector)
 * - When no climb, shows loading state
 */
function ClimbCard(props: ClimbCardProps) {
  const { climb, boardDetails, onCoverClick, onCoverDoubleClick, selected, actions, expandedContent } = props;

  // When actions or expandedContent are provided externally, use the memoized static version
  if (actions !== undefined || expandedContent !== undefined) {
    return (
      <ClimbCardStatic
        climb={climb}
        boardDetails={boardDetails}
        onCoverClick={onCoverClick}
        onCoverDoubleClick={onCoverDoubleClick}
        selected={selected}
        actions={actions}
        expandedContent={expandedContent}
      />
    );
  }

  // When no actions/expandedContent provided and we have a climb, generate actions dynamically
  // This path is not memoized because action components contain internal state
  if (climb) {
    return (
      <ClimbCardWithActions
        climb={climb}
        boardDetails={boardDetails}
        onCoverClick={onCoverClick}
        onCoverDoubleClick={onCoverDoubleClick}
        selected={selected}
      />
    );
  }

  // Loading state
  return (
    <ClimbCardStatic
      climb={climb}
      boardDetails={boardDetails}
      onCoverClick={onCoverClick}
      onCoverDoubleClick={onCoverDoubleClick}
      selected={selected}
      actions={[]}
    />
  );
}

export default ClimbCard;
