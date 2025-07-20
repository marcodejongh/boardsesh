'use client';
import React from 'react';
import { Col, Row, Space, Grid } from 'antd';
import { Header } from 'antd/es/layout/layout';
import Title from 'antd/es/typography/Title';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import SearchButton from '../search-drawer/search-button';
import ClimbInfoButton from '../climb-info/climb-info-button';
import SearchClimbNameInput from '../search-drawer/search-climb-name-input';
import { UISearchParamsProvider } from '../queue-control/ui-searchparams-provider';
import SendClimbToBoardButton from '../board-bluetooth-control/send-climb-to-board-button';
import { BoardDetails } from '@/app/lib/types';
import { ShareBoardButton } from './share-button';
import AngleSelector from './angle-selector';

const { useBreakpoint } = Grid;

type BoardSeshHeaderProps = {
  boardDetails: BoardDetails;
  angle?: number;
};
export default function BoardSeshHeader({ boardDetails, angle }: BoardSeshHeaderProps) {
  const pathname = usePathname();
  const isList = pathname.endsWith('/list');
  const screens = useBreakpoint();


  return (
    <Header
      style={{
        height: '8dvh',
        background: '#fff',
      }}
    >
      <Row>
        {/* Column for the "BS" logo (25% width) */}
        <Col xs={3} sm={3} md={3} lg={3} xl={3} >
          <Link href="/">
            <Title level={4} align="left" style={{ cursor: 'pointer' }}>
              BS
            </Title>
          </Link>
        </Col>
        <Col xs={1} sm={1} md={1} lg={1} xl={1} ></Col>

        <UISearchParamsProvider>
          <Col xs={14} sm={14} md={14} lg={14} xl={14}>
            <Space>
              {angle !== undefined && <AngleSelector boardName={boardDetails.board_name} currentAngle={angle} />}
              {screens.md ? null : <SearchClimbNameInput />}
              {isList ? <SearchButton boardDetails={boardDetails} /> : null}
            </Space>
          </Col>

          <Col xs={6} sm={6} md={6} lg={6} xl={6} style={{ textAlign: 'right' }}>
            <Space>
              {!isList ? <ClimbInfoButton /> : null}
              <ShareBoardButton />
              <SendClimbToBoardButton boardDetails={boardDetails} />
              {/* {isAuthenticated && username ? (
                <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
                  <Button icon={<UserOutlined />} type="text">
                    {username}
                  </Button>
                </Dropdown>
              ) : null} */}
            </Space>
          </Col>
        </UISearchParamsProvider>
      </Row>
    </Header>
  );
}
