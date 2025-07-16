'use client';
import React from 'react';
import { Flex, Space } from 'antd';
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
    <Header
      style={{
        background: '#fff',
        height: '8dvh',
        display: 'flex',
        padding: '0 8px',
      }}
    >
      <Flex justify="flex-start" align="center" gap={1}>
        <UISearchParamsProvider>
          {/* Logo - Fixed to left */}
          <Flex justify="flex-start" align="center">
            <Link href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
              <Title level={4} style={{ margin: 0, lineHeight: '1.2', whiteSpace: 'nowrap' }}>
                BS
              </Title>
            </Link>
          </Flex>

          {/* Flexible content area */}
          <Flex
            justify="flex-start"
            align="center"
            style={{ minWidth: 0, marginLeft: '8px' }}
          >
            {/* Center Section */}
            <Flex justify="flex-start" align="flex-start" gap={1}>
                <div className={styles.mobileOnly}>
                  <SearchClimbNameInput />
                </div>
                <div className={styles.mobileOnly}>
                  <SearchButton boardDetails={boardDetails} />
                </div>
            </Flex>

            {/* Right Section */}
            <Flex gap={1} align="center" justify="flex-end">
              {!isList && (
                <div className={styles.mobileOnly}>
                  <ClimbInfoButton />
                </div>
              )}
              {angle !== undefined && <AngleSelector boardName={boardDetails.board_name} currentAngle={angle} />}
              <ShareBoardButton />
              <SendClimbToBoardButton boardDetails={boardDetails} />
            </Flex>
          </Flex>
        </UISearchParamsProvider>
      </Flex>
      
    </Header>
  );
}
