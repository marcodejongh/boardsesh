import React, { useState } from 'react';
import { Angle, Climb, BoardName, BoardDetails } from '@/app/lib/types';
import { useBoardProvider } from '../board-provider/board-provider-context';
import { Button, Badge, Drawer, DatePicker, Select, Input, Rate, InputNumber } from 'antd';
import { CheckOutlined } from '@ant-design/icons';
import { TENSION_KILTER_GRADES, ANGLES } from '@/app/lib/board-data';
import { useSearchParams } from 'next/navigation';

const { TextArea } = Input;

export const TickButton = ({
  currentClimb,
  angle,
  boardDetails,
}: {
  angle: Angle;
  currentClimb: Climb | null;
  boardDetails: BoardDetails;
}) => {
  const { logbook } = useBoardProvider();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const showDrawer = () => setDrawerVisible(true);
  const { user } = useBoardProvider();

  const closeDrawer = () => {
    setDrawerVisible(false);
    setExpanded(false); // Reset drawer to initial state
  };

  const handleLogAscentClick = () => setExpanded(true);

  // Use the predefined TENSION_KILTER_GRADES
  const grades = TENSION_KILTER_GRADES;

  // Dynamically retrieve angles based on the boardName
  const angleOptions = ANGLES[boardDetails.board_name];

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
      <Drawer
        title={expanded ? 'Log Ascent' : 'Log Options'}
        placement="bottom"
        onClose={closeDrawer}
        open={drawerVisible}
        height={expanded ? '70%' : '40%'} // Adjust drawer height dynamically
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
              onClick={() => console.log('Logbook clicked')}
            >
              Logbook
            </Button>
            <Button
              type="primary"
              block
              style={{ maxWidth: '400px', width: '100%' }}
              onClick={handleLogAscentClick}
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <strong>Boulder:</strong> {currentClimb?.name || 'N/A'}
            </div>
            <div>
              <strong>User:</strong> {user?.username}
            </div>
            <DatePicker
              showTime
              placeholder="Select Date and Time"
              style={{ width: '100%' }}
            />
            <Select
              placeholder="Select Angle"
              options={angleOptions.map((angle) => ({
                label: `${angle}°`,
                value: angle,
              }))}
              defaultValue={currentClimb?.angle}
              style={{ width: '100%' }}
            />
            <InputNumber
              placeholder="Attempts"
              defaultValue="1"
              type="number"
              style={{ width: '100%' }}
            />
            <div>
              <strong>Quality:</strong>
              <Rate allowClear={false} count={3} defaultValue={3}  style={{ marginLeft: '10px' }} />
            </div>
            <Select
              placeholder="Select Difficulty"
              options={grades.map((grade) => ({
                label: grade.difficulty_name,
                value: grade.difficulty_id,
              }))}
              style={{ width: '100%' }}
            />
            <TextArea
              placeholder="Notes"
              rows={3}
              style={{ width: '100%' }}
            />
            <Button type="primary" block style={{ marginTop: '10px' }}>
              Submit
            </Button>
          </div>
        )}
      </Drawer>
    </>
  );
};
