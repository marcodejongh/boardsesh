'use client';

import React, { useState } from 'react';
import { InputNumber, Select, Switch } from 'antd';
import MuiAlert from '@mui/material/Alert';
import MuiTooltip from '@mui/material/Tooltip';
import MuiTypography from '@mui/material/Typography';
import MuiButton from '@mui/material/Button';
import Box from '@mui/material/Box';
import LoginOutlined from '@mui/icons-material/LoginOutlined';
import ArrowUpwardOutlined from '@mui/icons-material/ArrowUpwardOutlined';
import { TENSION_KILTER_GRADES } from '@/app/lib/board-data';
import { getGradeTintColor } from '@/app/lib/grade-colors';
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
import styles from './accordion-search-form.module.css';


// Kilter Homewall layout ID
const KILTER_HOMEWALL_LAYOUT_ID = 8;

interface AccordionSearchFormProps {
  boardDetails: BoardDetails;
  defaultActiveKey?: string[];
}

interface SectionConfig {
  key: string;
  label: string;
  title: string;
  defaultSummary: string;
  getSummary: () => string[];
  content: React.ReactNode;
}

const AccordionSearchForm: React.FC<AccordionSearchFormProps> = ({
  boardDetails,
  defaultActiveKey = ['climb'],
}) => {
  const { uiSearchParams, updateFilters } = useUISearchParams();
  const { isAuthenticated } = useBoardProvider();
  const grades = TENSION_KILTER_GRADES;
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [activeKey, setActiveKey] = useState<string>(defaultActiveKey[0] || 'climb');

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
    return getGradeTintColor(grade.difficulty_name, 'light');
  };

  const minGradeBg = getGradeSelectBackground(uiSearchParams.minGrade);
  const maxGradeBg = getGradeSelectBackground(uiSearchParams.maxGrade);

  const sections: SectionConfig[] = [
    {
      key: 'climb',
      label: 'Climb',
      title: 'Climb',
      defaultSummary: 'All climbs',
      getSummary: () => getClimbPanelSummary(uiSearchParams),
      content: (
        <div className={styles.panelContent}>
          <div className={styles.inputGroup}>
            <MuiTypography variant="body2" component="span" fontWeight={600}>Climb Name</MuiTypography>
            <SearchClimbNameInput />
          </div>

          <div className={styles.inputGroup}>
            <MuiTypography variant="body2" component="span" fontWeight={600}>Grade Range</MuiTypography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '0px 8px' }}>
              <Box sx={{ width: '50%' }}>
                <Select
                  value={uiSearchParams.minGrade || 0}
                  onChange={(value) => handleGradeChange('min', value)}
                  className={`${styles.fullWidth} ${minGradeBg ? styles.gradeSelectColored : ''}`}
                  style={minGradeBg ? { '--grade-bg': minGradeBg } as React.CSSProperties : undefined}
                  placeholder="Min"
                >
                  <Select.Option value={0}>Any</Select.Option>
                  {grades.map((grade) => (
                    <Select.Option key={grade.difficulty_id} value={grade.difficulty_id}>
                      {grade.difficulty_name}
                    </Select.Option>
                  ))}
                </Select>
              </Box>
              <Box sx={{ width: '50%' }}>
                <Select
                  value={uiSearchParams.maxGrade || 0}
                  onChange={(value) => handleGradeChange('max', value)}
                  className={`${styles.fullWidth} ${maxGradeBg ? styles.gradeSelectColored : ''}`}
                  style={maxGradeBg ? { '--grade-bg': maxGradeBg } as React.CSSProperties : undefined}
                  placeholder="Max"
                >
                  <Select.Option value={0}>Any</Select.Option>
                  {grades.map((grade) => (
                    <Select.Option key={grade.difficulty_id} value={grade.difficulty_id}>
                      {grade.difficulty_name}
                    </Select.Option>
                  ))}
                </Select>
              </Box>
            </Box>
          </div>

          {showTallClimbsFilter && (
            <div className={styles.switchGroup}>
              <div className={styles.switchRow}>
                <MuiTooltip title="Show only climbs that use holds in the bottom 8 rows (only available on 10x12 boards)">
                  <MuiTypography variant="body2" component="span">Tall Climbs Only</MuiTypography>
                </MuiTooltip>
                <Switch
                  size="small"
                  checked={uiSearchParams.onlyTallClimbs}
                  onChange={(checked) => updateFilters({ onlyTallClimbs: checked })}
                />
              </div>
            </div>
          )}

          <div className={styles.inputGroup}>
            <MuiTypography variant="body2" component="span" fontWeight={600}>Setter</MuiTypography>
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
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '0px 8px' }}>
                <Box sx={{ width: '58.33%' }}>
                  <Select
                    value={uiSearchParams.sortBy}
                    onChange={(value) => updateFilters({ sortBy: value })}
                    className={styles.fullWidth}
                    size="small"
                  >
                    <Select.Option value="ascents">Ascents</Select.Option>
                    <Select.Option value="popular">Popular</Select.Option>
                    <Select.Option value="difficulty">Difficulty</Select.Option>
                    <Select.Option value="name">Name</Select.Option>
                    <Select.Option value="quality">Quality</Select.Option>
                  </Select>
                </Box>
                <Box sx={{ width: '41.67%' }}>
                  <Select
                    value={uiSearchParams.sortOrder}
                    onChange={(value) => updateFilters({ sortOrder: value })}
                    className={styles.fullWidth}
                    size="small"
                  >
                    <Select.Option value="desc">Desc</Select.Option>
                    <Select.Option value="asc">Asc</Select.Option>
                  </Select>
                </Box>
              </Box>
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
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '12px 12px' }}>
            <Box sx={{ width: '50%' }}>
              <div className={styles.compactInputGroup}>
                <MuiTypography variant="body2" component="span">Min Ascents</MuiTypography>
                <InputNumber
                  min={1}
                  value={uiSearchParams.minAscents}
                  onChange={(value) => updateFilters({ minAscents: value || undefined })}
                  className={styles.fullWidth}
                  placeholder="Any"
                />
              </div>
            </Box>
            <Box sx={{ width: '50%' }}>
              <div className={styles.compactInputGroup}>
                <MuiTypography variant="body2" component="span">Min Rating</MuiTypography>
                <InputNumber
                  min={1.0}
                  max={3.0}
                  step={0.1}
                  value={uiSearchParams.minRating}
                  onChange={(value) => updateFilters({ minRating: value || undefined })}
                  className={styles.fullWidth}
                  placeholder="Any"
                />
              </div>
            </Box>
          </Box>

          <div className={styles.inputGroup}>
            <MuiTypography variant="body2" component="span">Grade Accuracy</MuiTypography>
            <Select
              value={uiSearchParams.gradeAccuracy}
              onChange={(value) => updateFilters({ gradeAccuracy: value || undefined })}
              className={styles.fullWidth}
            >
              <Select.Option value={0}>Any</Select.Option>
              <Select.Option value={0.2}>Somewhat Accurate (&lt;0.2)</Select.Option>
              <Select.Option value={0.1}>Very Accurate (&lt;0.1)</Select.Option>
              <Select.Option value={0.05}>Extremely Accurate (&lt;0.05)</Select.Option>
            </Select>
          </div>

          <div className={styles.switchGroup}>
            <div className={styles.switchRow}>
              <MuiTypography variant="body2" component="span">Classics Only</MuiTypography>
              <Switch
                size="small"
                checked={uiSearchParams.onlyClassics}
                onChange={(checked) => updateFilters({ onlyClassics: checked })}
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
                <Switch
                  size="small"
                  checked={uiSearchParams.hideAttempted}
                  onChange={(checked) => updateFilters({ hideAttempted: checked })}
                />
              </div>
              <div className={styles.switchRow}>
                <MuiTypography variant="body2" component="span">Hide Completed</MuiTypography>
                <Switch
                  size="small"
                  checked={uiSearchParams.hideCompleted}
                  onChange={(checked) => updateFilters({ hideCompleted: checked })}
                />
              </div>
              <div className={styles.switchRow}>
                <MuiTypography variant="body2" component="span">Only Attempted</MuiTypography>
                <Switch
                  size="small"
                  checked={uiSearchParams.showOnlyAttempted}
                  onChange={(checked) => updateFilters({ showOnlyAttempted: checked })}
                />
              </div>
              <div className={styles.switchRow}>
                <MuiTypography variant="body2" component="span">Only Completed</MuiTypography>
                <Switch
                  size="small"
                  checked={uiSearchParams.showOnlyCompleted}
                  onChange={(checked) => updateFilters({ showOnlyCompleted: checked })}
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
      <div className={styles.steppedContainer}>
        {sections.map((section) => {
          const isActive = activeKey === section.key;
          const summaryParts = section.getSummary();
          const summaryText = summaryParts.length > 0
            ? summaryParts.join(' \u00B7 ')
            : section.defaultSummary;

          return (
            <div
              key={section.key}
              className={`${styles.sectionCard} ${isActive ? styles.sectionCardActive : ''}`}
              {...(!isActive ? { onClick: () => setActiveKey(section.key) } : {})}
            >
              <div className={`${styles.collapsedRow} ${isActive ? styles.collapsedRowActive : ''}`}>
                <span className={styles.collapsedLabel}>{isActive ? section.title : section.label}</span>
                <span className={`${styles.collapsedSummary} ${isActive ? styles.collapsedSummaryHidden : ''}`}>
                  {summaryText}
                </span>
              </div>
              <div className={`${styles.expandableContent} ${isActive ? styles.expandableContentOpen : ''}`}>
                <div className={styles.expandableInner}>
                  <div className={styles.expandableInnerPadding}>
                    {section.content}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
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
