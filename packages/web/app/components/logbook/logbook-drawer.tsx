import Button from 'antd/es/button';
import Drawer from 'antd/es/drawer';
import React, { useState } from 'react';
import { LogAscentForm } from './logascent-form';
import { LogbookView } from './logbook-view';
import { BoardDetails, Climb } from '@/app/lib/types';

interface LogbookDrawerProps {
  drawerVisible: boolean;
  closeDrawer: () => void;
  currentClimb: Climb | null;
  boardDetails: BoardDetails;
}

export const LogbookDrawer: React.FC<LogbookDrawerProps> = ({
  drawerVisible,
  closeDrawer,
  currentClimb,
  boardDetails,
}) => {
  // State to manage the drawer expansion and active view
  const [expanded, setExpanded] = useState(false);
  const [showLogbookView, setShowLogbookView] = useState(false);
  const [showLogAscentForm, setShowLogAscentForm] = useState(false);

  const handleClose = () => {
    setExpanded(false);
    setShowLogbookView(false);
    setShowLogAscentForm(false);
    closeDrawer();
  };

  const handleButtonClick = (view: 'logbook' | 'logAscent') => {
    setExpanded(true);

    if (view === 'logbook') {
      setShowLogbookView(true);
      setShowLogAscentForm(false);
    } else if (view === 'logAscent') {
      setShowLogAscentForm(true);
      setShowLogbookView(false);
    }
  };

  return (
    <Drawer
      title={
        expanded
          ? showLogbookView
            ? 'Logbook'
            : showLogAscentForm
              ? 'Log Ascent'
              : 'Log Options'
          : 'Log Options'
      }
      placement="bottom"
      onClose={handleClose}
      open={drawerVisible}
      height={expanded ? '90%' : '30%'}
    >
      {!expanded ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <Button
            type="primary"
            block
            style={{ maxWidth: '400px', width: '100%' }}
            onClick={() => handleButtonClick('logbook')}
          >
            Logbook
          </Button>
          <Button
            type="primary"
            block
            style={{ maxWidth: '400px', width: '100%' }}
            onClick={() => handleButtonClick('logAscent')}
          >
            Log Ascent
          </Button>
        </div>
      ) : (
        <>
          {showLogbookView && currentClimb && <LogbookView currentClimb={currentClimb} />}
          {showLogAscentForm && currentClimb && (
            <LogAscentForm currentClimb={currentClimb} boardDetails={boardDetails} onClose={handleClose} />
          )}
        </>
      )}
    </Drawer>
  );
};

