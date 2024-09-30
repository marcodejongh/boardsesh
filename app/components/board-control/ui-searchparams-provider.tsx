import React, { createContext, useContext, useState } from "react";
import { SearchRequestPagination } from "@/lib/types";
import { useDebouncedCallback } from "use-debounce";
import { useQueueContext } from "./queue-context";
import { DEFAULT_SEARCH_PARAMS } from "@/app/lib/url-utils";

interface UISearchParamsContextType {
  uiSearchParams: SearchRequestPagination;
  updateFilters: (newFilters: Partial<SearchRequestPagination>) => void;
  clearClimbSearchParams: () => void;
}

const UISearchParamsContext = createContext<UISearchParamsContextType | undefined>(undefined);

/**
 * We maintain a copy of the search params so that the UI can update without hammering the rest-api.
 * Updating the state that affects the actual search is then debounced.
 */
export const UISearchParamsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { climbSearchParams, setClimbSearchParams } = useQueueContext();
  const [uiSearchParams, setUISearchParams] = useState<SearchRequestPagination>(climbSearchParams);

  const debouncedUpdate = useDebouncedCallback(() => {
    setClimbSearchParams(uiSearchParams);
  }, 500);

  const updateFilters = (newFilters: Partial<SearchRequestPagination>, instant?: boolean) => {
    const updatedFilters = {
      ...uiSearchParams,
      ...newFilters,
      page: 0, // Reset to page 0 when filters are updated
    };

    setUISearchParams(updatedFilters);

    if (instant) {
      setClimbSearchParams(updatedFilters);
    } else {
      debouncedUpdate();
    }
    
  };

  const clearClimbSearchParams = () => updateFilters(DEFAULT_SEARCH_PARAMS, true)

  return (
    <UISearchParamsContext.Provider value={{ uiSearchParams, updateFilters, clearClimbSearchParams }}>
      {children}
    </UISearchParamsContext.Provider>
  );
};

// Custom hook for consuming the context
export const useUISearchParams = () => {
  const context = useContext(UISearchParamsContext);
  if (!context) {
    throw new Error("useUISearchParams must be used within a SearchParamsProvider");
  }
  return context;
};
