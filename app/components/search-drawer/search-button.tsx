'use client';

import React, { useState } from 'react';
import { Button, Grid, Drawer, Badge, Space, Typography, Spin } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import SearchForm from './search-form';
import { useQueueContext } from '@/app/components/queue-control/queue-context';
import ClearButton from './clear-button';

const { useBreakpoint } = Grid;
const { Text } = Typography;

const SearchButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { totalSearchResultCount, isFetchingClimbs } = useQueueContext();
  const screens = useBreakpoint();

  // Drawer for mobile view
  const mobileDrawer = (
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
        width={'70%'}
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
        <SearchForm />
      </Drawer>
    </>
  );

  // Conditionally render based on screen size
  return screens.md ? null : mobileDrawer;
};

export default SearchButton;
