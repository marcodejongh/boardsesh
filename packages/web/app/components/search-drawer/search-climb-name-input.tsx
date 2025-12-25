'use client';

import React, { useRef } from 'react';
import { Input, InputRef } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useUISearchParams } from '../queue-control/ui-searchparams-provider';

interface SearchClimbNameInputProps {
  onFocus?: () => void;
  onBlur?: () => void;
  inputRef?: React.RefObject<InputRef | null>;
}

const SearchClimbNameInput = ({ onFocus, onBlur, inputRef }: SearchClimbNameInputProps) => {
  const { uiSearchParams, updateFilters } = useUISearchParams();
  const localRef = useRef<InputRef>(null);
  const ref = inputRef || localRef;

  return (
    <Input
      ref={ref}
      placeholder="Search by climb name..."
      prefix={<SearchOutlined style={{ color: '#9CA3AF' }} />}
      allowClear
      onChange={(e) => {
        updateFilters({
          name: e.target.value,
        });
      }}
      value={uiSearchParams.name}
      onFocus={onFocus}
      onBlur={onBlur}
    />
  );
};

export default SearchClimbNameInput;
