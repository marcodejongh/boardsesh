'use client';

import React from 'react';
import SearchForm from './search-form';
import { Grid } from 'antd';
import { UISearchParamsProvider } from '../queue-control/ui-searchparams-provider';
import { BoardDetails } from '@/app/lib/types';

const { useBreakpoint } = Grid;

const FilterColumn = ({ boardDetails }: { boardDetails: BoardDetails }) => {
  const screens = useBreakpoint();

  // Sidebar for desktop view
  const desktopSidebar = (
    <UISearchParamsProvider>
      <SearchForm boardDetails={boardDetails} />
    </UISearchParamsProvider>
  );

  // Conditionally render based on screen size
  return screens.md ? desktopSidebar : null;
};

export default FilterColumn;
