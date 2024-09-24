"use client";
import React, { useState } from "react";

import { BoulderProblem, ParsedBoardRouteParameters, SearchRequest, SearchRequestPagination } from "@/lib/types";
import { useDebouncedCallback } from "use-debounce";
import Drawer from "antd/es/drawer";
import Form from "antd/es/form";
import Slider from "antd/es/slider";
import InputNumber from "antd/es/input-number";
import Row from "antd/es/row";
import Col from "antd/es/col";
import Select from "antd/es/select";
import Input from "antd/es/input";
import Link from "next/link";
import Button from "antd/es/button";
import { SearchOutlined } from "@ant-design/icons";
import { ANGLES, TENSION_KILTER_GRADES } from "@/app/lib/board-data";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { PAGE_LIMIT } from "../board-page/constants";


export type FilterDrawerProps =  {
  routeParams: ParsedBoardRouteParameters;
  currentClimb?: BoulderProblem;
  onClose: () => void;
  onApplyFilters: (filters: SearchRequest) => void;
  currentSearchValues: SearchRequest;
  resultsCount: number;
  isFetching: boolean;
  searchChanged: boolean;
};


const FilterDrawer = ({
  currentSearchValues,
  onApplyFilters,
  isFetching,
  routeParams: { board_name }
}: FilterDrawerProps) => {
    // Use the context to get and update the search parameters
  const searchParams = useSearchParams();
  const pathName = usePathname();
  const { replace } = useRouter();

  const grades = TENSION_KILTER_GRADES;
  const angles = ANGLES[board_name];

  const [filters, setFilters] = useState<SearchRequest>({
    gradeAccuracy: parseFloat(searchParams.get("gradeAccuracy") || "0"),
    maxGrade: parseInt(searchParams.get("maxGrade") || "29", 10),
    minAscents: parseInt(searchParams.get("minAscents") || "0", 10),
    minGrade: parseInt(searchParams.get("minGrade") || "1", 10),
    minRating: parseFloat(searchParams.get("minRating") || "0"),
    sortBy: (searchParams.get("sortBy") || "ascents") as "ascents" | "difficulty" | "name" | "quality",
    sortOrder: (searchParams.get("sortOrder") || "desc") as "asc" | "desc",
    name: searchParams.get("name") || "",
    onlyClassics: searchParams.get("onlyClassics") === "true",
    settername: searchParams.get("settername") || "",
    setternameSuggestion: searchParams.get("setternameSuggestion") || "",
    holds: searchParams.get("holds") || "",
    mirroredHolds: searchParams.get("mirroredHolds") || "",
  });

  const [ isOpen, setIsOpen ] = useState<Boolean>(false);

  // const [fetchedGrades, setFetchedGrades] = useState(false);

  const debouncedUpdate = useDebouncedCallback((updatedFilters) => {
    debugger;
    replace(`${pathName}?${new URLSearchParams(filters).toString()}`);
  }, 300);

  const updateFilters = (newFilters: Partial<SearchRequest>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    debouncedUpdate(updatedFilters);
  };

  return (
    <>      
      <Button type="default" icon={<SearchOutlined/>} onClick={()=> setIsOpen(true)} />
      <Drawer title="Advanced Filters" placement="left" width={"80%"} open={isOpen} onClose={()=> setIsOpen(false)}>
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
                  <Select.Option value="ascents">Ascents</Select.Option>
                  <Select.Option value="difficulty">Difficulty</Select.Option>
                  <Select.Option value="name">Name</Select.Option>
                  <Select.Option value="quality">Quality</Select.Option>
                </Select>
              </Col>
              <Col span={8}>
                <Select
                  value={filters.sortOrder}
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
              <Select.Option value="0">No</Select.Option>
              <Select.Option value="1">Yes</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item label="Grade Accuracy">
            <Select
              value={filters.gradeAccuracy}
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
              value={filters.settername}
              onChange={(e) => updateFilters({ settername: e.target.value })}
            />
          </Form.Item>
        </Form>
      </Drawer>
    </>
  );
};

export default FilterDrawer;
