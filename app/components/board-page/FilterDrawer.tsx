"use client";
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
  Skeleton,
} from "antd";
import { useInView } from "react-intersection-observer";
import { fetchGrades } from "../rest-api/api";
import { BoulderProblem, GetGradesResponse, SearchRequest } from "@/lib/types";
import { FilterDrawerProps } from "./types";
import { useDebouncedCallback } from "use-debounce";
import { PAGE_LIMIT } from "./constants";
import BoardRenderer from "../board/board-renderer";

const { Option } = Select;
const { Title, Text } = Typography;
const { Panel } = Collapse;

type ShadowProblem = { shadow: true; uuid: string }
type ClimbListItem = BoulderProblem | ShadowProblem;

const isShadowItem = (item: ClimbListItem): item is { shadow: true; uuid: string } => {
  return (item as { shadow: true }).shadow === true;
};

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
  isFetching,
  searchChanged,
  fetchMoreClimbs,
  boardDetails,
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
  const [loading, setLoading] = useState(true);
  const [fetchedGrades, setFetchedGrades] = useState(false);

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

  // Intersection observer hook from react-intersection-observer
  const { ref: observerRef, inView } = useInView({
    triggerOnce: false,
    threshold: 1.0, // Full visibility of the item
  });

  // Fetch more climbs when the last item comes into view
  useEffect(() => {
    if (inView && !isFetching && climbs.length < resultsCount) {
      fetchMoreClimbs();
    }
  }, [inView, isFetching, climbs, resultsCount, fetchMoreClimbs]);

  if (loading || grades.length === 0) {
    return (
      <Drawer title="Advanced Filters" placement="left" onClose={onClose} width={400}>
        <Spin />
      </Drawer>
    );
  }

  // Generate shadow items to append to the climbs list
  const generateShadowItems = (): ShadowProblem[] => {
    return Array.from({ length: 3 }, (_, index) => ({
      uuid: `shadow-${index}`, // Use a unique ID for shadow items
      shadow: true, // Flag to identify the shadow items
    }));
  };

  const combinedClimbs = isFetching && !searchChanged
    ? [...climbs, ...generateShadowItems()]
    : climbs;

  return (
    <Drawer title="Advanced Filters" placement="left" onClose={onClose} width={"80%"} open={open}>
      <Collapse defaultActiveKey={[]} accordion>
        <Panel header={isFetching && !searchChanged ? `Searching for problems` : `Found ${resultsCount} matching climbs`} key="1">
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
        dataSource={combinedClimbs}
        renderItem={(climb: ClimbListItem, index: number) => {
          const isLastItem = index === combinedClimbs.length - 1;
          return isShadowItem(climb) ? (
            <List.Item key={climb.uuid}>
              <Skeleton active title={false} paragraph={{ rows: 2 }} />
            </List.Item>
          ) : (
            <List.Item
              key={climb.uuid}
              onClick={() => {
                handleClimbClick(climb);
                closeDrawer();
              }}
              ref={isLastItem ? observerRef : null} // Attach the observer ref to the last item
              style={{
                cursor: "pointer",
                paddingLeft: "16px",
                borderBottom: "1px solid #f0f0f0",
                backgroundColor: currentClimb?.uuid === climb.uuid ? "#f0f0f0" : "transparent",
                borderLeft: currentClimb?.uuid === climb.uuid ? "5px solid #1890ff" : "none",
              }}
            >
                        <Row justify="space-between" align="middle" style={{ width: "100%" }}>
            <Col xs={24} sm={20} md={16} lg={12} xl={8} style={{ textAlign: "center", height: '75dvh' }}>
              <BoardRenderer
                boardDetails={boardDetails}
                litUpHolds={currentClimb ? currentClimb.frames : ""}
                board={board}
              />
            </Col>
          </Row>
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
          );
        }}
      />
    </Drawer>
  );
};

export default FilterDrawer;
