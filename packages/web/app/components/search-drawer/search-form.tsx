import React from 'react';
import { Tabs } from 'antd';
import { BoardDetails } from '@/app/lib/types';
import BasicSearchForm from './basic-search-form';
import ClimbHoldSearchForm from './climb-hold-search-form';
import { track } from '@vercel/analytics';

interface SearchFormProps {
  boardDetails: BoardDetails;
}

const SearchForm: React.FC<SearchFormProps> = ({ boardDetails }) => {
  const items = [
    {
      key: 'filters',
      label: 'Search',
      children: <BasicSearchForm boardDetails={boardDetails} />,
    },
    {
      key: 'holds',
      label: 'Search by Hold',
      children: <ClimbHoldSearchForm boardDetails={boardDetails} />,
    },
  ];

  return (
    <Tabs
      defaultActiveKey="filters"
      items={items}
      size="small"
      tabBarStyle={{ marginBottom: 12 }}
      onChange={(activeKey) => {
        track('Search Tab Changed', {
          tab: activeKey,
          boardLayout: boardDetails.layout_name || '',
        });
      }}
    />
  );
};

export default SearchForm;
