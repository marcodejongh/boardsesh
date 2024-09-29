import React from 'react';

import { PropsWithChildren } from "react";

import SearchColumn from "@/app/components/search-drawer/search-drawer";
import Col from "antd/es/col";
import { Content } from "antd/es/layout/layout";
import Row from "antd/es/row";

interface LayoutProps {}

export default function ListLayout ({ children }: PropsWithChildren<LayoutProps>)  {
  return (
    <Row gutter={16}>
      <Col xs={24} md={16}>
        <Content>
          {children}
        </Content>
      </Col>
      <Col xs={24} md={8} style={{ marginBottom: "16px" }}>
        <SearchColumn />
      </Col>
    </Row>
  )
}