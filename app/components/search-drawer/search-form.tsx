import React from 'react';
import { Tabs } from 'antd';
import { BoardDetails } from '@/app/lib/types';
import BasicSearchForm from './basic-search-form';
import ClimbHoldSearchForm from './climb-hold-search-form';

const { TabPane } = Tabs;

interface SearchFormProps {
  boardDetails: BoardDetails;
}

const SearchForm: React.FC<SearchFormProps> = ({ boardDetails }) => {
  return (
    <Tabs defaultActiveKey="filters">
      <TabPane tab="Filters" key="filters">
        <BasicSearchForm />
      </TabPane>
      <TabPane tab="Search by Hold" key="holds">
        <ClimbHoldSearchForm boardDetails={boardDetails} />
      </TabPane>
    </Tabs>
  );
};

export default SearchForm;
