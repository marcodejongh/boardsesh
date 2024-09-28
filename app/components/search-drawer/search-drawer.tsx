'use client';

import React from "react";
import SearchForm from "./search-form";
import { Grid } from "antd";


const { useBreakpoint } = Grid;

const FilterColumn = () => {
  const screens = useBreakpoint();

  // Sidebar for desktop view
  const desktopSidebar = (
    <SearchForm />
  );

  // Conditionally render based on screen size
  return screens.md ? desktopSidebar : null;
};

export default FilterColumn;
