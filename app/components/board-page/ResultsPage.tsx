"use client";
import React, { useEffect, useState } from "react";

import FilterDrawer from "./FilterDrawer";
import HistoryControlBar from "./history-control-bar";
import { Angle, BoardName, BoulderProblem, ClimbUuid, GetBoardDetailsResponse, LayoutId, SearchRequest, Size } from "@/lib/types";
import { Button, Col, Layout, message, Row, Space, Typography } from "antd";
import { SetIds } from "../board/board-data";
import {
  SearchOutlined,
  BulbOutlined,
} from "@ant-design/icons";
import { Footer } from "antd/es/layout/layout";
import Board from "../board/board";
import { fetchResults } from "../rest-api/api";
import { PAGE_LIMIT } from "./constants";
import AngleButton from "./angle-button";
import InfoButton from "./info-button";
import { useSwipeable } from "react-swipeable";

const { Header, Content } = Layout;
const { Title, Text } = Typography;
interface ResultsPageProps {
  board: BoardName;
  layout: LayoutId;
  size: Size;
  set_ids: SetIds;
  climb_uuid: ClimbUuid;
  angle: Angle;
  currentClimb: BoulderProblem;
  results: BoulderProblem[];
  resultsCount: number;
  initialQueryParameters: SearchRequest;
  boardDetails: GetBoardDetailsResponse;
}

