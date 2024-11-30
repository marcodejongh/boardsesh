'use client';
import React from 'react';
import { Col, Row, Space, Grid } from 'antd';
import { Header } from 'antd/es/layout/layout';
import Title from 'antd/es/typography/Title';
import { usePathname } from 'next/navigation';
import SearchButton from '../search-drawer/search-button';
import ClimbInfoButton from '../climb-info/climb-info-button';
import SearchClimbNameInput from '../search-drawer/search-climb-name-input';
import { UISearchParamsProvider } from '../queue-control/ui-searchparams-provider';
import SendClimbToBoardButton from '../board-bluetooth-control/send-climb-to-board-button';
import { BoardDetails } from '@/app/lib/types';
import { ShareBoardButton } from './share-button';

const { useBreakpoint } = Grid;

type BoardSeshHeaderProps = {
  boardDetails: BoardDetails;
};
export default function BoardSeshHeader({ boardDetails }: BoardSeshHeaderProps) {
  const pathname = usePathname();
  const isList = pathname.endsWith('/list');
  const screens = useBreakpoint();

  return (
    <Header
      style={{
        height: '8dvh',
        background: '#fff',
        padding: '0 16px',
      }}
    >
      <Row justify="space-between" align="middle" style={{ width: '100%' }}>
        {/* Column for the "BS" logo (25% width) */}
        <Col xs={4} sm={4} md={4} lg={4} xl={4}>
          <Title level={4} style={{ margin: 0, lineHeight: '1.2' }}>
            BS
          </Title>
        </Col>

        <UISearchParamsProvider>
          <Col xs={14} sm={14} md={14} lg={14} xl={14}>
            <Space>
              {screens.md ? null : <SearchClimbNameInput />}
              {isList ? <SearchButton /> : null}
            </Space>
          </Col>

          <Col xs={6} sm={6} md={6} lg={6} xl={6} style={{ textAlign: 'right' }}>
            <Space>
              {!isList ? <ClimbInfoButton /> : null}
              <ShareBoardButton />
              <SendClimbToBoardButton boardDetails={boardDetails} />
            </Space>
          </Col>
        </UISearchParamsProvider>
      </Row>
    </Header>
  );
}
