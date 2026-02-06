'use client';

import React from 'react';
import { Climb, BoardDetails } from '@/app/lib/types';
import styles from './climb-view-actions.module.css';
import { constructClimbListWithSlugs } from '@/app/lib/url-utils';
import BackButton from '../back-button';
import { ClimbActions } from '../climb-actions';

type ClimbViewActionsProps = {
  climb: Climb;
  boardDetails: BoardDetails;
  auroraAppUrl?: string;
  angle: number;
};

const ClimbViewActions = ({ climb, boardDetails, auroraAppUrl, angle }: ClimbViewActionsProps) => {
  const isMoonBoard = boardDetails.board_name === 'moonboard';

  const getBackToListUrl = () => {
    const { board_name, layout_name, size_name, size_description, set_names } = boardDetails;

    // Use slug-based URL construction if slug names are available
    if (layout_name && size_name && set_names) {
      return constructClimbListWithSlugs(board_name, layout_name, size_name, size_description, set_names, angle);
    }

    // Fallback to numeric format
    return `/${board_name}/${boardDetails.layout_id}/${boardDetails.size_id}/${boardDetails.set_ids.join(',')}/${angle}/list`;
  };

  // MoonBoard doesn't have an Aurora app, so exclude 'openInApp'
  const mobileDropdownActions: ('tick' | 'share' | 'addToList' | 'openInApp')[] = isMoonBoard
    ? ['tick', 'share', 'addToList']
    : ['tick', 'share', 'addToList', 'openInApp'];

  const desktopActions: ('favorite' | 'tick' | 'queue' | 'share' | 'addToList' | 'openInApp')[] = isMoonBoard
    ? ['favorite', 'tick', 'queue', 'share', 'addToList']
    : ['favorite', 'tick', 'queue', 'share', 'addToList', 'openInApp'];

  return (
    <div className={styles.container}>
      {/* Mobile view: Show back button + key actions + overflow menu */}
      <div className={styles.mobileActions}>
        <div className={styles.mobileLeft}>
          <BackButton fallbackUrl={getBackToListUrl()} />
        </div>

        <div className={styles.mobileRight}>
          <ClimbActions
            climb={climb}
            boardDetails={boardDetails}
            angle={angle}
            viewMode="button"
            include={['favorite', 'queue']}
            size="default"
            auroraAppUrl={auroraAppUrl}
          />
          <ClimbActions
            climb={climb}
            boardDetails={boardDetails}
            angle={angle}
            viewMode="dropdown"
            include={mobileDropdownActions}
            auroraAppUrl={auroraAppUrl}
          />
        </div>
      </div>

      {/* Desktop view: Show all buttons */}
      <div className={styles.desktopActions}>
        <BackButton fallbackUrl={getBackToListUrl()} className={styles.backButton} />

        <div className={styles.actionButtons}>
          <ClimbActions
            climb={climb}
            boardDetails={boardDetails}
            angle={angle}
            viewMode="button"
            include={desktopActions}
            auroraAppUrl={auroraAppUrl}
          />
        </div>
      </div>
    </div>
  );
};

export default ClimbViewActions;
