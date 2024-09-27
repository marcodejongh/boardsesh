import React, { useState } from "react";
import { BoulderProblem, ParsedBoardRouteParameters, SearchRequest } from "@/lib/types";
import { useDebouncedCallback } from "use-debounce";
import { Layout, Form, Slider, InputNumber, Row, Col, Select, Input, Button, Grid, Drawer } from "antd";
import { ANGLES, TENSION_KILTER_GRADES } from "@/app/lib/board-data";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { useQueueContext } from "../board-control/queue-context";
import { parseBoardRouteParams } from "@/app/lib/util";

interface SearchFormProps {
  
}

const SearchForm: React.FC<SearchFormProps> = () => {
  const { climbSearchParams, setClimbSearchParams } = useQueueContext();
  const searchParams = useSearchParams();
  const { board_name } = parseBoardRouteParams(searchParams);
  const pathName = usePathname();
  const { replace } = useRouter();

  const grades = TENSION_KILTER_GRADES;
  const angles = ANGLES[board_name];
  
  const debouncedUpdate = useDebouncedCallback((updatedFilters) => {
    replace(`${pathName}?${new URLSearchParams(climbSearchParams).toString()}`);
  }, 300);

  const updateFilters = (newFilters: Partial<SearchRequest>) => {
    const updatedFilters = { ...climbSearchParams, ...newFilters };
    setClimbSearchParams(updatedFilters);
    debouncedUpdate(updatedFilters);
  };

  return (
    <>
      <Form.Item label="Grade Range">
        <Slider
          range
          min={grades[0].difficulty_id}
          max={grades[grades.length - 1].difficulty_id}
          value={[climbSearchParams.minGrade, climbSearchParams.maxGrade]}
          marks={{
            [climbSearchParams.minGrade]: grades.find(({ difficulty_id }) => difficulty_id === climbSearchParams.minGrade)?.difficulty_name,
            [climbSearchParams.maxGrade]: grades.find(({ difficulty_id }) => difficulty_id === climbSearchParams.maxGrade)?.difficulty_name,
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
          value={climbSearchParams.minAscents}
          onChange={(value) => updateFilters({ minAscents: value || 10 })}
          style={{ width: "100%" }}
        />
      </Form.Item>

      <Form.Item label="Sort By">
        <Row gutter={8}>
          <Col span={16}>
            <Select
              value={climbSearchParams.sortBy}
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
              value={climbSearchParams.sortOrder}
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
          value={climbSearchParams.minRating}
          onChange={(value) => updateFilters({ minRating: value || 1 })}
          style={{ width: "100%" }}
        />
      </Form.Item>

      <Form.Item label="Classics Only">
        <Select
          value={climbSearchParams.onlyClassics}
          onChange={(value) => updateFilters({ onlyClassics: value })}
          style={{ width: "100%" }}
        >
          <Select.Option value="0">No</Select.Option>
          <Select.Option value="1">Yes</Select.Option>
        </Select>
      </Form.Item>

      <Form.Item label="Grade Accuracy">
        <Select
          value={climbSearchParams.gradeAccuracy}
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
          value={climbSearchParams.settername}
          onChange={(e) => updateFilters({ settername: e.target.value })}
        />
      </Form.Item>
    </>
  );
}
  
  export default SearchForm;