"use client" //TODO: Refactor useEffects so this page can SSR
import React, { useEffect, useState, useContext } from "react";
import { PeerContext } from "../connection-manager/PeerProvider";
import {
  SearchOutlined,
  BulbOutlined,
  InstagramOutlined,
} from "@ant-design/icons";
import { Button, Badge, Typography, Space, Layout, Row, Col } from "antd";
import { fetchResults } from "../rest-api/api";
import KilterBoardLoader from "../kilter-board/loader";
import { getSetIds } from "../kilter-board/board-data";
import FilterDrawer from "./FilterDrawer";
import { useSwipeable } from "react-swipeable";
import { PAGE_LIMIT } from "./constants";
import { ShareBoardButton } from "./share-button";
import { BoulderProblem, SearchRequest } from "@/lib/types";
import FloatingBar from "./floating-bar";
import { ResultPageProps } from "./types";
 
const { Title, Text } = Typography;
const { Header, Content } = Layout;

const ResultsPage = ({
  board,
  layout,
  size,
  hostId,
  pathname,
  search
}: ResultPageProps) => {
  const set_ids = getSetIds(layout, size);
  
  const [queryParameters, setQueryParameters] = useState<SearchRequest>({
    minGrade: 10,
    maxGrade: 33,
    name: "",
    angle: 40,
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
  });

  const [results, setResults] = useState<BoulderProblem[]>([]);
  const [resultsCount, setResultsCount] = useState<number>(9999);
  const [currentClimb, setCurrentClimbState] = useState<BoulderProblem>();
  const [pageNumber, setPageNumber] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [hasConnected, setHasConnected] = useState(false);

  const setCurrentClimb = (newClimb: BoulderProblem) => {
    setCurrentClimbState(newClimb);
    sendData && sendData({
      type: "set-current-climb",
      data: newClimb,
    });
  }

  const peerContext = useContext(PeerContext);
  const readyToConnect = peerContext?.readyToConnect;
  const receivedData = peerContext?.receivedData;
  const sendData = peerContext?.sendData;
  const connectToPeer = peerContext?.connectToPeer;
  const peerId = peerContext?.peerId;

  useEffect(() => {
    if (receivedData) {
      console.log("New data received:", receivedData);
      if (receivedData && receivedData.type && receivedData.type === "set-current-climb") {
        setCurrentClimbState((receivedData.data as BoulderProblem));
      }
      // Handle the received data
    }
  }, [receivedData]);

  useEffect(() => {
    if (connectToPeer && readyToConnect && hostId && !hasConnected) {
      connectToPeer(hostId);
      setHasConnected(true)
    }
  }, [hostId, readyToConnect, connectToPeer, hasConnected]);

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

  const applyFilters = (filters: SearchRequest) => {
    setPageNumber(0);
    setQueryParameters(filters);
  };

  useEffect(() => {
    const fetchData = async () => {
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
            }
          ),

        ]);

        // Append results if pageNumber increases, otherwise reset results
        if (pageNumber > 0) {
          setResults((prevResults) => [...prevResults, ...fetchedResults.rows]);
          setResultsCount(fetchedResults.totalCount);
        } else {
          setResults(fetchedResults.rows);
          setResultsCount(fetchedResults.totalCount);
        }

        if (!currentClimb && fetchedResults.rows.length > 0) {
          setCurrentClimb(fetchedResults.rows[0]);
          setResultsCount(fetchedResults.totalCount);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, [board, layout, size, queryParameters, pageNumber]);

  const handleClimbClick = (climb: BoulderProblem) => {
    setCurrentClimb(climb);
    closeDrawer();
  };

  const navigateClimbsLeft = () => {
    if (!currentClimb) {
      return;
    }
    const currentIndex = results.findIndex((climb: BoulderProblem) => climb.uuid === currentClimb.uuid);
    if (currentIndex > 0) {
      setCurrentClimb(results[currentIndex - 1]);
    }
  };

  const navigateClimbsRight = () => {
    if (!currentClimb) {
      return;
    }

    const currentIndex = results.findIndex((climb: BoulderProblem) => climb.uuid === currentClimb.uuid);

    if (currentIndex > results.length - 10) {
      setPageNumber(pageNumber + 1);
    }
    if (currentIndex < results.length - 1) {
      setCurrentClimb(results[currentIndex + 1]);
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

  // Swipe event handlers
  const handlers = useSwipeable({
    onSwipedLeft: () => navigateClimbsRight(),
    onSwipedRight: () => navigateClimbsLeft(),
    trackMouse: true, // optional, enables mouse swipe events
  });

  return (
    <Layout style={{ height: "100vh" }} {...handlers}>
        <Header
          style={{
            background: "#fff",
            // padding: styles.padding,
            display: "flex",
            alignItems: "center",
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
                     {currentClimb && peerId && hostId && (
                      <ShareBoardButton peerId={peerId} hostId={hostId} pathname={pathname} search={search} />
                    )}
                    <Badge count={10} offset={[-5, 5]}>
                      <Button
                        id="anchor-beta"
                        type="default"
                        href="/kilter/beta/A0BC2661C68B4B00A5CDF2271CEAF246/"
                        icon={<InstagramOutlined />}
                      />
                    </Badge>
                  </Space>
                </Col>
              </>
            )}
          </Row>
        </Header>

        <Content
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "50vh",
            backgroundColor: "#FFF",
          }}
        >
          <KilterBoardLoader 
            board={board}
            layout={layout}
            size={size}
            litUpHolds={currentClimb ? currentClimb.frames : ''} />
          {currentClimb && (
            <FloatingBar
              currentClimb={currentClimb}
              navigateClimbsLeft={navigateClimbsLeft}
              navigateClimbsRight={navigateClimbsRight}
              board={board} 
              layout={layout}
              size={size}
          />)}
          
        </Content>
      
      <FilterDrawer
        currentClimb={currentClimb}
        handleClimbClick={handleClimbClick}
        board={board}
        layout={layout}
        climbs={results}
        currentSearchValues={queryParameters}
        open={drawerOpen}
        onClose={closeDrawer}
        onApplyFilters={applyFilters}
        resultsCount={resultsCount}
      />
    </Layout>
  );
};

export default ResultsPage;
