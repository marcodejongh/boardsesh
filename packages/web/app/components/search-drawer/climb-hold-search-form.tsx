import React from 'react';
import { BoardDetails, HoldState } from '@/app/lib/types';
import { useUISearchParams } from '@/app/components/queue-control/ui-searchparams-provider';
import { Select, Typography, Space, Tag } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import BoardHeatmap from '../board-renderer/board-heatmap';
import { track } from '@vercel/analytics';
import styles from './search-form.module.css';

const { Text } = Typography;

interface ClimbHoldSearchFormProps {
  boardDetails: BoardDetails;
}

const ClimbHoldSearchForm: React.FC<ClimbHoldSearchFormProps> = ({ boardDetails }) => {
  const { uiSearchParams, updateFilters } = useUISearchParams();
  const [selectedState, setSelectedState] = React.useState<HoldState>('ANY');

  const handleHoldClick = (holdId: number) => {
    const updatedHoldsFilter = { ...uiSearchParams.holdsFilter };
    const wasSelected = updatedHoldsFilter[holdId]?.state === selectedState;

    if (selectedState === 'ANY' || selectedState === 'NOT') {
      if (wasSelected) {
        delete updatedHoldsFilter[holdId];
      } else {
        updatedHoldsFilter[holdId] = {
          state: selectedState,
          color: selectedState === 'ANY' ? '#06B6D4' : '#EF4444',
          displayColor: selectedState === 'ANY' ? '#06B6D4' : '#EF4444',
        };
      }
    }

    updateFilters({
      holdsFilter: updatedHoldsFilter,
    });
  };

  const stateItems = [
    { value: 'ANY', label: 'Include', icon: <CheckCircleOutlined style={{ color: '#06B6D4' }} /> },
    { value: 'NOT', label: 'Exclude', icon: <CloseCircleOutlined style={{ color: '#EF4444' }} /> },
  ];

  const selectedHoldsCount = Object.keys(uiSearchParams.holdsFilter || {}).length;
  const anyHoldsCount = Object.values(uiSearchParams.holdsFilter || {}).filter(h => h.state === 'ANY').length;
  const notHoldsCount = Object.values(uiSearchParams.holdsFilter || {}).filter(h => h.state === 'NOT').length;

  return (
    <div className={styles.holdSearchForm}>
      <div className={styles.holdSearchHeaderCompact}>
        <Space size={8} wrap>
          <Text type="secondary">Tap to:</Text>
          <Select
            value={selectedState}
            onChange={(value) => {
              setSelectedState(value as HoldState);
              track('Search Hold State Changed', {
                hold_state: value,
                boardLayout: boardDetails.layout_name || '',
              });
            }}
            size="small"
            style={{ width: 110 }}
            options={stateItems.map(item => ({
              value: item.value,
              label: (
                <Space size={4}>
                  {item.icon}
                  {item.label}
                </Space>
              ),
            }))}
          />
          {anyHoldsCount > 0 && <Tag color="cyan" style={{ margin: 0 }}>{anyHoldsCount} in</Tag>}
          {notHoldsCount > 0 && <Tag color="red" style={{ margin: 0 }}>{notHoldsCount} out</Tag>}
        </Space>
      </div>

      <div className={styles.boardContainer}>
        <BoardHeatmap
          boardDetails={boardDetails}
          litUpHoldsMap={uiSearchParams.holdsFilter}
          onHoldClick={handleHoldClick}
        />
      </div>
    </div>
  );
};

export default ClimbHoldSearchForm;
