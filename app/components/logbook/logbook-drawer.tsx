import Button from 'antd/es/button';
import Drawer from 'antd/es/drawer';
import React, { useState } from 'react';
import { LogAscentForm } from './logascent-form';
import { LogbookView } from './logbook-view';
import { LogBookStats } from './logbook-stats';
import { BoardDetails, Climb } from '@/app/lib/types';

interface LogbookDrawerProps {
  drawerVisible: boolean;
  closeDrawer: () => void;
  currentClimb: Climb | null;
  boardDetails: BoardDetails;
  boardName: string;
  userId: string;
}

export const LogbookDrawer: React.FC<LogbookDrawerProps> = ({
  drawerVisible,
  closeDrawer,
  currentClimb,
  boardDetails,
  boardName,
  userId,
}) => {
  // State to manage the drawer expansion and active view
  const [expanded, setExpanded] = useState(false);
  const [showLogbookView, setShowLogbookView] = useState(false);
  const [showLogAscentForm, setShowLogAscentForm] = useState(false);
  const [showLogBookStats, setShowLogBookStats] = useState(false);

  const handleClose = () => {
    setExpanded(false);
    setShowLogbookView(false);
    setShowLogAscentForm(false);
    setShowLogBookStats(false);
    closeDrawer();
  };

  const handleButtonClick = (view: 'logbook' | 'logAscent' | 'stats') => {
    setExpanded(true);

    if (view === 'logbook') {
      setShowLogbookView(true);
      setShowLogAscentForm(false);
      setShowLogBookStats(false);
    } else if (view === 'logAscent') {
      setShowLogAscentForm(true);
      setShowLogbookView(false);
      setShowLogBookStats(false);
    } else if (view === 'stats') {
      setShowLogBookStats(true);
      setShowLogbookView(false);
      setShowLogAscentForm(false);
    }
  };

  return (
    <Drawer
      title={
        expanded
          ? showLogbookView
            ? 'Logbook'
            : showLogBookStats
              ? 'Logbook Stats'
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
          <Button
            type="primary"
            block
            style={{ maxWidth: '400px', width: '100%' }}
            onClick={() => handleButtonClick('stats')}
          >
            Logbook Stats
          </Button>
        </div>
      ) : (
        <>
          {showLogbookView && currentClimb && <LogbookView currentClimb={currentClimb} />}
          {showLogAscentForm && currentClimb && (
            <LogAscentForm currentClimb={currentClimb} boardDetails={boardDetails} onClose={handleClose} />
          )}
          {showLogBookStats && <LogBookStats boardName={boardName} userId={userId} />}
        </>
      )}
    </Drawer>
  );
};
