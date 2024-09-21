"use client";
import React, { useEffect, useState } from "react";

import FilterDrawer from "./FilterDrawer";
import { Angle, BoardName, BoulderProblem, GetBoardDetailsResponse, LayoutId, SearchRequest, Size as SizeId } from "@/lib/types";
import { Button } from "antd";
import { SetIdList } from "../board/board-data";
import {
  SearchOutlined,
} from "@ant-design/icons";
import { fetchResults } from "../rest-api/api";
import { PAGE_LIMIT } from "./constants";

// Example query parameters
const defaultQueryParameters: SearchRequest = {
  minGrade: 10,
  maxGrade: 33,
  name: "",
  minAscents: 1,
  sortBy: "ascents",
  sortOrder: "desc",
  minRating: 1.0,
  onlyClassics: false,
  gradeAccuracy: 1,
  settername: "",
  setternameSuggestion: "",
  holds: "",
  mirroredHolds: "",
};

interface ResultsPageProps {
  board: BoardName;
  layoutId: LayoutId;
  sizeId: SizeId;
  setIdList: SetIdList;
  angle: Angle;
  currentClimb: BoulderProblem;
  results: BoulderProblem[];
  resultsCount: number;
  initialQueryParameters: SearchRequest;
  boardDetails: GetBoardDetailsResponse;
  setCurrentClimbState: (boulderProblem: BoulderProblem) => void;
}

const FilterButton = ({
  board,
  layoutId,
  sizeId,
  setIdList,
  angle,
  currentClimb,
  results: initialResults,
  resultsCount: initialResultsCount,
  initialQueryParameters,
  boardDetails,
  setCurrentClimbState
}: ResultsPageProps) => {
  initialResults = initialResults || [];
  initialQueryParameters = initialQueryParameters || defaultQueryParameters;
    // Set the current climb by updating the URL dynamically
  const setCurrentClimb = (newClimb: BoulderProblem) => {
    // Update the URL dynamically to include the climb_uuid
    setCurrentClimbState(newClimb);
    const newUrl = `/${board}/${layoutId}/${sizeId}/${setIdList}/${angle}/${newClimb.uuid}`;
    window.history.pushState({}, '', newUrl);
  };

  const [climbSearchResults, setClimbSearchResults] = useState(initialResults);
  const [climbSearchTotalCount, setClimbSearchTotalCount] = useState(initialResultsCount);

  const [queryParameters, setQueryParameters] = useState(initialQueryParameters);
  const [searchChanged, setSearchChanged] = useState(false);
  
  const [pageNumber, setPageNumber] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [ isFetching, setIsFetching ] = useState(false);
  const [ isFetchingMoreProblems, setIsFetchingMoreProblems ] = useState(false);
  
  
  const fetchMoreClimbs = () => {
    if (!isFetchingMoreProblems) {
      setPageNumber((prevPageNumber) => {
        setIsFetchingMoreProblems(true);
        return prevPageNumber + 1;
      });
    }
  }

  const applyFilters = (filters: SearchRequest) => {
    setQueryParameters(() => {
      const updatedParams = filters;
      setSearchChanged(true); 
      return updatedParams;
    });
  };

  // Function to handle navigation to the next climb (right arrow)
  const navigateClimbsRight = () => {
    if (!currentClimb) return;

    const currentIndex = climbSearchResults.findIndex((climb) => climb.uuid === currentClimb.uuid);
    if (currentIndex < climbSearchResults.length - 1) {
      setCurrentClimb(climbSearchResults[currentIndex + 1]);
    } else {
      setCurrentClimb(climbSearchResults[0]);
    }

    // Handle fetching more results if the user is near the end of the current list
    if (currentIndex >= (climbSearchResults.length - PAGE_LIMIT - 5)) {
      fetchMoreClimbs();
      // Fetch more results logic can be triggered here based on page number
    }
  };

  // Function to handle navigation to the previous climb (left arrow)
  const navigateClimbsLeft = () => {
    if (!currentClimb) return;

    const currentIndex = climbSearchResults.findIndex((climb) => climb.uuid === currentClimb.uuid);
    if (currentIndex === -1) {
      setCurrentClimb(climbSearchResults[0]);
    } else {
      setCurrentClimb(climbSearchResults[currentIndex - 1]);
    }
  };
  
    // Keyboard event listener
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        navigateClimbsLeft();
      } else if (event.key === "ArrowRight") {
        navigateClimbsRight();
      }
    };

    window.addEventListener("keyup", handleKeyDown);

    return () => {
      window.removeEventListener("keyup", handleKeyDown);
    };
  }, [currentClimb, climbSearchResults]);

  const showDrawer = () => {
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
  };
  
  useEffect(() => {
    const fetchData = async () => {
      setIsFetching(true);
      try {
        const [fetchedResults] = await Promise.all([
          fetchResults(
            pageNumber,
            PAGE_LIMIT,
            queryParameters,
            {
              board_name: board,
              layout_id: layoutId,
              size_id: sizeId,
              set_ids: setIdList,
              angle: angle
            }
          ),
        ]);
        
        // Append results if pageNumber increases, otherwise reset results
        if (pageNumber > 1) {
          setClimbSearchResults((prevResults) => [...prevResults, ...fetchedResults.boulderproblems]);
          setIsFetchingMoreProblems(false);
        } else {
          setClimbSearchResults(fetchedResults.boulderproblems);
          setClimbSearchTotalCount(fetchedResults.totalCount);
        }
        if(searchChanged) {
          setSearchChanged(false);
          setPageNumber(1);
        }
        setIsFetching(false);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    if (!isFetching && ((pageNumber * PAGE_LIMIT > climbSearchResults.length && climbSearchTotalCount > pageNumber * PAGE_LIMIT) || searchChanged)) {
      fetchData();
    }
  }, [isFetching, board, layoutId, sizeId, setIdList, angle, pageNumber, searchChanged, queryParameters, isFetchingMoreProblems]);
  
  // // Swipe event handlers
  // const handlers = useSwipeable({
  //   onSwipedLeft: () => navigateClimbsRight(),
  //   onSwipedRight: () => navigateClimbsLeft(),
  //   trackMouse: true, // optional, enables mouse swipe events
  // });

  return (
    <>
    <Button type="default" onClick={showDrawer} icon={<SearchOutlined />} />
    <FilterDrawer
      currentClimb={currentClimb}
      handleClimbClick={(climb) => setCurrentClimb(climb)}
      board={board}
      layout={layoutId}
      climbs={climbSearchResults}
      currentSearchValues={queryParameters}
      open={drawerOpen}
      onClose={() => setDrawerOpen(false)}
      onApplyFilters={applyFilters}
      angle={angle}
      closeDrawer={closeDrawer}
      resultsCount={climbSearchTotalCount}
      isFetching={isFetching}
      searchChanged={searchChanged}
      fetchMoreClimbs={fetchMoreClimbs}
      boardDetails={boardDetails}

    
    />
  </>);
};

export default FilterButton;
