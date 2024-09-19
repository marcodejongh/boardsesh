"use client";
import React, { useEffect, useState } from "react";

import FilterDrawer from "./FilterDrawer";
import FloatingBar from "./floating-bar";
import { Angle, Board, BoulderProblem, ClimbUuid, GetBoardDetailsResponse, LayoutId, SearchRequest, Size } from "@/lib/types";
import { Button, Col, Layout, message, Row, Space, Typography } from "antd";
import { SetIds } from "../kilter-board/board-data";
import {
  SearchOutlined,
  BulbOutlined,
} from "@ant-design/icons";
import { Footer } from "antd/es/layout/layout";
import KilterBoard from "../kilter-board/KilterBoard";
import { fetchResults } from "../rest-api/api";
import { PAGE_LIMIT } from "./constants";
import AngleButton from "./angle-button";
import InfoButton from "./info-button";
import { useSwipeable } from "react-swipeable";

const { Header, Content } = Layout;
const { Title, Text } = Typography;
interface ResultsPageProps {
  board: Board;
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
    <Layout style={{ height: "100vh" }}>
      <Header
          style={{
            background: "#fff",
            // padding: styles.padding,
            display: "flex",
            alignItems: "center",
            height: '10vh'
          }}
        >
          <Row justify="space-between" align="middle" style={{ width: "100%" }}>
            {currentClimb && (
              <>
                <Col>
                  <Space>
                    <Button id="button-illuminate" type="default" icon={<BulbOutlined />} />
                    <Button type="default" onClick={showDrawer} icon={<SearchOutlined />} />
                  </Space>
                </Col>
                <Col flex="auto" style={{ textAlign: "center" }}>
                  <Title
                    level={4}
                    style={{
                      margin: 0,
                      fontSize: styles.titleSize,
                      lineHeight: "1.2",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    <a
                      href={`https://kilterboardapp.com/climbs/${currentClimb.uuid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "block",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
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
                      overflow: "hidden",
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
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {currentClimb.difficulty} {currentClimb.quality_average}★ at {currentClimb.angle}°
                  </Text>
                </Col>
                <Col>
                  <Space>
                     {/* {currentClimb && peerId && (
                      <ShareBoardButton peerId={peerId} hostId={hostId} pathname={pathname} search={search} />
                    )} */}
                      <AngleButton angle={angle} layout={layout} board={board} />
                      <InfoButton angle={angle} layout={layout} board={board} currentClimb={currentClimb} />
                  </Space>
                </Col>
              </>
            )}
          </Row>
        </Header>


      <Content style={{ display: "flex", backgroundColor: 'white', height: '70vh', justifyContent: "center", alignItems: "center" }} {...handlers}>
        {/* Render the KilterBoard */}
        <KilterBoard
          editEnabled={false}
          boardDetails={boardDetails}
          litUpHolds={currentClimb ? currentClimb.frames : ""}
          board={board}
        />

        
      </Content>
      <Footer style={{height: '20vh', padding: '0'}}>
        {/* Floating bar to navigate between climbs */}
        {currentClimb && (
          <FloatingBar
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
