import React from 'react';
import { BoardDetails, HoldState } from '@/app/lib/types';
import { useUISearchParams } from '@/app/components/queue-control/ui-searchparams-provider';
import { Select, Typography, Space, Tag } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, CaretRightOutlined, AimOutlined, VerticalAlignBottomOutlined, FlagOutlined } from '@ant-design/icons';
import BoardHeatmap from '../board-renderer/board-heatmap';
import { HOLD_STATE_MAP } from '../board-renderer/types';
import { track } from '@vercel/analytics';
import { themeTokens } from '@/app/theme/theme-config';
import styles from './search-form.module.css';

const { Text } = Typography;

// Color configuration for each hold state filter
// UI-only states (ANY/NOT) use theme tokens, board hold states use HOLD_STATE_MAP colors
const HOLD_STATE_COLORS: Record<string, { color: string; label: string; tagColor: string }> = {
  ANY: { color: themeTokens.colors.primary, label: 'Include', tagColor: 'cyan' },
  NOT: { color: themeTokens.colors.error, label: 'Exclude', tagColor: 'red' },
  // Board hold states - use standard kilter colors for consistency
  STARTING: { color: HOLD_STATE_MAP.kilter[12].color, label: 'Starting', tagColor: 'green' },
  HAND: { color: HOLD_STATE_MAP.kilter[13].color, label: 'Hand', tagColor: 'cyan' },
  FOOT: { color: HOLD_STATE_MAP.kilter[15].color, label: 'Foot', tagColor: 'orange' },
  FINISH: { color: HOLD_STATE_MAP.kilter[14].color, label: 'Finish', tagColor: 'magenta' },
};

interface ClimbHoldSearchFormProps {
  boardDetails: BoardDetails;
}

const ClimbHoldSearchForm: React.FC<ClimbHoldSearchFormProps> = ({ boardDetails }) => {
  const { uiSearchParams, updateFilters } = useUISearchParams();
  const [selectedState, setSelectedState] = React.useState<HoldState>('ANY');

  const handleHoldClick = (holdId: number) => {
    const updatedHoldsFilter = { ...uiSearchParams.holdsFilter };
    const wasSelected = updatedHoldsFilter[holdId]?.state === selectedState;

    if (wasSelected) {
      delete updatedHoldsFilter[holdId];
    } else {
      const stateConfig = HOLD_STATE_COLORS[selectedState];
      updatedHoldsFilter[holdId] = {
        state: selectedState,
        color: stateConfig.color,
        displayColor: stateConfig.color,
      };
    }

    updateFilters({
      holdsFilter: updatedHoldsFilter,
    });
  };

  const stateItems = [
    { value: 'ANY', label: 'Include', icon: <CheckCircleOutlined style={{ color: HOLD_STATE_COLORS.ANY.color }} /> },
    { value: 'NOT', label: 'Exclude', icon: <CloseCircleOutlined style={{ color: HOLD_STATE_COLORS.NOT.color }} /> },
    { value: 'STARTING', label: 'Starting', icon: <CaretRightOutlined style={{ color: HOLD_STATE_COLORS.STARTING.color }} /> },
    { value: 'HAND', label: 'Hand', icon: <AimOutlined style={{ color: HOLD_STATE_COLORS.HAND.color }} /> },
    { value: 'FOOT', label: 'Foot', icon: <VerticalAlignBottomOutlined style={{ color: HOLD_STATE_COLORS.FOOT.color }} /> },
    { value: 'FINISH', label: 'Finish', icon: <FlagOutlined style={{ color: HOLD_STATE_COLORS.FINISH.color }} /> },
  ];

  // Count holds by state for display
  const holdStateCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    Object.values(uiSearchParams.holdsFilter || {}).forEach(h => {
      counts[h.state] = (counts[h.state] || 0) + 1;
    });
    return counts;
  }, [uiSearchParams.holdsFilter]);

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
            style={{ width: 120 }}
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
          {Object.entries(holdStateCounts).map(([state, count]) => {
            const config = HOLD_STATE_COLORS[state];
            if (!config) return null;
            const shortLabel = state === 'ANY' ? 'in' : state === 'NOT' ? 'out' : state.toLowerCase();
            return (
              <Tag key={state} color={config.tagColor} style={{ margin: 0 }}>
                {count} {shortLabel}
              </Tag>
            );
          })}
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
