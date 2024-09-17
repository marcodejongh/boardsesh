import React, { useState, useEffect } from "react";
import {
  Drawer,
  List,
  Input,
  Select,
  Slider,
  InputNumber,
  Form,
  Row,
  Col,
  Collapse,
  Spin,
  Typography,
} from "antd";

import { fetchAngles, fetchGrades } from "../rest-api/api";
import { BoulderProblem, GetAnglesResponse, GetGradesResponse, SearchRequest } from "@/lib/types";
import { FilterDrawerProps } from "./types";
import { useDebouncedCallback } from "use-debounce";

const { Option } = Select;
const { Title, Text } = Typography;
const { Panel } = Collapse;

const FilterDrawer = ({
  currentClimb,
  climbs,
  handleClimbClick,
  open,
  currentSearchValues,
  onClose,
  onApplyFilters,
  board,
  layout,
  angle,
  resultsCount,
  closeDrawer,
}: FilterDrawerProps) => {
  const [filters, setFilters] = useState({
    minGrade: currentSearchValues.minGrade,
    maxGrade: currentSearchValues.maxGrade,
    minAscents: currentSearchValues.minAscents,
    sortBy: currentSearchValues.sortBy,
    sortOrder: currentSearchValues.sortOrder,
    minRating: currentSearchValues.minRating,
    onlyClassics: currentSearchValues.onlyClassics,
    gradeAccuracy: currentSearchValues.gradeAccuracy,
    settername: "",
    roleMatch: "strict",
    holds: "",
  });

  const [grades, setGrades] = useState<GetGradesResponse>([]);
  const [angles, setAngles] = useState<GetAnglesResponse>([]);
  const [loading, setLoading] = useState(true);
  const [fetchedGrades, setFetchedGrades] = useState(false);
  const [fetchedAngles, setFetchedAngles] = useState(false);

  const debouncedUpdate = useDebouncedCallback((updatedFilters) => {
    onApplyFilters(updatedFilters);
  }, 300);

  const updateFilters = (newFilters: Partial<SearchRequest>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    debouncedUpdate(updatedFilters);
  };

  useEffect(() => {
    const fetchGradeValues = async () => {
      try {
        const data = await fetchGrades(board);
        setGrades(data);
        if (data.length > 0) {
          updateFilters({
            minGrade: data[0].difficulty_id,
            maxGrade: data[data.length - 1].difficulty_id,
          });
        }
        setLoading(false);
        setFetchedGrades(true);
      } catch (error) {
        console.error("Error fetching grades:", error);
        setLoading(false);
      }
    };

    if (!fetchedGrades) {
      fetchGradeValues();
    }
  }, [board, fetchedGrades, updateFilters]);

  useEffect(() => {
    const fetchAngleValues = async () => {
      try {
        // TODO: Move to a button in the resultspage
        const data = await fetchAngles(board, layout);
        setAngles(data);
        setFetchedAngles(true);
      } catch (error) {
        console.error("Error fetching angles:", error);
      }
    };

    if (!fetchedAngles) {
      fetchAngleValues();
    }
  }, [layout, board]);

  if (loading || grades.length === 0) {
    return (
      <Drawer title="Advanced Filters" placement="left" onClose={onClose} width={400}>
        <Spin />
      </Drawer>
    );
  }

  return (
    <Drawer title="Advanced Filters" placement="left" onClose={onClose} width={"80%"} open={open}>
      <Collapse defaultActiveKey={[]} accordion>
        <Panel header={`Found ${resultsCount} matching climbs`} key="1">
          <Form layout="vertical">
            {grades.length > 0 && (
              <Form.Item label="Grade Range">
                <Slider
                  range
                  min={grades[0].difficulty_id}
                  max={grades[grades.length - 1].difficulty_id}
                  value={[filters.minGrade, filters.maxGrade]}
                  marks={{
                    [filters.minGrade]: grades.find(({ difficulty_id }) => difficulty_id === filters.minGrade)?.difficulty_name,
                    [filters.maxGrade]: grades.find(({ difficulty_id }) => difficulty_id === filters.maxGrade)?.difficulty_name,
                  }}
                  onChange={(value) =>
                    updateFilters({ minGrade: value[0], maxGrade: value[1] })
                  }
                  tooltip={{
                    formatter: (value) => grades.find(({ difficulty_id }) => difficulty_id === value)?.difficulty_name,
                  }}
                />
              </Form.Item>
            )}

            <Form.Item label="Min Ascents">
              <InputNumber
                min={1}
                value={filters.minAscents}
                onChange={(value) => updateFilters({ minAscents: value || 10 })}
                style={{ width: "100%" }}
              />
            </Form.Item>

            <Form.Item label="Sort By">
              <Row gutter={8}>
                <Col span={16}>
                  <Select
                    value={filters.sortBy}
                    onChange={(value) => updateFilters({ sortBy: value })}
                    style={{ width: "100%" }}
                  >
                    <Option value="ascents">Ascents</Option>
                    <Option value="difficulty">Difficulty</Option>
                    <Option value="name">Name</Option>
                    <Option value="quality">Quality</Option>
                  </Select>
                </Col>
                <Col span={8}>
                  <Select
                    value={filters.sortOrder}
                    onChange={(value) => updateFilters({ sortOrder: value })}
                    style={{ width: "100%" }}
                  >
                    <Option value="desc">Descending</Option>
                    <Option value="asc">Ascending</Option>
                  </Select>
                </Col>
              </Row>
            </Form.Item>

            <Form.Item label="Angle">
              <Select
                value={filters.angle}
                onChange={(value) => updateFilters({ angle: value })}
                style={{ width: "100%" }}
              >
                {angles.map(({angle}) => (
                  <Option key={angle} value={angle}>
                    {angle}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item label="Min Rating">
              <InputNumber
                min={1.0}
                max={3.0}
                step={0.1}
                value={filters.minRating}
                onChange={(value) => updateFilters({ minRating: value || 1 })}
                style={{ width: "100%" }}
              />
            </Form.Item>

            <Form.Item label="Classics Only">
              <Select
                value={filters.onlyClassics}
                onChange={(value) => updateFilters({ onlyClassics: value })}
                style={{ width: "100%" }}
              >
                <Option value="0">No</Option>
                <Option value="1">Yes</Option>
              </Select>
            </Form.Item>

            <Form.Item label="Grade Accuracy">
              <Select
                value={filters.gradeAccuracy}
                onChange={(value) => updateFilters({ gradeAccuracy: value })}
                style={{ width: "100%" }}
              >
                <Option value={1}>Any</Option>
                <Option value={0.2}>Somewhat Accurate (&lt;0.2)</Option>
                <Option value={0.1}>Very Accurate (&lt;0.1)</Option>
                <Option value={0.05}>Extremely Accurate (&lt;0.05)</Option>
              </Select>
            </Form.Item>

            <Form.Item label="Setter Name">
              <Input
                value={filters.settername}
                onChange={(e) => updateFilters({ settername: e.target.value })}
              />
            </Form.Item>
          </Form>
        </Panel>
      </Collapse>

      <List
        itemLayout="vertical"
        dataSource={climbs}
        renderItem={(climb: BoulderProblem) => (
          <List.Item
            key={climb.uuid}
            onClick={() => {
              handleClimbClick(climb);
              closeDrawer();
            }}
            style={{
              cursor: "pointer",
              paddingLeft: "16px",
              borderBottom: "1px solid #f0f0f0",
              backgroundColor: currentClimb?.uuid === climb.uuid ? "#f0f0f0" : "transparent",
              borderLeft: currentClimb?.uuid === climb.uuid ? "5px solid #1890ff" : "none",
            }}
          >
            <Title level={5} style={{ margin: 0 }}>
              {climb.name}
            </Title>
            <Text>
              Grade: {climb.difficulty} at {climb.angle}°
            </Text>
            <br />
            <Text type="secondary">
              {climb.ascensionist_count} ascents, {climb.quality_average}★
            </Text>
          </List.Item>
        )}
      />
    </Drawer>
  );
};

export default FilterDrawer;
