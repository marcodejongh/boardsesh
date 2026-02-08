'use client';

import React from 'react';
import { BoardDetails, HoldState } from '@/app/lib/types';
import { useUISearchParams } from '@/app/components/queue-control/ui-searchparams-provider';
import MuiSelect from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import MuiTypography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';
import CancelOutlined from '@mui/icons-material/CancelOutlined';
import BoardHeatmap from '../board-renderer/board-heatmap';
import { track } from '@vercel/analytics';
import { themeTokens } from '@/app/theme/theme-config';
import styles from './search-form.module.css';


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
          color: selectedState === 'ANY' ? themeTokens.colors.primary : themeTokens.colors.error,
          displayColor: selectedState === 'ANY' ? themeTokens.colors.primary : themeTokens.colors.error,
        };
      }
    }

    updateFilters({
      holdsFilter: updatedHoldsFilter,
    });
  };

  const stateItems = [
    { value: 'ANY', label: 'Include', icon: <CheckCircleOutlined style={{ color: themeTokens.colors.primary }} /> },
    { value: 'NOT', label: 'Exclude', icon: <CancelOutlined style={{ color: themeTokens.colors.error }} /> },
  ];

  const selectedHoldsCount = Object.keys(uiSearchParams.holdsFilter || {}).length;
  const anyHoldsCount = Object.values(uiSearchParams.holdsFilter || {}).filter(h => h.state === 'ANY').length;
  const notHoldsCount = Object.values(uiSearchParams.holdsFilter || {}).filter(h => h.state === 'NOT').length;

  return (
    <div className={styles.holdSearchForm}>
      <div className={styles.holdSearchHeaderCompact}>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
          <MuiTypography variant="body2" component="span" color="text.secondary">Tap to:</MuiTypography>
          <MuiSelect
            value={selectedState}
            onChange={(e) => {
              const value = e.target.value as HoldState;
              setSelectedState(value);
              track('Search Hold State Changed', {
                hold_state: value,
                boardLayout: boardDetails.layout_name || '',
              });
            }}
            size="small"
            sx={{ width: 110 }}
          >
            {stateItems.map(item => (
              <MenuItem key={item.value} value={item.value}>
                <Stack direction="row" spacing={0.5}>
                  {item.icon}
                  {item.label}
                </Stack>
              </MenuItem>
            ))}
          </MuiSelect>
          {anyHoldsCount > 0 && <Chip label={`${anyHoldsCount} in`} size="small" sx={{ bgcolor: themeTokens.colors.primary, color: 'common.white', margin: 0 }} />}
          {notHoldsCount > 0 && <Chip label={`${notHoldsCount} out`} size="small" sx={{ bgcolor: themeTokens.colors.error, color: 'common.white', margin: 0 }} />}
        </Stack>
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
