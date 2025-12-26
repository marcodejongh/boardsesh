'use client';

import React from 'react';
import Card from 'antd/es/card';

import ClimbCardCover from './climb-card-cover';
import ClimbTitle from './climb-title';
import { Climb, BoardDetails } from '@/app/lib/types';
import ClimbCardActions from './climb-card-actions';
import { themeTokens } from '@/app/theme/theme-config';

type ClimbCardProps = {
  climb?: Climb;
  boardDetails: BoardDetails;
  coverLinkToClimb?: boolean;
  onCoverClick?: () => void;
  selected?: boolean;
  actions?: React.JSX.Element[];
};

const ClimbCard = React.memo(
  ({ climb, boardDetails, onCoverClick, selected, actions }: ClimbCardProps) => {
    const cover = <ClimbCardCover climb={climb} boardDetails={boardDetails} onClick={onCoverClick} />;

    const cardTitle = climb ? (
      <ClimbTitle climb={climb} layout="horizontal" showSetterInfo />
    ) : (
      'Loading...'
    );

    return (
      <Card
        title={cardTitle}
        size="small"
        style={{
          backgroundColor: selected ? themeTokens.semantic.selected : themeTokens.semantic.surface,
          borderColor: selected ? themeTokens.colors.primary : undefined,
        }}
        styles={{ header: { paddingTop: 8, paddingBottom: 6 }, body: { padding: 6 } }}
        actions={actions || ClimbCardActions({ climb, boardDetails })}
      >
        {cover}
      </Card>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.climb?.uuid === nextProps.climb?.uuid &&
      prevProps.selected === nextProps.selected &&
      prevProps.boardDetails === nextProps.boardDetails &&
      prevProps.onCoverClick === nextProps.onCoverClick &&
      prevProps.actions === nextProps.actions
    );
  },
);

ClimbCard.displayName = 'ClimbCard';

export default ClimbCard;
