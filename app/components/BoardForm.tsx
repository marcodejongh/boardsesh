"use client"

import React, { useEffect, useState } from "react";
import { Form, Select, Input, Button, Row, Col, Typography } from "antd";
import Link from "next/link"; // Import Next.js Link
import { defaultLayouts, boardLayouts } from "../lib/board-data";

const { Option } = Select;
const { Title } = Typography;

const BoardForm = () => {
  const [layouts, setLayouts] = useState(defaultLayouts);
  const [sets, setSets] = useState([]);

  const [selectedBoard, setSelectedBoard] = useState<string>("kilter");
  const [selectedLayout, setSelectedLayout] = useState<number>(8);
  const [selectedSize, setSelectedSize] = useState(17);
  const [sizes, setSizes] = useState(boardLayouts[selectedLayout] || []);

  const handleBoardChange = (value: string) => {
    setSelectedBoard(value);
  };

  const onLayoutChange = (value: number) => {
    setSelectedLayout(value);
    setSizes(boardLayouts[value]);
  };
  // TODO: Create nextjs route and fill this in with queries
  return (
    <div style={{ padding: "24px", background: "#f7f7f7", borderRadius: "8px" }}>
      <Title level={4}>Board Settings</Title>
      <Form layout="vertical">
        <Form.Item label="Board">
          <Select value={selectedBoard} onChange={handleBoardChange}>
            <Option value="decoy">Decoy</Option>
            <Option value="grasshopper">Grasshopper</Option>
            <Option value="kilter">Kilter</Option>
            <Option value="tension">Tension</Option>
            <Option value="touchstone">Touchstone</Option>
          </Select>
        </Form.Item>

        <Form.Item label="Layout">
          <Select value={selectedLayout} onChange={onLayoutChange}>
            {layouts.map(([layoutId, layoutName]) => (
              <Option key={layoutId} value={layoutId}>
                {layoutName}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item label="Size">
          <Select value={selectedSize} onChange={(value) => setSelectedSize(value)}>
            {sizes.map(([sizeId, sizeName, sizeDescription]) => (
              <Option key={sizeId} value={sizeId}>
                {`${sizeName} ${sizeDescription}`}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item label="Session ID">
          <Input id="todo-remove-id" placeholder="Session ID" />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Button type="primary" block>
              Join a session
            </Button>
          </Col>
          <Col span={12}>
            {/* Use Next.js's Link component for routing */}
            <Link href={`/${selectedBoard}/${selectedLayout}/${selectedSize}`} passHref>
              <Button type="primary" block>
                Start a session
              </Button>
            </Link>
          </Col>
        </Row>
      </Form>
    </div>
  );
};

export default BoardForm;
