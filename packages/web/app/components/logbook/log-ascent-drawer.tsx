import Drawer from 'antd/es/drawer';
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
    <Drawer
      title="Log Ascent"
      placement="bottom"
      onClose={onClose}
      open={open}
      height="90%"
    >
      {currentClimb && (
        <LogAscentForm
          currentClimb={currentClimb}
          boardDetails={boardDetails}
          onClose={onClose}
        />
      )}
    </Drawer>
  );
};
