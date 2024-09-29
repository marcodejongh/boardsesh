import React, { useState } from "react";
import { SearchRequest } from "@/lib/types";
import { useDebouncedCallback } from "use-debounce";
import { Form, Slider, InputNumber, Row, Col, Select, Input } from "antd";
import { TENSION_KILTER_GRADES } from "@/app/lib/board-data";
import { useQueueContext } from "../board-control/queue-context";

interface SearchFormProps {}

const SearchForm: React.FC<SearchFormProps> = () => {
  /**
   * We maintain a copy of the search params so that the UI can update without hammering the rest-api.
   * Updating the state that affects the actual search is then debounced.
   */
  const { climbSearchParams, setClimbSearchParams } = useQueueContext();
  const [ uiSearchParams, setUISearchParams ] = useState(climbSearchParams);

  const grades = TENSION_KILTER_GRADES;
  
  const debouncedUpdate = useDebouncedCallback(() => {
    setClimbSearchParams(uiSearchParams)
  }, 1000);

  const updateFilters = (newFilters: Partial<SearchRequest>) => {
    const updatedFilters = { 
      ...climbSearchParams, 
      ...newFilters, 
      // Go back to page 0 when the search params are updated, no point in loading 10 pages
      // of results immediately when the search has just been changed.
      page: 0
    };
    setUISearchParams(updatedFilters);
    debouncedUpdate();
  };

  return (
    <>
      <Form.Item label="Grade Range">
        <Slider
          range
          min={grades[0].difficulty_id}
          max={grades[grades.length - 1].difficulty_id}
          value={[uiSearchParams.minGrade, uiSearchParams.maxGrade]}
          marks={{
            [uiSearchParams.minGrade]: grades.find(({ difficulty_id }) => difficulty_id === uiSearchParams.minGrade)?.difficulty_name,
            [uiSearchParams.maxGrade]: grades.find(({ difficulty_id }) => difficulty_id === uiSearchParams.maxGrade)?.difficulty_name,
          }}
          onChange={(value) => updateFilters({ minGrade: value[0], maxGrade: value[1] })}
          tooltip={{
            formatter: (value) => grades.find(({ difficulty_id }) => difficulty_id === value)?.difficulty_name,
          }}
        />
      </Form.Item>

      <Form.Item label="Min Ascents">
        <InputNumber
          min={1}
          value={uiSearchParams.minAscents}
          onChange={(value) => updateFilters({ minAscents: value || 10 })}
          style={{ width: "100%" }}
        />
      </Form.Item>

      <Form.Item label="Sort By">
        <Row gutter={8}>
          <Col span={16}>
            <Select
              value={uiSearchParams.sortBy}
              onChange={(value) => updateFilters({ sortBy: value })}
              style={{ width: "100%" }}
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
              style={{ width: "100%" }}
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
          style={{ width: "100%" }}
        />
      </Form.Item>

      <Form.Item label="Classics Only">
        <Select
          value={uiSearchParams.onlyClassics}
          onChange={(value) => updateFilters({ onlyClassics: value })}
          style={{ width: "100%" }}
        >
          <Select.Option value="0">No</Select.Option>
          <Select.Option value="1">Yes</Select.Option>
        </Select>
      </Form.Item>

      <Form.Item label="Grade Accuracy">
        <Select
          value={uiSearchParams.gradeAccuracy}
          onChange={(value) => updateFilters({ gradeAccuracy: value })}
          style={{ width: "100%" }}
        >
          <Select.Option value={1}>Any</Select.Option>
          <Select.Option value={0.2}>Somewhat Accurate (&lt;0.2)</Select.Option>
          <Select.Option value={0.1}>Very Accurate (&lt;0.1)</Select.Option>
          <Select.Option value={0.05}>Extremely Accurate (&lt;0.05)</Select.Option>
        </Select>
      </Form.Item>

      <Form.Item label="Setter Name">
        <Input
          value={uiSearchParams.settername}
          onChange={(e) => updateFilters({ settername: e.target.value })}
        />
      </Form.Item>
    </>
  );
}
  
  export default SearchForm;