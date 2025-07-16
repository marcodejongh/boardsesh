'use client';

import React, { useState } from 'react';
import { Button, Drawer, Badge, Space, Typography, Spin } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import SearchForm from './search-form';
import { useQueueContext } from '@/app/components/queue-control/queue-context';
import ClearButton from './clear-button';
import { BoardDetails } from '@/app/lib/types';

const { Text } = Typography;

const SearchButton = ({ boardDetails }: { boardDetails: BoardDetails }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { totalSearchResultCount, isFetchingClimbs } = useQueueContext();

  return (
    <>
      <Badge
        count={totalSearchResultCount}
        overflowCount={9999}
        showZero={totalSearchResultCount !== null}
        color="cyan"
      >
        <Button type="default" icon={<SearchOutlined />} onClick={() => setIsOpen(true)} />
      </Badge>

      <Drawer
        title="Search"
        placement="right"
        width={'90%'}
        open={isOpen}
        onClose={() => setIsOpen(false)}
        footer={
          <Space style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ textAlign: 'left' }}>
              {isFetchingClimbs ? (
                <Spin size="small" />
              ) : (
                <Text type="secondary">Total Results: {totalSearchResultCount}</Text>
              )}
            </div>
            <ClearButton />
          </Space>
        }
      >
        <SearchForm boardDetails={boardDetails} />
      </Drawer>
    </>
  );
};

export default SearchButton;
