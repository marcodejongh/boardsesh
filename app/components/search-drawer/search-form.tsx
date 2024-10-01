import React from 'react';
import { Form, Slider, InputNumber, Row, Col, Select, Input } from 'antd';
import { TENSION_KILTER_GRADES } from '@/app/lib/board-data';
import { useUISearchParams } from '@/app/components/queue-control/ui-searchparams-provider';
import SearchClimbNameInput from './search-climb-name-input';

interface SearchFormProps {}

const SearchForm: React.FC<SearchFormProps> = () => {
  const { uiSearchParams, updateFilters } = useUISearchParams();

  const grades = TENSION_KILTER_GRADES;

  return (
    <>
      <Form labelCol={{ span: 8 }} wrapperCol={{ span: 16 }}>
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
                style: { transform: 'translate(-5px, 0px);' }, // Push the label below the slider
                label: grades.find(({ difficulty_id }) => difficulty_id === uiSearchParams.minGrade)?.difficulty_name,
              },
              [uiSearchParams.maxGrade]: {
                style: { transform: 'translate(-5px, -30px)' }, // Push the label above the slider
                label: grades.find(({ difficulty_id }) => difficulty_id === uiSearchParams.maxGrade)?.difficulty_name,
              },
            }}
            onChange={(value) => updateFilters({ minGrade: value[0], maxGrade: value[1] })}
            // tooltip={{
            //   formatter: (value) => grades.find(({ difficulty_id }) => difficulty_id === value)?.difficulty_name,
            // }}
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
      </Form>
    </>
  );
};

export default SearchForm;
