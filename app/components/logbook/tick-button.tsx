import React, { useState } from 'react';
import { Angle, Climb, BoardDetails } from '@/app/lib/types';
import { useBoardProvider } from '../board-provider/board-provider-context';
import { Button, Badge } from 'antd';
import { CheckOutlined } from '@ant-design/icons';
import { LogbookDrawer } from './logbook-drawer';


interface TickButtonProps {
  angle: Angle;
  currentClimb: Climb | null;
  boardDetails: BoardDetails;
}

export const TickButton: React.FC<TickButtonProps> = ({
  currentClimb,
  angle,
  boardDetails,
}) => {
  const { logbook } = useBoardProvider();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const showDrawer = () => setDrawerVisible(true);

  const closeDrawer = () => {
    setDrawerVisible(false);
    setExpanded(false); // Reset drawer to initial state
  };

  const handleLogAscentClick = () => setExpanded(true);

  return (
    <>
      <Badge
        count={
          logbook.length > 0
            ? logbook.filter((asc) => asc.climb_uuid === currentClimb?.uuid && Number(asc.angle) === angle).length
            : 0
        }
        overflowCount={100}
        showZero={false}
        color="cyan"
      >
        <Button id="button-tick" type="default" icon={<CheckOutlined />} onClick={showDrawer} />
      </Badge>
      
      <LogbookDrawer
        drawerVisible={drawerVisible}
        closeDrawer={closeDrawer}
        expanded={expanded}
        handleLogAscentClick={handleLogAscentClick}
        currentClimb={currentClimb}
        boardDetails={boardDetails}
      />
    </>
  );
};