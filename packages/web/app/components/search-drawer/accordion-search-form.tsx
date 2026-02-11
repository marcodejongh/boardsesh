'use client';

import React, { useState } from 'react';
import MuiAlert from '@mui/material/Alert';
import MuiTooltip from '@mui/material/Tooltip';
import MuiTypography from '@mui/material/Typography';
import MuiButton from '@mui/material/Button';
import MuiSelect, { SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import MuiSwitch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import LoginOutlined from '@mui/icons-material/LoginOutlined';
import ArrowUpwardOutlined from '@mui/icons-material/ArrowUpwardOutlined';
import { TENSION_KILTER_GRADES } from '@/app/lib/board-data';
import { getGradeTintColor } from '@/app/lib/grade-colors';
import { useColorMode } from '@/app/hooks/use-color-mode';
import { useUISearchParams } from '@/app/components/queue-control/ui-searchparams-provider';
import { useBoardProvider } from '@/app/components/board-provider/board-provider-context';
import SearchClimbNameInput from './search-climb-name-input';
import SetterNameSelect from './setter-name-select';
import ClimbHoldSearchForm from './climb-hold-search-form';
import { BoardDetails } from '@/app/lib/types';
import AuthModal from '@/app/components/auth/auth-modal';
import {
  getClimbPanelSummary,
  getQualityPanelSummary,
  getProgressPanelSummary,
  getHoldsPanelSummary,
} from './search-summary-utils';
import CollapsibleSection from '@/app/components/collapsible-section/collapsible-section';
import type { CollapsibleSectionConfig } from '@/app/components/collapsible-section/collapsible-section';
import styles from './accordion-search-form.module.css';


import { KILTER_HOMEWALL_LAYOUT_ID } from '@/app/lib/board-constants';

interface AccordionSearchFormProps {
  boardDetails: BoardDetails;
  defaultActiveKey?: string[];
}

const AccordionSearchForm: React.FC<AccordionSearchFormProps> = ({
  boardDetails,
  defaultActiveKey = ['climb'],
}) => {
  const { mode } = useColorMode();
  const isDark = mode === 'dark';
  const { uiSearchParams, updateFilters } = useUISearchParams();
  const { isAuthenticated } = useBoardProvider();
  const grades = TENSION_KILTER_GRADES;
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSort, setShowSort] = useState(false);

  const isKilterHomewall = boardDetails.board_name === 'kilter' && boardDetails.layout_id === KILTER_HOMEWALL_LAYOUT_ID;
  const isLargestSize = boardDetails.size_name?.toLowerCase().includes('12');
  const showTallClimbsFilter = isKilterHomewall && isLargestSize;

  const handleGradeChange = (type: 'min' | 'max', value: number | undefined) => {
    if (type === 'min') {
      updateFilters({ minGrade: value });
    } else {
      updateFilters({ maxGrade: value });
    }
  };

  const getGradeSelectBackground = (difficultyId: number | undefined): string | undefined => {
    if (!difficultyId || difficultyId === 0) return undefined;
    const grade = grades.find(g => g.difficulty_id === difficultyId);
    if (!grade) return undefined;
    return getGradeTintColor(grade.difficulty_name, 'light', isDark);
  };

  const minGradeBg = getGradeSelectBackground(uiSearchParams.minGrade);
  const maxGradeBg = getGradeSelectBackground(uiSearchParams.maxGrade);

  const sections: CollapsibleSectionConfig[] = [
    {
      key: 'climb',
      label: 'Climb',
      title: 'Climb',
      defaultSummary: 'All climbs',
      getSummary: () => getClimbPanelSummary(uiSearchParams),
      content: (
        <div className={styles.panelContent}>
          <div className={styles.inputGroup}>
            <span className={styles.fieldLabel}>Climb Name</span>
            <SearchClimbNameInput />
          </div>

          <div className={styles.inputGroup}>
            <span className={styles.fieldLabel}>Grade Range</span>
            <div className={styles.gradeRow}>
              <MuiSelect
                value={uiSearchParams.minGrade || 0}
                onChange={(e: SelectChangeEvent<number>) => handleGradeChange('min', e.target.value as number || undefined)}
                className={`${styles.fullWidth} ${minGradeBg ? styles.gradeSelectColored : ''}`}
                sx={minGradeBg ? { '--grade-bg': minGradeBg } as React.CSSProperties : undefined}
                size="small"
                displayEmpty
              >
                <MenuItem value={0}>Min</MenuItem>
                {grades.map((grade) => (
                  <MenuItem key={grade.difficulty_id} value={grade.difficulty_id}>
                    {grade.difficulty_name}
                  </MenuItem>
                ))}
              </MuiSelect>
              <MuiSelect
                value={uiSearchParams.maxGrade || 0}
                onChange={(e: SelectChangeEvent<number>) => handleGradeChange('max', e.target.value as number || undefined)}
                className={`${styles.fullWidth} ${maxGradeBg ? styles.gradeSelectColored : ''}`}
                sx={maxGradeBg ? { '--grade-bg': maxGradeBg } as React.CSSProperties : undefined}
                size="small"
                displayEmpty
              >
                <MenuItem value={0}>Max</MenuItem>
                {grades.map((grade) => (
                  <MenuItem key={grade.difficulty_id} value={grade.difficulty_id}>
                    {grade.difficulty_name}
                  </MenuItem>
                ))}
              </MuiSelect>
            </div>
          </div>

          {showTallClimbsFilter && (
            <div className={styles.switchGroup}>
              <div className={styles.switchRow}>
                <MuiTooltip title="Show only climbs that use holds in the bottom 8 rows (only available on 10x12 boards)">
                  <MuiTypography variant="body2" component="span">Tall Climbs Only</MuiTypography>
                </MuiTooltip>
                <MuiSwitch
                  size="small"
                  color="primary"
                  checked={uiSearchParams.onlyTallClimbs}
                  onChange={(_, checked) => updateFilters({ onlyTallClimbs: checked })}
                />
              </div>
            </div>
          )}

          <div className={styles.inputGroup}>
            <span className={styles.fieldLabel}>Setter</span>
            <SetterNameSelect />
          </div>

          <MuiButton
            variant="text"
            size="small"
            startIcon={<ArrowUpwardOutlined />}
            className={styles.sortToggle}
            onClick={() => setShowSort(!showSort)}
          >
            Sort
          </MuiButton>

          {showSort && (
            <div className={styles.inputGroup}>
              <div className={styles.sortRow}>
                <MuiSelect
                  value={uiSearchParams.sortBy}
                  onChange={(e) => updateFilters({ sortBy: e.target.value as typeof uiSearchParams.sortBy })}
                  className={styles.fullWidth}
                  size="small"
                >
                  <MenuItem value="ascents">Ascents</MenuItem>
                  <MenuItem value="popular">Popular</MenuItem>
                  <MenuItem value="difficulty">Difficulty</MenuItem>
                  <MenuItem value="name">Name</MenuItem>
                  <MenuItem value="quality">Quality</MenuItem>
                </MuiSelect>
                <MuiSelect
                  value={uiSearchParams.sortOrder}
                  onChange={(e) => updateFilters({ sortOrder: e.target.value as typeof uiSearchParams.sortOrder })}
                  className={styles.fullWidth}
                  size="small"
                >
                  <MenuItem value="desc">Desc</MenuItem>
                  <MenuItem value="asc">Asc</MenuItem>
                </MuiSelect>
              </div>
            </div>
          )}

        </div>
      ),
    },
    {
      key: 'quality',
      label: 'Quality',
      title: 'Quality',
      defaultSummary: 'Any',
      getSummary: () => getQualityPanelSummary(uiSearchParams),
      content: (
        <div className={styles.panelContent}>
          <div className={styles.qualityRow}>
            <div className={styles.compactInputGroup}>
              <span className={styles.fieldLabel}>Min Ascents</span>
              <TextField
                type="number"
                slotProps={{ htmlInput: { min: 1 } }}
                value={uiSearchParams.minAscents ?? ''}
                onChange={(e) => updateFilters({ minAscents: Number(e.target.value) || undefined })}
                className={styles.fullWidth}
                placeholder="Any"
                size="small"
              />
            </div>
            <div className={styles.compactInputGroup}>
              <span className={styles.fieldLabel}>Min Rating</span>
              <TextField
                type="number"
                slotProps={{ htmlInput: { min: 1.0, max: 3.0, step: 0.1 } }}
                value={uiSearchParams.minRating ?? ''}
                onChange={(e) => updateFilters({ minRating: Number(e.target.value) || undefined })}
                className={styles.fullWidth}
                placeholder="Any"
                size="small"
              />
            </div>
          </div>

          <div className={styles.inputGroup}>
            <span className={styles.fieldLabel}>Grade Accuracy</span>
            <MuiSelect
              value={uiSearchParams.gradeAccuracy ?? 0}
              onChange={(e) => updateFilters({ gradeAccuracy: (e.target.value as number) || undefined })}
              className={styles.fullWidth}
              size="small"
            >
              <MenuItem value={0}>Any</MenuItem>
              <MenuItem value={0.2}>Somewhat Accurate (&lt;0.2)</MenuItem>
              <MenuItem value={0.1}>Very Accurate (&lt;0.1)</MenuItem>
              <MenuItem value={0.05}>Extremely Accurate (&lt;0.05)</MenuItem>
            </MuiSelect>
          </div>

          <div className={styles.switchGroup}>
            <div className={styles.switchRow}>
              <MuiTypography variant="body2" component="span">Classics Only</MuiTypography>
              <MuiSwitch
                size="small"
                color="primary"
                checked={uiSearchParams.onlyClassics}
                onChange={(_, checked) => updateFilters({ onlyClassics: checked })}
              />
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'progress',
      label: 'Progress',
      title: 'Progress',
      defaultSummary: 'All climbs',
      getSummary: () => getProgressPanelSummary(uiSearchParams),
      content: (
        <div className={styles.panelContent}>
          {!isAuthenticated ? (
            <MuiAlert
              severity="info"
              className={styles.progressAlert}
              action={
                <MuiButton
                  size="small"
                  variant="contained"
                  startIcon={<LoginOutlined />}
                  onClick={() => setShowAuthModal(true)}
                >
                  Sign In
                </MuiButton>
              }
            >
              <strong>Sign in to filter by progress</strong>
              <br />
              Login to filter climbs based on your attempt and completion history.
            </MuiAlert>
          ) : (
            <div className={styles.switchGroup}>
              <div className={styles.switchRow}>
                <MuiTypography variant="body2" component="span">Hide Attempted</MuiTypography>
                <MuiSwitch
                  size="small"
                  color="primary"
                  checked={uiSearchParams.hideAttempted}
                  onChange={(_, checked) => updateFilters({ hideAttempted: checked })}
                />
              </div>
              <div className={styles.switchRow}>
                <MuiTypography variant="body2" component="span">Hide Completed</MuiTypography>
                <MuiSwitch
                  size="small"
                  color="primary"
                  checked={uiSearchParams.hideCompleted}
                  onChange={(_, checked) => updateFilters({ hideCompleted: checked })}
                />
              </div>
              <div className={styles.switchRow}>
                <MuiTypography variant="body2" component="span">Only Attempted</MuiTypography>
                <MuiSwitch
                  size="small"
                  color="primary"
                  checked={uiSearchParams.showOnlyAttempted}
                  onChange={(_, checked) => updateFilters({ showOnlyAttempted: checked })}
                />
              </div>
              <div className={styles.switchRow}>
                <MuiTypography variant="body2" component="span">Only Completed</MuiTypography>
                <MuiSwitch
                  size="small"
                  color="primary"
                  checked={uiSearchParams.showOnlyCompleted}
                  onChange={(_, checked) => updateFilters({ showOnlyCompleted: checked })}
                />
              </div>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'holds',
      label: 'Holds',
      title: 'Search by Hold',
      defaultSummary: 'Any',
      getSummary: () => getHoldsPanelSummary(uiSearchParams),
      content: (
        <div className={styles.holdSearchContainer}>
          <ClimbHoldSearchForm boardDetails={boardDetails} />
        </div>
      ),
    },
  ];

  return (
    <>
      <CollapsibleSection
        sections={sections}
        defaultActiveKey={defaultActiveKey[0] || 'climb'}
      />
      <AuthModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        title="Sign in to Boardsesh"
        description="Create an account to filter by your climbing progress and save favorites."
      />
    </>
  );
};

export default AccordionSearchForm;
