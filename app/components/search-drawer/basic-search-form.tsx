'use client';

import React from 'react';
import { Form, InputNumber, Row, Col, Select, Input, Switch, Alert, Typography } from 'antd';
import { TENSION_KILTER_GRADES } from '@/app/lib/board-data';
import { useUISearchParams } from '@/app/components/queue-control/ui-searchparams-provider';
import { useBoardProvider } from '@/app/components/board-provider/board-provider-context';
import SearchClimbNameInput from './search-climb-name-input';

const { Title } = Typography;

const BasicSearchForm: React.FC = () => {
  const { uiSearchParams, updateFilters } = useUISearchParams();
  const { token, user_id } = useBoardProvider();
  const grades = TENSION_KILTER_GRADES;
  
  const isLoggedIn = token && user_id;

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
        <Form.Item>
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
    <Form layout="horizontal" labelAlign="left" labelCol={{ span: 14 }} wrapperCol={{ span: 10 }}>
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
        <Input value={uiSearchParams.settername} onChange={(e) => updateFilters({ settername: e.target.value })} />
      </Form.Item>

      <Form.Item>
        <Title level={5}>Personal Progress</Title>
      </Form.Item>

      {renderLogbookSection()}
    </Form>
  );
};

export default BasicSearchForm;
