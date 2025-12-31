import React from 'react';
import { BoardDetails, BoardName, HoldState } from '@/app/lib/types';
import { useUISearchParams } from '@/app/components/queue-control/ui-searchparams-provider';
import { Select, Typography, Space, Tag } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, CaretRightOutlined, AimOutlined, VerticalAlignBottomOutlined, FlagOutlined } from '@ant-design/icons';
import BoardHeatmap from '../board-renderer/board-heatmap';
import { HOLD_STATE_MAP } from '../board-renderer/types';
import { track } from '@vercel/analytics';
import { themeTokens } from '@/app/theme/theme-config';
import styles from './search-form.module.css';

const { Text } = Typography;

// Hold code mappings per board for each state
// These codes correspond to entries in HOLD_STATE_MAP
const HOLD_STATE_CODES: Record<BoardName, Record<string, number>> = {
  kilter: { STARTING: 12, HAND: 13, FOOT: 15, FINISH: 14 },
  tension: { STARTING: 1, HAND: 2, FOOT: 4, FINISH: 3 },
};

// Get hold state colors based on the current board
const getHoldStateColors = (boardName: BoardName) => {
  const codes = HOLD_STATE_CODES[boardName];
  const boardMap = HOLD_STATE_MAP[boardName];

  return {
    ANY: { color: themeTokens.colors.primary, label: 'Include', tagColor: 'cyan' },
    NOT: { color: themeTokens.colors.error, label: 'Exclude', tagColor: 'red' },
    STARTING: { color: boardMap[codes.STARTING].color, label: 'Starting', tagColor: 'green' },
    HAND: { color: boardMap[codes.HAND].color, label: 'Hand', tagColor: 'cyan' },
    FOOT: { color: boardMap[codes.FOOT].color, label: 'Foot', tagColor: 'orange' },
    FINISH: { color: boardMap[codes.FINISH].color, label: 'Finish', tagColor: 'magenta' },
  };
};

interface ClimbHoldSearchFormProps {
  boardDetails: BoardDetails;
}

const ClimbHoldSearchForm: React.FC<ClimbHoldSearchFormProps> = ({ boardDetails }) => {
  const { uiSearchParams, updateFilters } = useUISearchParams();
  const [selectedState, setSelectedState] = React.useState<HoldState>('ANY');

  // Get board-specific colors
  const holdStateColors = React.useMemo(
    () => getHoldStateColors(boardDetails.board_name),
    [boardDetails.board_name]
  );

  const handleHoldClick = (holdId: number) => {
    const updatedHoldsFilter = { ...uiSearchParams.holdsFilter };
    const wasSelected = updatedHoldsFilter[holdId]?.state === selectedState;

    if (wasSelected) {
      delete updatedHoldsFilter[holdId];
    } else {
      const stateConfig = holdStateColors[selectedState];
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
    { value: 'ANY', label: 'Include', icon: <CheckCircleOutlined style={{ color: holdStateColors.ANY.color }} /> },
    { value: 'NOT', label: 'Exclude', icon: <CloseCircleOutlined style={{ color: holdStateColors.NOT.color }} /> },
    { value: 'STARTING', label: 'Starting', icon: <CaretRightOutlined style={{ color: holdStateColors.STARTING.color }} /> },
    { value: 'HAND', label: 'Hand', icon: <AimOutlined style={{ color: holdStateColors.HAND.color }} /> },
    { value: 'FOOT', label: 'Foot', icon: <VerticalAlignBottomOutlined style={{ color: holdStateColors.FOOT.color }} /> },
    { value: 'FINISH', label: 'Finish', icon: <FlagOutlined style={{ color: holdStateColors.FINISH.color }} /> },
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
            const config = holdStateColors[state as keyof typeof holdStateColors];
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
