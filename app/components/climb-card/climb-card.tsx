import React from 'react';
import Card from 'antd/es/card';
import { CopyrightOutlined } from '@ant-design/icons';

import ClimbCardCover from './climb-card-cover';
import { Climb, BoardDetails } from '@/app/lib/types';
import ClimbCardActions from './climb-card-actions';

type ClimbCardProps = {
  climb?: Climb;
  boardDetails: BoardDetails;
  coverLinkToClimb?: boolean;
  onCoverClick?: () => void;
  selected?: boolean;
  actions?: React.JSX.Element[];
};

const ClimbCard = ({ climb, boardDetails, onCoverClick, selected, actions }: ClimbCardProps) => {
  const cover = <ClimbCardCover climb={climb} boardDetails={boardDetails} onClick={onCoverClick} />;
  
  const cardTitle = climb ? (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      {/* LEFT: Name, Angle, Benchmark */}
      <div>
        {climb.name} @ {climb.angle}°
        {climb.benchmark_difficulty !== null && <CopyrightOutlined style={{ marginLeft: 4 }} />}
      </div>

      {/* RIGHT: Difficulty, Quality */}
      <div>
        {climb.difficulty} ★{climb.quality_average}
      </div>
    </div>
  ) : (
    'Loading...'
  );

  return (
    <Card
      title={cardTitle}
      size="small"
      style={{ backgroundColor: selected ? '#eeffff' : '#FFF' }}
      actions={actions || ClimbCardActions({ climb, boardDetails })}
    >
      {/* TODO: Make a link to the list with the setter_name filter  */}
      {climb ? `By ${climb.setter_username} - ${climb.ascensionist_count} ascents` : null}
      {cover}
    </Card>
  );
};

export default ClimbCard;
