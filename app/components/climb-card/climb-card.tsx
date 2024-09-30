import React from 'react';
import Card from 'antd/es/card';

import ClimbCardCover from './climb-card-cover';
import { BoulderProblem, BoardDetails } from '@/app/lib/types';
import ClimbCardActions from './climb-card-actions';

type ClimbCardProps = {
  climb: BoulderProblem;
  boardDetails: BoardDetails;
  coverLinkToClimb?: boolean;
  onCoverClick?: () => void;
  selected?: boolean;
  actions?: React.JSX.Element[];
};

const ClimbCard = ({ climb, boardDetails, onCoverClick, selected, actions }: ClimbCardProps) => {
  const cover = <ClimbCardCover climb={climb} boardDetails={boardDetails} onClick={onCoverClick} />;
  return (
    <Card
      title={`${climb.name} ${climb.difficulty} ★${climb.quality_average}`}
      size="small"
      style={{ backgroundColor: selected ? '#eeffff' : '#FFF' }}
      actions={actions || ClimbCardActions({ climb })}
    >
      {/* // @ ${climb.angle}° - ${climb.ascensionist_count} ascents, */}
      {cover}
    </Card>
  );
};
export default ClimbCard;
