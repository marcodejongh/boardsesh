'use client';

import React, { useState } from 'react';
import { InputNumber, Row, Col, Select, Switch, Alert, Typography, Tooltip, Divider, Button } from 'antd';
import { LoginOutlined } from '@ant-design/icons';
import { TENSION_KILTER_GRADES } from '@/app/lib/board-data';
import { useUISearchParams } from '@/app/components/queue-control/ui-searchparams-provider';
import { useBoardProvider } from '@/app/components/board-provider/board-provider-context';
import SearchClimbNameInput from './search-climb-name-input';
import SetterNameSelect from './setter-name-select';
import { BoardDetails } from '@/app/lib/types';
import AuthModal from '@/app/components/auth/auth-modal';
import styles from './search-form.module.css';

const { Text } = Typography;

// Kilter Homewall layout ID
const KILTER_HOMEWALL_LAYOUT_ID = 8;

interface BasicSearchFormProps {
  boardDetails: BoardDetails;
}

const BasicSearchForm: React.FC<BasicSearchFormProps> = ({ boardDetails }) => {
  const { uiSearchParams, updateFilters } = useUISearchParams();
  const { isAuthenticated } = useBoardProvider();
  const grades = TENSION_KILTER_GRADES;
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Check if we should show the tall climbs filter
  // Only show for Kilter Homewall on the largest size (10x12)
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

  const renderLogbookSection = () => {
    if (!isAuthenticated) {
      return (
        <Alert
          title="Sign in to filter by progress"
          description="Login to filter climbs based on your attempt and completion history."
          type="info"
          showIcon
          className={styles.progressAlert}
          action={
            <Button
              size="small"
              type="primary"
              icon={<LoginOutlined />}
              onClick={() => setShowAuthModal(true)}
            >
              Sign In
            </Button>
          }
        />
      );
    }

    return (
      <div className={styles.switchGroup}>
        <div className={styles.switchRow}>
          <Text>Hide Attempted</Text>
          <Switch
            size="small"
            checked={uiSearchParams.hideAttempted}
            onChange={(checked) => updateFilters({ hideAttempted: checked })}
          />
        </div>

        <div className={styles.switchRow}>
          <Text>Hide Completed</Text>
          <Switch
            size="small"
            checked={uiSearchParams.hideCompleted}
            onChange={(checked) => updateFilters({ hideCompleted: checked })}
          />
        </div>

        <div className={styles.switchRow}>
          <Text>Only Attempted</Text>
          <Switch
            size="small"
            checked={uiSearchParams.showOnlyAttempted}
            onChange={(checked) => updateFilters({ showOnlyAttempted: checked })}
          />
        </div>

        <div className={styles.switchRow}>
          <Text>Only Completed</Text>
          <Switch
            size="small"
            checked={uiSearchParams.showOnlyCompleted}
            onChange={(checked) => updateFilters({ showOnlyCompleted: checked })}
          />
        </div>
      </div>
    );
  };

  return (
    <div className={styles.searchForm}>
      {/* Search Section */}
      <div className={styles.section}>
        <div className={styles.inputGroup}>
          <Text strong>Climb Name</Text>
          <SearchClimbNameInput />
        </div>

        <div className={styles.inputGroup}>
          <Text strong>Grade Range</Text>
          <Row gutter={8}>
            <Col span={12}>
              <Select
                value={uiSearchParams.minGrade || 0}
                onChange={(value) => handleGradeChange('min', value)}
                className={styles.fullWidth}
                placeholder="Min"
              >
                <Select.Option value={0}>Any</Select.Option>
                {grades.map((grade) => (
                  <Select.Option key={grade.difficulty_id} value={grade.difficulty_id}>
                    {grade.difficulty_name}
                  </Select.Option>
                ))}
              </Select>
            </Col>
            <Col span={12}>
              <Select
                value={uiSearchParams.maxGrade || 0}
                onChange={(value) => handleGradeChange('max', value)}
                className={styles.fullWidth}
                placeholder="Max"
              >
                <Select.Option value={0}>Any</Select.Option>
                {grades.map((grade) => (
                  <Select.Option key={grade.difficulty_id} value={grade.difficulty_id}>
                    {grade.difficulty_name}
                  </Select.Option>
                ))}
              </Select>
            </Col>
          </Row>
        </div>

        <div className={styles.inputGroup}>
          <Text strong>Setter</Text>
          <SetterNameSelect />
        </div>
      </div>

      <Divider className={styles.divider} />

      {/* Quality Filters Section */}
      <div className={styles.section}>
        <Text type="secondary" className={styles.sectionTitle}>Quality Filters</Text>

        <Row gutter={[12, 12]}>
          <Col span={12}>
            <div className={styles.compactInputGroup}>
              <Text>Min Ascents</Text>
              <InputNumber
                min={1}
                value={uiSearchParams.minAscents}
                onChange={(value) => updateFilters({ minAscents: value || undefined })}
                className={styles.fullWidth}
                placeholder="Any"
              />
            </div>
          </Col>
          <Col span={12}>
            <div className={styles.compactInputGroup}>
              <Text>Min Rating</Text>
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
          </Col>
        </Row>

        <div className={styles.inputGroup}>
          <Text>Grade Accuracy</Text>
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
            <Text>Classics Only</Text>
            <Switch
              size="small"
              checked={uiSearchParams.onlyClassics}
              onChange={(checked) => updateFilters({ onlyClassics: checked })}
            />
          </div>

          {showTallClimbsFilter && (
            <div className={styles.switchRow}>
              <Tooltip title="Show only climbs that use holds in the bottom 8 rows (only available on 10x12 boards)">
                <Text>Tall Climbs Only</Text>
              </Tooltip>
              <Switch
                size="small"
                checked={uiSearchParams.onlyTallClimbs}
                onChange={(checked) => updateFilters({ onlyTallClimbs: checked })}
              />
            </div>
          )}
        </div>
      </div>

      <Divider className={styles.divider} />

      {/* Sort Section */}
      <div className={styles.section}>
        <div className={styles.inputGroup}>
          <Text strong>Sort By</Text>
          <Row gutter={8}>
            <Col span={14}>
              <Select
                value={uiSearchParams.sortBy}
                onChange={(value) => updateFilters({ sortBy: value })}
                className={styles.fullWidth}
              >
                <Select.Option value="ascents">Ascents</Select.Option>
                <Select.Option value="popular">Popular</Select.Option>
                <Select.Option value="difficulty">Difficulty</Select.Option>
                <Select.Option value="name">Name</Select.Option>
                <Select.Option value="quality">Quality</Select.Option>
              </Select>
            </Col>
            <Col span={10}>
              <Select
                value={uiSearchParams.sortOrder}
                onChange={(value) => updateFilters({ sortOrder: value })}
                className={styles.fullWidth}
              >
                <Select.Option value="desc">Desc</Select.Option>
                <Select.Option value="asc">Asc</Select.Option>
              </Select>
            </Col>
          </Row>
        </div>
      </div>

      <Divider className={styles.divider} />

      {/* Personal Progress Section */}
      <div className={styles.section}>
        <Text type="secondary" className={styles.sectionTitle}>Personal Progress</Text>
        {renderLogbookSection()}
      </div>

      <AuthModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        title="Sign in to Boardsesh"
        description="Create an account to filter by your climbing progress and save favorites."
      />
    </div>
  );
};

export default BasicSearchForm;
