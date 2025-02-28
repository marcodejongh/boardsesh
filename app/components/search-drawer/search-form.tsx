import React from 'react';
import { Tabs } from 'antd';
import { BoardDetails } from '@/app/lib/types';
import BasicSearchForm from './basic-search-form';
import ClimbHoldSearchForm from './climb-hold-search-form';

interface SearchFormProps {
  boardDetails: BoardDetails;
}

const SearchForm: React.FC<SearchFormProps> = ({ boardDetails }) => {
  const items = [
    {
      key: 'filters',
      label: 'Filters',
      children: <BasicSearchForm />
    },
    {
      key: 'holds',
      label: 'Search by Hold',
      children: <ClimbHoldSearchForm boardDetails={boardDetails} />
    }
  ];

  return <Tabs defaultActiveKey="filters" items={items} />;
};

export default SearchForm;
