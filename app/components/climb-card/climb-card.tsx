'use client';

import React from 'react';
import Card from 'antd/es/card';
import { Tag } from 'antd';
import { CopyrightOutlined } from '@ant-design/icons';

import ClimbCardCover from './climb-card-cover';
import { Climb, BoardDetails } from '@/app/lib/types';
import ClimbCardActions from './climb-card-actions';
import { useClimbCircuits } from '@/app/hooks/use-climb-circuits';
import { useBoardProvider } from '@/app/components/board-provider/board-provider-context';
import { useUISearchParams } from '@/app/components/queue-control/ui-searchparams-provider';

type ClimbCardProps = {
  climb?: Climb;
  boardDetails: BoardDetails;
  coverLinkToClimb?: boolean;
  onCoverClick?: () => void;
  selected?: boolean;
  actions?: React.JSX.Element[];
};

const ClimbCard = ({ climb, boardDetails, onCoverClick, selected, actions }: ClimbCardProps) => {
  const { boardName, isAuthenticated } = useBoardProvider();
  const { updateFilters } = useUISearchParams();
  const { circuits } = useClimbCircuits(boardName, climb?.uuid || null, Boolean(isAuthenticated && climb?.uuid));
  
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
        {climb.difficulty && climb.quality_average && climb.quality_average !== '0' ? (
          `${climb.difficulty} ★${climb.quality_average}`
        ) : (
          <span style={{ fontWeight: 400, fontStyle: 'italic' }}>project</span>
        )}
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
      {climb && (
        <div>
          <div style={{ marginBottom: circuits.length > 0 ? '8px' : '0' }}>
            By {climb.setter_username} - {climb.ascensionist_count} ascents
          </div>
          {circuits.length > 0 && (
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {circuits.map((circuit) => (
                <Tag
                  key={circuit.uuid}
                  color={circuit.color || undefined}
                  style={{ 
                    cursor: 'pointer',
                    fontSize: '11px',
                    padding: '2px 6px',
                    margin: '0',
                    borderRadius: '4px'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    updateFilters({ circuitUuids: [circuit.uuid] });
                  }}
                  title={`Filter by circuit: ${circuit.name}`}
                >
                  {circuit.name || 'Unnamed Circuit'}
                </Tag>
              ))}
            </div>
          )}
        </div>
      )}
      {cover}
    </Card>
  );
};

export default ClimbCard;
