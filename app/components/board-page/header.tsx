"use client";
import React from 'react';
import { Col, Row, Space, Grid } from "antd";
import { Header } from "antd/es/layout/layout";
import Title from "antd/es/typography/Title";
import { usePathname } from "next/navigation";
import SearchButton from "../search-drawer/search-button";
import ClimbInfoButton from "../climb-info/climb-info-button";
import SearchClimbNameInput from '../search-drawer/search-climb-name-input';
import { UISearchParamsProvider } from '../queue-control/ui-searchparams-provider';
import SendClimbToBoardButton from '../board-bluetooth-control/send-climb-to-board-button';
import { BoardDetails } from '@/app/lib/types';


const { useBreakpoint } = Grid;

type BoardSeshHeaderProps = {
  boardDetails: BoardDetails;
}
export default function BoardSeshHeader({ boardDetails }: BoardSeshHeaderProps) {
  const pathname = usePathname();
  const isList = pathname.endsWith('/list');
  const screens = useBreakpoint();
  
  return (
    <Header
      style={{
        height: "8dvh", 
        background: "#fff", 
        padding: "0 16px"
      }}
    >
      <Row justify="space-between" align="middle" style={{ width: "100%" }}>
        
        {/* Column for the "BS" logo (25% width) */}
        <Col xs={6} sm={6} md={6} lg={6} xl={6}>
          <Title level={4} style={{ margin: 0, lineHeight: "1.2" }}>
            BS
          </Title>
        </Col>
        
        <UISearchParamsProvider>
          <Col xs={12} sm={12} md={12} lg={12} xl={12}>
            { screens.md ? null : <SearchClimbNameInput /> }
          </Col>

          <Col xs={6} sm={6} md={6} lg={6} xl={6} style={{ textAlign: "right" }}>
            <Space>
              <SendClimbToBoardButton boardDetails={boardDetails} />
              {isList ? <SearchButton /> : null}
              {!isList ? <ClimbInfoButton /> : null}
              
            </Space>
          </Col>
        </UISearchParamsProvider>
      </Row>
    </Header>
  );
}

