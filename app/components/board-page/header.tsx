'use client';
import React from 'react';
import { Col, Row, Space, Grid, Button, Dropdown, MenuProps, Avatar } from 'antd';
import { Header } from 'antd/es/layout/layout';
import Title from 'antd/es/typography/Title';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useSession, signIn, signOut } from 'next-auth/react';
import SearchButton from '../search-drawer/search-button';
import ClimbInfoButton from '../climb-info/climb-info-button';
import SearchClimbNameInput from '../search-drawer/search-climb-name-input';
import { UISearchParamsProvider } from '../queue-control/ui-searchparams-provider';
import SendClimbToBoardButton from '../board-bluetooth-control/send-climb-to-board-button';
import { BoardDetails } from '@/app/lib/types';
import { ShareBoardButton } from './share-button';
import { useBoardProvider } from '../board-provider/board-provider-context';
import { UserOutlined, LogoutOutlined, LoginOutlined } from '@ant-design/icons';
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
  const { data: session, status } = useSession();
  const { isAuthenticated, username, logout } = useBoardProvider();

  const handleSignOut = () => {
    signOut();
    logout(); // Also logout from board provider
  };

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      onClick: handleSignOut,
    },
  ];

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
          <Link href="/">
            <Title level={4} style={{ margin: 0, lineHeight: '1.2', cursor: 'pointer' }}>
              BS
            </Title>
          </Link>
        </Col>

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
              {session?.user ? (
                <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
                  <Button icon={<UserOutlined />} type="text">
                    {session.user.name || session.user.email}
                  </Button>
                </Dropdown>
              ) : (
                <Button 
                  icon={<LoginOutlined />} 
                  type="text" 
                  onClick={() => signIn()}
                  size={screens.xs ? 'small' : 'middle'}
                >
                  {screens.xs ? '' : 'Login'}
                </Button>
              )}
            </Space>
          </Col>
        </UISearchParamsProvider>
      </Row>
    </Header>
  );
}
