import Button from "antd/es/button";
import Drawer from "antd/es/drawer";
import React, { useState } from "react";
import { LogAscentForm } from "./logascent-form";
import { LogbookView } from "./logbook-view";
import { BoardDetails, Climb } from "@/app/lib/types";

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
  boardDetails
}) => {
  const [expanded, setExpanded] = useState(false);
  const [showLogbookView, setShowLogbookView] = useState(false);
  const [showLogAscentForm, setShowLogAscentForm] = useState(false);

  const handleClose = () => {
    setExpanded(false);
    setShowLogbookView(false);
    setShowLogAscentForm(false);
    closeDrawer();
  };

  return (
    <Drawer
      title={expanded 
        ? showLogbookView 
          ? 'Logbook' 
          : showLogAscentForm 
            ? 'Log Ascent' 
            : 'Log Options' 
        : 'Log Options'}
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
            onClick={() => {
              setShowLogbookView(true);
              setExpanded(true);
            }}
          >
            Logbook
          </Button>
          <Button 
            type="primary" 
            block 
            style={{ maxWidth: '400px', width: '100%' }} 
            onClick={() => {
              setShowLogAscentForm(true);
              setExpanded(true);
            }}
          >
            Log Ascent
          </Button>
          <Button
            type="primary"
            block
            style={{ maxWidth: '400px', width: '100%' }}
            onClick={() => console.log('Log Attempt clicked')}
          >
            Log Attempt
          </Button>
        </div>
      ) : (
        <>
          {/* TODO: Make sure these buttons never become visible 
          when there is no climb selected */}
          {showLogbookView && currentClimb && (
            <LogbookView currentClimb={currentClimb} />
          )}
          {showLogAscentForm && currentClimb && (
            <LogAscentForm
              currentClimb={currentClimb}
              boardDetails={boardDetails}
              onClose={handleClose}
            />
          )}
        </>
      )}
    </Drawer>
  );
};