const ResultsPage = ({
  board,
  layout,
  size,
  set_ids,
  angle,
  currentClimb: initialClimb,
  results: initialResults,
  resultsCount: initialResultsCount,
  initialQueryParameters,
  boardDetails,
}: ResultsPageProps) => {
  const [results, setResults] = useState(initialResults);
  const [resultsCount, setResultsCount] = useState(initialResultsCount);

  const [currentClimb, setCurrentClimbState] = useState(initialClimb);
  const [queryParameters, setQueryParameters] = useState(initialQueryParameters);
  const [searchChanged, setSearchChanged] = useState(false);
  
  const [pageNumber, setPageNumber] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [ isFetching, setIsFetching ] = useState(false);
  const [ isFetchingMoreProblems, setIsFetchingMoreProblems ] = useState(false);
  
  // Set the current climb and update the URL dynamically
  const setCurrentClimb = (newClimb: BoulderProblem) => {
    // Update the URL dynamically to include the climb_uuid
    setCurrentClimbState(newClimb);
    const newUrl = `/${board}/${layout}/${size}/${set_ids}/${angle}/${newClimb.uuid}`;
    window.history.pushState({}, '', newUrl);
  };
  
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

    const currentIndex = results.findIndex((climb) => climb.uuid === currentClimb.uuid);
    if (currentIndex < results.length - 1) {
      setCurrentClimb(results[currentIndex + 1]);
    } else {
      setCurrentClimb(results[0]);
    }

    // Handle fetching more results if the user is near the end of the current list
    if (currentIndex >= (results.length - PAGE_LIMIT - 5)) {
      fetchMoreClimbs();
      // Fetch more results logic can be triggered here based on page number
    }
  };

  // Function to handle navigation to the previous climb (left arrow)
  const navigateClimbsLeft = () => {
    if (!currentClimb) return;

    const currentIndex = results.findIndex((climb) => climb.uuid === currentClimb.uuid);
    if (currentIndex === -1) {
      setCurrentClimb(results[0]);
    } else {
      setCurrentClimb(results[currentIndex - 1]);
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

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [currentClimb, results]);

  const styles = {
    titleSize: "16px",
    textSize: "12px",
    padding: "0 8px",
  };

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
              layout_id: layout,
              size_id: size,
              set_ids: set_ids,
              angle: angle
            }
          ),
        ]);
        
        // Append results if pageNumber increases, otherwise reset results
        if (pageNumber > 1) {
          setResults((prevResults) => [...prevResults, ...fetchedResults.boulderproblems]);
          setIsFetchingMoreProblems(false);
        } else {
          setResults(fetchedResults.boulderproblems);
          setResultsCount(fetchedResults.totalCount);
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
    if (!isFetching && ((pageNumber * PAGE_LIMIT > results.length && resultsCount > pageNumber * PAGE_LIMIT) || searchChanged)) {
      fetchData();
    }
  }, [isFetching, board, layout, size, set_ids, angle, pageNumber, searchChanged, queryParameters, isFetchingMoreProblems]);
  
  // Swipe event handlers
  const handlers = useSwipeable({
    onSwipedLeft: () => navigateClimbsRight(),
    onSwipedRight: () => navigateClimbsLeft(),
    trackMouse: true, // optional, enables mouse swipe events
  });

  return (
    <>
    <title>{`Boardsesh on ${board}: ${currentClimb.name} ${currentClimb.difficulty} @ ${currentClimb.angle}°`}</title>
     <Layout
      style={{
        height: "100dvh", // Full viewport height
        display: "flex",
        flexDirection: "column", // Vertical layout
        overflow: "hidden", // No scrolling
      }}
    >
      <Header
        style={{
          height: "7dvh", // Fixed height for the header
          background: "#fff",
          padding: "0 16px",
        }}
      >
        <Row justify="space-between" align="middle" style={{ width: "100%" }}>
          <Col xs={6} sm={4} md={4} lg={4} xl={4}>
            {/* Left-aligned buttons */}
            <Space>
              <Button id="button-illuminate" type="default" icon={<BulbOutlined />} />
              <Button type="default" onClick={showDrawer} icon={<SearchOutlined />} />
            </Space>
          </Col>
          
          <Col xs={12} sm={16} md={16} lg={16} xl={16} style={{ textAlign: "center" }}>
            <Title
                level={4}
                style={{
                  margin: 0,
                  lineHeight: "1.2",
                }}
              >
                BoardSesh logo
              </Title>
          </Col>

          <Col xs={6} sm={4} md={4} lg={4} xl={4} style={{ textAlign: "right" }}>
            {/* Right-aligned buttons */}
            <Space>
              <AngleButton angle={angle} layout={layout} board={board} />
              <InfoButton angle={angle} layout={layout} board={board} currentClimb={currentClimb} />
            </Space>
          </Col>
        </Row>
      </Header>



       <Content
        style={{
          height: "70dvh", // Fixed height for the content to leave space for footer
          // display: "flex",
          justifyContent: "center",
          alignItems: "center",
          overflow: "hidden", // Prevent scrolling
        }}
        {...handlers}
      >
       <Row justify="center" align="middle" style={{ width: "100%", height: '8vh', display: 'flex' }}>
        <Col
          xs={24}
          sm={24}
          md={24}
          lg={24}
          xl={24}
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: "center",
            overflow: 'hidden', // Prevent overflow for long titles
          }}
        >
            <>
              <Title
                level={4}
                style={{
                  margin: 0,
                  fontSize: styles.titleSize,
                  lineHeight: "1.2",
                  whiteSpace: "nowrap",
                  overflow: "hidden", // Hide overflow for long titles
                  textOverflow: "ellipsis", // Add ellipsis for long titles
                  width: "100%", // Take up the full width of the flex container
                  maxWidth: "100%", // Ensure it doesn't overflow outside
                }}
              >
                <a
                  href={`https://kilterboardapp.com/climbs/${currentClimb.uuid}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "block",
                    whiteSpace: "nowrap",
                    overflow: "hidden", // Prevent text from overflowing
                    textOverflow: "ellipsis", // Show ellipsis for long titles
                    fontSize: styles.titleSize,
                  }}
                >
                  {currentClimb.name}
                </a>
              </Title>
              <Text
                style={{
                  display: "block",
                  fontSize: styles.textSize,
                  whiteSpace: "nowrap",
                  overflow: "hidden", // Prevent overflow for long setter names
                  textOverflow: "ellipsis",
                }}
              >
                by {currentClimb.setter_username}
              </Text>
              <Text
                style={{
                  display: "block",
                  fontSize: styles.textSize,
                  whiteSpace: "nowrap",
                  overflow: "hidden", // Prevent overflow for other information
                  textOverflow: "ellipsis",
                }}
              >
                {currentClimb.difficulty} {currentClimb.quality_average}★ @ {currentClimb.angle}°
              </Text>
            </>
          
        </Col>
      </Row>

          <Row justify="space-between" align="middle" style={{ width: "100%" }}>
            <Col xs={24} sm={20} md={16} lg={12} xl={8} style={{ textAlign: "center", height: '75dvh' }}>
              <Board
                boardDetails={boardDetails}
                litUpHolds={currentClimb ? currentClimb.frames : ""}
                board={board}
              />
            </Col>
          </Row>
        </Content>
        

       <Footer
        style={{
          height: "10dvh", // Fixed height for the footer (HistoryControlBar)
          padding: 0,
          backgroundColor: "#fff",
        }}
      >

          {currentClimb && (
            <HistoryControlBar
              board={board}
              boardDetails={boardDetails}
              currentClimb={currentClimb}
              navigateClimbsLeft={navigateClimbsLeft}
              navigateClimbsRight={navigateClimbsRight}
            />
          )}
        </Footer>



      {/* Drawer for filter options */}
      <FilterDrawer
        currentClimb={currentClimb}
        handleClimbClick={(climb) => setCurrentClimb(climb)}
        board={board}
        layout={layout}
        climbs={results}
        currentSearchValues={queryParameters}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onApplyFilters={applyFilters}
        angle={angle}
        closeDrawer={closeDrawer}
        resultsCount={resultsCount}
        isFetching={isFetching}
        searchChanged={searchChanged}
        fetchMoreClimbs={fetchMoreClimbs}
      />
    </Layout>
  </>);
};

export default ResultsPage;
