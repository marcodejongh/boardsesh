'use client';

import React from 'react';
import { Form, InputNumber, Row, Col, Select, Input, Switch, Divider } from 'antd';
import { TENSION_KILTER_GRADES } from '@/app/lib/board-data';
import { useUISearchParams } from '@/app/components/queue-control/ui-searchparams-provider';
import { useBoardProvider } from '@/app/components/board-provider/board-provider-context';
import SearchClimbNameInput from './search-climb-name-input';

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

  return (
    <Form labelCol={{ span: 8 }} wrapperCol={{ span: 16 }}>
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

      <Form.Item label="Classics Only">
        <Select
          value={uiSearchParams.onlyClassics}
          onChange={(value) => updateFilters({ onlyClassics: value })}
          style={{ width: '100%' }}
        >
          <Select.Option value="0">No</Select.Option>
          <Select.Option value="1">Yes</Select.Option>
        </Select>
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

      {isLoggedIn && (
        <>
          <Divider>Personal Progress</Divider>
          
          <Form.Item label="Hide Attempted" tooltip="Hide climbs you have attempted">
            <Switch
              checked={uiSearchParams.hideAttempted}
              onChange={(checked) => updateFilters({ hideAttempted: checked })}
            />
          </Form.Item>

          <Form.Item label="Hide Completed" tooltip="Hide climbs you have completed">
            <Switch
              checked={uiSearchParams.hideCompleted}
              onChange={(checked) => updateFilters({ hideCompleted: checked })}
            />
          </Form.Item>

          <Form.Item label="Only Attempted" tooltip="Show only climbs you have attempted">
            <Switch
              checked={uiSearchParams.showOnlyAttempted}
              onChange={(checked) => updateFilters({ showOnlyAttempted: checked })}
            />
          </Form.Item>

          <Form.Item label="Only Completed" tooltip="Show only climbs you have completed">
            <Switch
              checked={uiSearchParams.showOnlyCompleted}
              onChange={(checked) => updateFilters({ showOnlyCompleted: checked })}
            />
          </Form.Item>
        </>
      )}
    </Form>
  );
};

export default BasicSearchForm;
