'use client';

import React from 'react';
import { Form, InputNumber, Row, Col, Select, Switch, Alert, Typography, Tooltip } from 'antd';
import { TENSION_KILTER_GRADES } from '@/app/lib/board-data';
import { useUISearchParams } from '@/app/components/queue-control/ui-searchparams-provider';
import { useBoardProvider } from '@/app/components/board-provider/board-provider-context';
import SearchClimbNameInput from './search-climb-name-input';
import SetterNameSelect from './setter-name-select';
import { BoardDetails } from '@/app/lib/types';

const { Title } = Typography;

// Kilter Homewall layout ID
const KILTER_HOMEWALL_LAYOUT_ID = 8;

interface BasicSearchFormProps {
  boardDetails: BoardDetails;
}

const BasicSearchForm: React.FC<BasicSearchFormProps> = ({ boardDetails }) => {
  const { uiSearchParams, updateFilters } = useUISearchParams();
  const { token, user_id } = useBoardProvider();
  const grades = TENSION_KILTER_GRADES;

  const isLoggedIn = token && user_id;

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
    if (!isLoggedIn) {
      return (
        <Form.Item wrapperCol={{ span: 24 }}>
          <Alert
            message="Sign in to access personal progress filters"
            description="Login to your account to filter climbs based on your attempt and completion history."
            type="info"
            showIcon
          />
        </Form.Item>
      );
    }

    return (
      <>
        <Form.Item label="Hide Attempted" valuePropName="checked">
          <Switch
            style={{ float: 'right' }}
            checked={uiSearchParams.hideAttempted}
            onChange={(checked) => updateFilters({ hideAttempted: checked })}
          />
        </Form.Item>

        <Form.Item label="Hide Completed" valuePropName="checked">
          <Switch
            style={{ float: 'right' }}
            checked={uiSearchParams.hideCompleted}
            onChange={(checked) => updateFilters({ hideCompleted: checked })}
          />
        </Form.Item>

        <Form.Item label="Only Attempted" valuePropName="checked">
          <Switch
            style={{ float: 'right' }}
            checked={uiSearchParams.showOnlyAttempted}
            onChange={(checked) => updateFilters({ showOnlyAttempted: checked })}
          />
        </Form.Item>

        <Form.Item label="Only Completed" valuePropName="checked">
          <Switch
            style={{ float: 'right' }}
            checked={uiSearchParams.showOnlyCompleted}
            onChange={(checked) => updateFilters({ showOnlyCompleted: checked })}
          />
        </Form.Item>
      </>
    );
  };

  return (
    <Form layout="horizontal" labelAlign="left" labelCol={{ span: 10 }} wrapperCol={{ span: 14 }}>
      <Form.Item label="Climb Name">
        <SearchClimbNameInput />
      </Form.Item>

      <Form.Item label="Grade Range">
        <Row gutter={8}>
          <Col span={12}>
            <Form.Item label="Min" noStyle>
              <Select
                value={uiSearchParams.minGrade || 0}
                defaultValue={0}
                onChange={(value) => handleGradeChange('min', value)}
                style={{ width: '100%' }}
              >
                <Select.Option value={0}>Any</Select.Option>
                {grades.map((grade) => (
                  <Select.Option key={grade.difficulty_id} value={grade.difficulty_id}>
                    {grade.difficulty_name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Max" noStyle>
              <Select
                value={uiSearchParams.maxGrade || 0}
                defaultValue={0}
                onChange={(value) => handleGradeChange('max', value)}
                style={{ width: '100%' }}
              >
                <Select.Option value={0}>Any</Select.Option>
                {grades.map((grade) => (
                  <Select.Option key={grade.difficulty_id} value={grade.difficulty_id}>
                    {grade.difficulty_name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>
      </Form.Item>

      <Form.Item label="Min Ascents">
        <InputNumber
          min={1}
          value={uiSearchParams.minAscents}
          onChange={(value) => updateFilters({ minAscents: value || undefined })}
          style={{ width: '100%' }}
          placeholder="Any"
        />
      </Form.Item>

      <Form.Item label="Sort By">
        <Row gutter={8}>
          <Col span={16}>
            <Select
              value={uiSearchParams.sortBy}
              onChange={(value) => updateFilters({ sortBy: value })}
              style={{ width: '100%' }}
            >
              <Select.Option value="ascents">Ascents</Select.Option>
              <Select.Option value="difficulty">Difficulty</Select.Option>
              <Select.Option value="name">Name</Select.Option>
              <Select.Option value="quality">Quality</Select.Option>
            </Select>
          </Col>
          <Col span={8}>
            <Select
              value={uiSearchParams.sortOrder}
              onChange={(value) => updateFilters({ sortOrder: value })}
              style={{ width: '100%' }}
            >
              <Select.Option value="desc">Descending</Select.Option>
              <Select.Option value="asc">Ascending</Select.Option>
            </Select>
          </Col>
        </Row>
      </Form.Item>

      <Form.Item label="Min Rating">
        <InputNumber
          min={1.0}
          max={3.0}
          step={0.1}
          value={uiSearchParams.minRating}
          onChange={(value) => updateFilters({ minRating: value || undefined })}
          style={{ width: '100%' }}
          placeholder="Any"
        />
      </Form.Item>

      <Form.Item label="Classics Only" valuePropName="checked">
        <Switch
          style={{ float: 'right' }}
          checked={uiSearchParams.onlyClassics}
          onChange={(checked) => updateFilters({ onlyClassics: checked })}
        />
      </Form.Item>

      {showTallClimbsFilter && (
        <Form.Item
          label={
            <Tooltip title="Show only climbs that use holds in the bottom 8 rows (only available on 10x12 boards)">
              Tall Climbs Only
            </Tooltip>
          }
          valuePropName="checked"
        >
          <Switch
            style={{ float: 'right' }}
            checked={uiSearchParams.onlyTallClimbs}
            onChange={(checked) => updateFilters({ onlyTallClimbs: checked })}
          />
        </Form.Item>
      )}

      <Form.Item label="Grade Accuracy">
        <Select
          value={uiSearchParams.gradeAccuracy}
          onChange={(value) => updateFilters({ gradeAccuracy: value || undefined })}
          style={{ width: '100%' }}
        >
          <Select.Option value={0}>Any</Select.Option>
          <Select.Option value={0.2}>Somewhat Accurate (&lt;0.2)</Select.Option>
          <Select.Option value={0.1}>Very Accurate (&lt;0.1)</Select.Option>
          <Select.Option value={0.05}>Extremely Accurate (&lt;0.05)</Select.Option>
        </Select>
      </Form.Item>

      <Form.Item label="Setter Name">
        <SetterNameSelect />
      </Form.Item>

      <Form.Item wrapperCol={{ span: 24 }}>
        <Title level={5}>Personal Progress</Title>
      </Form.Item>

      {renderLogbookSection()}
    </Form>
  );
};

export default BasicSearchForm;
