import React from 'react';
import { BoardDetails, HoldState } from '@/app/lib/types';
import { useUISearchParams } from '@/app/components/queue-control/ui-searchparams-provider';
import { Select, Button, Typography, Space, Tag } from 'antd';
import { AimOutlined, ClearOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
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
    { value: 'ANY', label: 'Must Include', icon: <CheckCircleOutlined style={{ color: '#06B6D4' }} /> },
    { value: 'NOT', label: 'Must Exclude', icon: <CloseCircleOutlined style={{ color: '#EF4444' }} /> },
  ];

  const selectedHoldsCount = Object.keys(uiSearchParams.holdsFilter || {}).length;
  const anyHoldsCount = Object.values(uiSearchParams.holdsFilter || {}).filter(h => h.state === 'ANY').length;
  const notHoldsCount = Object.values(uiSearchParams.holdsFilter || {}).filter(h => h.state === 'NOT').length;

  return (
    <div className={styles.holdSearchForm}>
      <div className={styles.holdSearchHeader}>
        <div className={styles.holdTypeSelector}>
          <Space>
            <AimOutlined className={styles.labelIcon} />
            <Text strong>Hold Filter</Text>
          </Space>
          <Select
            value={selectedState}
            onChange={(value) => {
              setSelectedState(value as HoldState);
              track('Search Hold State Changed', {
                hold_state: value,
                boardLayout: boardDetails.layout_name || '',
              });
            }}
            style={{ width: 160 }}
            options={stateItems.map(item => ({
              value: item.value,
              label: (
                <Space>
                  {item.icon}
                  {item.label}
                </Space>
              ),
            }))}
          />
        </div>
        <Text type="secondary" className={styles.holdSearchHint}>
          Tap holds on the board to {selectedState === 'ANY' ? 'include them in results' : 'exclude them from results'}
        </Text>
        {selectedHoldsCount > 0 && (
          <Space size={4}>
            {anyHoldsCount > 0 && (
              <Tag color="cyan">{anyHoldsCount} included</Tag>
            )}
            {notHoldsCount > 0 && (
              <Tag color="red">{notHoldsCount} excluded</Tag>
            )}
          </Space>
        )}
      </div>

      <div className={styles.boardContainer}>
        <BoardHeatmap
          boardDetails={boardDetails}
          litUpHoldsMap={uiSearchParams.holdsFilter}
          onHoldClick={handleHoldClick}
        />
      </div>

      {selectedHoldsCount > 0 && (
        <Button
          icon={<ClearOutlined />}
          danger
          block
          className={styles.clearHoldsButton}
          onClick={() => {
            updateFilters({ holdsFilter: {} });
            track('Clear Search Holds', {
              holds_cleared: selectedHoldsCount,
              boardLayout: boardDetails.layout_name || '',
            });
          }}
        >
          Clear All Holds ({selectedHoldsCount})
        </Button>
      )}
    </div>
  );
};

export default ClimbHoldSearchForm;
