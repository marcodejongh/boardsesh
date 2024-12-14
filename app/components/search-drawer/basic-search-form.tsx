'use client';

import React from 'react';
import { Form, InputNumber, Row, Col, Select, Input, Switch, Alert, Typography, Slider } from 'antd';
import { TENSION_KILTER_GRADES } from '@/app/lib/board-data';
import { useUISearchParams } from '@/app/components/queue-control/ui-searchparams-provider';
import SearchClimbNameInput from './search-climb-name-input';
import { useBoardProvider } from '../board-provider/board-provider-context';

const { Title } = Typography;

const BasicSearchForm: React.FC = () => {
  const { uiSearchParams, updateFilters } = useUISearchParams();
  const { user } = useBoardProvider();
  const userId = user?.id;
  const grades = TENSION_KILTER_GRADES;

  const renderLogbookSection = () => {
    if (!userId) {
      return (
        <Form.Item>
          <Alert
            message="Sign in to access your logbook"
            description="Login to your account to search for your favourite climbs, climbs you've done, or attempted."
            type="info"
            showIcon
          />
        </Form.Item>
      );
    }

    return (
      <>
        <Form.Item label="Climbs I have Done" valuePropName="checked">
          <Switch
            style={{ float: 'right' }}
            checked={uiSearchParams.showDone}
            onChange={(checked) => updateFilters({ showDone: checked })}
          />
        </Form.Item>

        <Form.Item label="Climbs I have Attempted" valuePropName="checked">
          <Switch
            style={{ float: 'right' }}
            checked={uiSearchParams.showAttempted}
            onChange={(checked) => updateFilters({ showAttempted: checked })}
          />
        </Form.Item>

        <Form.Item label="Climbs I have Not Attempted" valuePropName="checked">
          <Switch
            style={{ float: 'right' }}
            checked={uiSearchParams.showNotAttempted}
            onChange={(checked) => updateFilters({ showNotAttempted: checked })}
          />
        </Form.Item>

        <Form.Item label="Climbs I Liked" valuePropName="checked">
          <Switch
            style={{ float: 'right' }}
            checked={uiSearchParams.showOnlyLiked}
            onChange={(checked) => updateFilters({ showOnlyLiked: checked })}
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
        <Slider
          range
          min={grades[0].difficulty_id}
          max={grades[grades.length - 1].difficulty_id}
          value={[uiSearchParams.minGrade, uiSearchParams.maxGrade]}
          marks={{
            [uiSearchParams.minGrade]: {
              style: { transform: 'translate(-5px, 0px)' },
              label: grades.find(({ difficulty_id }) => difficulty_id === uiSearchParams.minGrade)?.difficulty_name,
            },
            [uiSearchParams.maxGrade]: {
              style: { transform: 'translate(-5px, -30px)' },
              label: grades.find(({ difficulty_id }) => difficulty_id === uiSearchParams.maxGrade)?.difficulty_name,
            },
          }}
          onChange={(value) => updateFilters({ minGrade: value[0], maxGrade: value[1] })}
        />
      </Form.Item>

      <Form.Item label="Min Ascents">
        <InputNumber
          min={1}
          value={uiSearchParams.minAscents}
          onChange={(value) => updateFilters({ minAscents: value || 10 })}
          style={{ width: '100%' }}
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
          onChange={(value) => updateFilters({ minRating: value || 1 })}
          style={{ width: '100%' }}
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
          onChange={(value) => updateFilters({ gradeAccuracy: value })}
          style={{ width: '100%' }}
        >
          <Select.Option value={1}>Any</Select.Option>
          <Select.Option value={0.2}>Somewhat Accurate (&lt;0.2)</Select.Option>
          <Select.Option value={0.1}>Very Accurate (&lt;0.1)</Select.Option>
          <Select.Option value={0.05}>Extremely Accurate (&lt;0.05)</Select.Option>
        </Select>
      </Form.Item>

      <Form.Item label="Setter Name">
        <Input value={uiSearchParams.settername} onChange={(e) => updateFilters({ settername: e.target.value })} />
      </Form.Item>

      <Form.Item>
        <Title level={5}>Logbook</Title>
      </Form.Item>

      {renderLogbookSection()}

      <Form.Item label="Only Climbs with Beta Videos" valuePropName="checked">
        <Switch
          style={{ float: 'right' }}
          checked={uiSearchParams.onlyWithBeta}
          onChange={(checked) => updateFilters({ onlyWithBeta: checked })}
        />
      </Form.Item>

      <Form.Item>
        <Title level={5}>Climb Types</Title>
      </Form.Item>

      <Form.Item label="Boulders" valuePropName="checked">
        <Switch
          style={{ float: 'right' }}
          checked={uiSearchParams.showBoulders}
          onChange={(checked) => updateFilters({ showBoulders: checked })}
        />
      </Form.Item>

      <Form.Item label="Routes" valuePropName="checked">
        <Switch
          style={{ float: 'right' }}
          checked={uiSearchParams.showRoutes}
          onChange={(checked) => updateFilters({ showRoutes: checked })}
        />
      </Form.Item>

      <Form.Item>
        <Title level={5}>Climb Status</Title>
      </Form.Item>

      <Form.Item label="Established" valuePropName="checked">
        <Switch
          style={{ float: 'right' }}
          checked={uiSearchParams.showEstablished}
          onChange={(checked) => updateFilters({ showEstablished: checked })}
        />
      </Form.Item>

      <Form.Item label="Open Projects" valuePropName="checked">
        <Switch
          style={{ float: 'right' }}
          checked={uiSearchParams.showProjects}
          onChange={(checked) => updateFilters({ showProjects: checked })}
        />
      </Form.Item>

      <Form.Item label="Drafts" valuePropName="checked">
        <Switch
          style={{ float: 'right' }}
          checked={uiSearchParams.showDrafts}
          onChange={(checked) => updateFilters({ showDrafts: checked })}
        />
      </Form.Item>

      <Form.Item>
        <Title level={5}>Climb Size & Shape</Title>
      </Form.Item>

      <Form.Item label="Only Tall Climbs" valuePropName="checked">
        <Switch
          style={{ float: 'right' }}
          checked={uiSearchParams.onlyTall}
          onChange={(checked) => updateFilters({ onlyTall: checked })}
        />
      </Form.Item>

      <Form.Item label="Only Side Climbs" valuePropName="checked">
        <Switch
          style={{ float: 'right' }}
          checked={uiSearchParams.onlySide}
          onChange={(checked) => updateFilters({ onlySide: checked })}
        />
      </Form.Item>
    </Form>
  );
};

export default BasicSearchForm;