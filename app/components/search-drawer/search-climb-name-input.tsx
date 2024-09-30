'use client';

import React from "react";
import { Input } from "antd";
import { useUISearchParams } from "../queue-control/ui-searchparams-provider";


const SearchClimbNameInput = () => {
  const { uiSearchParams, updateFilters } = useUISearchParams();

  // Drawer for mobile view
  return (
    <>
      <Input
        placeholder="Filter climbs..."
        style={{ width: "100%" }}
        onChange={(e) => {
          updateFilters({
            name: e.target.value
          });
        }}
        value={uiSearchParams.name}
      />
    </>
  );
};

export default SearchClimbNameInput;
