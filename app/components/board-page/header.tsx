'use client';
import React from 'react';
import { Flex } from 'antd';
import { Header } from 'antd/es/layout/layout';
import Title from 'antd/es/typography/Title';
import Link from 'next/link';
import SearchButton from '../search-drawer/search-button';
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
  return (
    <Header
      style={{
        background: '#fff',
        height: '8dvh',
        display: 'flex',
        padding: '0 4px',
      }}
    >
      <UISearchParamsProvider>
        <Flex justify="space-between" align="center" style={{ width: '100%' }} gap={7}> 
          {/* Logo - Fixed to left */}
          <Flex>
              <Title level={4} style={{ margin: 0, lineHeight: '1.2', whiteSpace: 'nowrap' }}>
                <Link href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
                  BS
                </Link>
              </Title>
            </Flex>   
            
            

          {/* Center Section - Mobile only */}
          <Flex justify="center" gap={2}>
            <div className={styles.mobileOnly}>
              <SearchClimbNameInput />
            </div>
            <div className={styles.mobileOnly}>
              <SearchButton boardDetails={boardDetails} />
            </div>
          </Flex>

          {/* Right Section */}
          <Flex gap={4} align="center">
            
            {angle !== undefined && <AngleSelector boardName={boardDetails.board_name} currentAngle={angle} />}
            <ShareBoardButton />
            <SendClimbToBoardButton boardDetails={boardDetails} />
          </Flex>
        </Flex>
      </UISearchParamsProvider>
      
    </Header>
  );
}
