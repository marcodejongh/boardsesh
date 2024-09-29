'use client';

import React, { useState } from "react";
import { Button, Grid, Drawer } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import SearchForm from "./search-form";

const { useBreakpoint } = Grid;

const FilterColumn = () => {
  const [isOpen, setIsOpen] = useState(false);
  const screens = useBreakpoint();

  // Drawer for mobile view
  const mobileDrawer = (
    <>
      <Button type="default" icon={<SearchOutlined />} onClick={() => setIsOpen(true)} />
      <Drawer
        title="Search"
        placement="right"
        width={"80%"}
        open={isOpen}
        onClose={() => setIsOpen(false)}
      >
        <SearchForm />
      </Drawer>
    </>
  );

  // Conditionally render based on screen size
  return screens.md ? null : mobileDrawer;
};

export default FilterColumn;
