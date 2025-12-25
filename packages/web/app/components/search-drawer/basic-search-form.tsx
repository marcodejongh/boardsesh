'use client';

import React, { useState } from 'react';
import { InputNumber, Row, Col, Select, Switch, Alert, Typography, Tooltip, Divider, Space, Button } from 'antd';
import {
  SearchOutlined,
  SortAscendingOutlined,
  StarOutlined,
  TrophyOutlined,
  UserOutlined,
  AimOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ArrowUpOutlined,
  LoginOutlined,
} from '@ant-design/icons';
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
  const { isAuthenticated, hasAuroraCredentials } = useBoardProvider();
  const grades = TENSION_KILTER_GRADES;
  const [showAuthModal, setShowAuthModal] = useState(false);

  const canFilterByProgress = isAuthenticated && hasAuroraCredentials;

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
          message="Sign in to filter by progress"
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

    if (!hasAuroraCredentials) {
      return (
        <Alert
          message="Link your board account"
          description={`Link your ${boardDetails.board_name.charAt(0).toUpperCase() + boardDetails.board_name.slice(1)} account in Settings to filter by progress.`}
          type="info"
          showIcon
          className={styles.progressAlert}
        />
      );
    }

    return (
      <div className={styles.switchGroup}>
        <div className={styles.switchRow}>
          <Space>
            <EyeInvisibleOutlined className={styles.switchIcon} />
            <Text>Hide Attempted</Text>
          </Space>
          <Switch
            size="small"
            checked={uiSearchParams.hideAttempted}
            onChange={(checked) => updateFilters({ hideAttempted: checked })}
          />
        </div>

        <div className={styles.switchRow}>
          <Space>
            <EyeInvisibleOutlined className={styles.switchIcon} />
            <Text>Hide Completed</Text>
          </Space>
          <Switch
            size="small"
            checked={uiSearchParams.hideCompleted}
            onChange={(checked) => updateFilters({ hideCompleted: checked })}
          />
        </div>

        <div className={styles.switchRow}>
          <Space>
            <ClockCircleOutlined className={styles.switchIcon} />
            <Text>Only Attempted</Text>
          </Space>
          <Switch
            size="small"
            checked={uiSearchParams.showOnlyAttempted}
            onChange={(checked) => updateFilters({ showOnlyAttempted: checked })}
          />
        </div>

        <div className={styles.switchRow}>
          <Space>
            <CheckCircleOutlined className={styles.switchIcon} />
            <Text>Only Completed</Text>
          </Space>
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
          <div className={styles.inputLabel}>
            <SearchOutlined className={styles.labelIcon} />
            <Text strong>Climb Name</Text>
          </div>
          <SearchClimbNameInput />
        </div>

        <div className={styles.inputGroup}>
          <div className={styles.inputLabel}>
            <AimOutlined className={styles.labelIcon} />
            <Text strong>Grade Range</Text>
          </div>
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
          <div className={styles.inputLabel}>
            <UserOutlined className={styles.labelIcon} />
            <Text strong>Setter</Text>
          </div>
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
              <div className={styles.inputLabel}>
                <ArrowUpOutlined className={styles.labelIcon} />
                <Text>Min Ascents</Text>
              </div>
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
              <div className={styles.inputLabel}>
                <StarOutlined className={styles.labelIcon} />
                <Text>Min Rating</Text>
              </div>
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
          <div className={styles.inputLabel}>
            <AimOutlined className={styles.labelIcon} />
            <Text>Grade Accuracy</Text>
          </div>
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
            <Space>
              <TrophyOutlined className={styles.switchIcon} />
              <Text>Classics Only</Text>
            </Space>
            <Switch
              size="small"
              checked={uiSearchParams.onlyClassics}
              onChange={(checked) => updateFilters({ onlyClassics: checked })}
            />
          </div>

          {showTallClimbsFilter && (
            <div className={styles.switchRow}>
              <Space>
                <Tooltip title="Show only climbs that use holds in the bottom 8 rows (only available on 10x12 boards)">
                  <ArrowUpOutlined className={styles.switchIcon} />
                  <Text>Tall Climbs Only</Text>
                </Tooltip>
              </Space>
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
          <div className={styles.inputLabel}>
            <SortAscendingOutlined className={styles.labelIcon} />
            <Text strong>Sort By</Text>
          </div>
          <Row gutter={8}>
            <Col span={14}>
              <Select
                value={uiSearchParams.sortBy}
                onChange={(value) => updateFilters({ sortBy: value })}
                className={styles.fullWidth}
              >
                <Select.Option value="ascents">Ascents</Select.Option>
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
        <Text type="secondary" className={styles.sectionTitle}>
          <EyeOutlined className={styles.labelIcon} /> Personal Progress
        </Text>
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
