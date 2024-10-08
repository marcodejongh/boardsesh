'use client';

import React from 'react';
import SearchForm from './search-form';
import { Grid } from 'antd';
import { UISearchParamsProvider } from '../queue-control/ui-searchparams-provider';

const { useBreakpoint } = Grid;

const FilterColumn = () => {
  const screens = useBreakpoint();

  // Sidebar for desktop view
  const desktopSidebar = (
    <UISearchParamsProvider>
      <SearchForm />
    </UISearchParamsProvider>
  );

  // Conditionally render based on screen size
  return screens.md ? desktopSidebar : null;
};

export default FilterColumn;
