'use client';

import React from 'react';
import { Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useUISearchParams } from '../queue-control/ui-searchparams-provider';
import { themeTokens } from '@/app/theme/theme-config';

const SearchClimbNameInput = () => {
  const { uiSearchParams, updateFilters } = useUISearchParams();

  return (
    <Input
      placeholder="Search by climb name..."
      prefix={<SearchOutlined style={{ color: themeTokens.neutral[400] }} />}
      allowClear
      onChange={(e) => {
        updateFilters({
          name: e.target.value,
        });
      }}
      value={uiSearchParams.name}
    />
  );
};

export default SearchClimbNameInput;
