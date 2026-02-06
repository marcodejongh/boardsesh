import SwipeableDrawer from '../swipeable-drawer/swipeable-drawer';
import React from 'react';
import { LogAscentForm } from './logascent-form';
import { BoardDetails, Climb } from '@/app/lib/types';

interface LogAscentDrawerProps {
  open: boolean;
  onClose: () => void;
  currentClimb: Climb | null;
  boardDetails: BoardDetails;
}

export const LogAscentDrawer: React.FC<LogAscentDrawerProps> = ({
  open,
  onClose,
  currentClimb,
  boardDetails,
}) => {
  return (
    <SwipeableDrawer
      title="Log Ascent"
      placement="bottom"
      onClose={onClose}
      open={open}
      styles={{ wrapper: { height: '100%' } }}
    >
      {currentClimb && (
        <LogAscentForm
          currentClimb={currentClimb}
          boardDetails={boardDetails}
          onClose={onClose}
        />
      )}
    </SwipeableDrawer>
  );
};
