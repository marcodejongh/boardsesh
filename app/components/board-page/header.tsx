'use client';
import React from 'react';
import { Space, Row, Col } from 'antd';
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
import styles from './header.module.css';

type BoardSeshHeaderProps = {
  boardDetails: BoardDetails;
  angle?: number;
};
export default function BoardSeshHeader({ boardDetails, angle }: BoardSeshHeaderProps) {
  const pathname = usePathname();
  const isList = pathname.endsWith('/list');

  return (
    <Header style={{ background: '#fff', height: '8dvh' }} className={styles.header}>
      <UISearchParamsProvider>
        <Row align="middle" style={{ height: '100%', paddingLeft: '16px', paddingRight: '16px' }} wrap={false}>
          {/* Spacer */}
          <Col span={1}>
            <div style={{ width: '100%' }}>&nbsp;</div>
          </Col>
          
          {/* Logo */}
          <Col style={{ marginLeft: 0, paddingLeft: 0 }}>
            <Link href="/" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
              <Title level={4} style={{ margin: 0, lineHeight: '1.2', whiteSpace: 'nowrap', paddingLeft: 0 }}>
                BS
              </Title>
            </Link>
          </Col>

          {/* Center Section */}
          <Col flex="1" style={{ textAlign: 'center', minWidth: 0 }}>
            <Space size={8}>
              <div className={styles.mobileOnly}>
                <SearchClimbNameInput />
              </div>
              {isList && (
                <div className={styles.mobileOnly}>
                  <SearchButton boardDetails={boardDetails} />
                </div>
              )}
            </Space>
          </Col>

          {/* Right Section */}
          <Col>
            <Space size={4}>
              {!isList && (
                <div className={styles.mobileOnly}>
                  <ClimbInfoButton />
                </div>
              )}
              {angle !== undefined && <AngleSelector boardName={boardDetails.board_name} currentAngle={angle} />}
              <ShareBoardButton />
              <SendClimbToBoardButton boardDetails={boardDetails} />
            </Space>
          </Col>
        </Row>
      </UISearchParamsProvider>
    </Header>
  );
}
