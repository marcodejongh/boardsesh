"use client";
import { ParsedBoardRouteParameters } from "@/app/lib/types";
import { Col, Row, Space } from "antd";
import { BulbOutlined } from "@ant-design/icons";
import AngleButton from "@/app/components/board-page/angle-button";
import InfoButton from "@/app/components/board-page/info-button";

import { Header } from "antd/es/layout/layout";
import Title from "antd/es/typography/Title";
import BackToClimbList from "@/app/components/board-page/back-to-climb-list-button";
import FilterDrawer from "@/app/components/filter-drawer/filter-drawer";
import { usePathname } from "next/navigation";

interface HeaderProps {
  params: ParsedBoardRouteParameters;
}


export default function BoardSeshHeader(props: HeaderProps) {
  const pathname = usePathname();
  const { params } = props;
  const isList = pathname.endsWith('/list');

  return (
    <>
      <Header
        style={{
          height: "8dvh", 
          background: "#fff", 
          padding: "0 16px"
        }}
      >
        <Row justify="space-between" align="middle" style={{ width: "100%" }}>
          <Col xs={6} sm={4} md={4} lg={4} xl={4}>
            <Space>
              {isList ? <FilterDrawer routeParams={params} /> : <BackToClimbList {...params}/>}
            </Space>
          </Col>

          <Col xs={12} sm={16} md={16} lg={16} xl={16} style={{ textAlign: "center" }}>
            <Title level={4} style={{ margin: 0, lineHeight: "1.2" }}>
              BS
            </Title>
          </Col>

          <Col xs={6} sm={4} md={4} lg={4} xl={4} style={{ textAlign: "right" }}>
            <Space>
              <AngleButton angle={params.angle} layout={params.layout_id} board={params.board_name} />
              <InfoButton angle={params.angle} layout={params.layout_id} board={params.board_name} currentClimb={null} />
            </Space>
          </Col>
        </Row>
      </Header>
    </>
  );
}
