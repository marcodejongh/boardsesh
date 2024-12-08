import React from 'react';

import { Angle, Climb } from '@/app/lib/types';
import { useBoardProvider } from '../board-provider/board-provider-context';
import Button from 'antd/es/button';
import Badge from 'antd/es/badge';
import { CheckOutlined } from '@ant-design/icons';

export const TickButton = ({ currentClimb, angle }: { angle: Angle; currentClimb: Climb | null }) => {
  const { logbook } = useBoardProvider();
  return (
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
      <Button id="button-tick" type="default" icon={<CheckOutlined />} />
    </Badge>
  );
};
