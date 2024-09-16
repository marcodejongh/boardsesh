"use client"
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
import { boardLayouts } from "../kilter-board/board-data";
import FilterDrawer from "./FilterDrawer";
import { useSwipeable } from "react-swipeable";
import { PAGE_LIMIT } from "./constants";
import { ShareBoardButton } from "./share-button";
import { BoulderProblem, SearchRequest } from "../rest-api/types";
import FloatingBar from "./floating-bar";
 
const { Title, Text } = Typography;
const { Header, Content } = Layout;

type ResultPageProps = {
  board: string;
  layout: string;
  size: string;
  hostId?: string;
  pathname: string;
  search: string;
}

const ResultsPage = ({
  board,
  layout,
  size,
  hostId,
  pathname,
  search
}: ResultPageProps) => {
  const set_ids = (boardLayouts[layout]?.find(([sizeId]) => sizeId == size) || [])[3] || "";

  const [queryParameters, setQueryParameters] = useState<Partial<SearchRequest>>({
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

  const [results, setResults] = useState([]);
  const [currentClimb, setCurrentClimbState] = useState<BoulderProblem>();
  const [pageNumber, setPageNumber] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [viewportWidth, setViewportWidth] = useState();
  const [hasConnected, setHasConnected] = useState(false);

  const setCurrentClimb = (newClimb: any) => {
    setCurrentClimbState(newClimb);
    sendData({
      type: "set-current-climb",
      data: newClimb,
    });
  }

  const { readyToConnect, receivedData, sendData, connectToPeer, peerId } = useContext(PeerContext);

  useEffect(() => {
    if (receivedData) {
      console.log("New data received:", receivedData);
      if (receivedData && receivedData.type && receivedData.type === "set-current-climb") {
        setCurrentClimbState(receivedData.data);
      }
      // Handle the received data
    }
  }, [receivedData]);

  useEffect(() => {
    if (readyToConnect && hostId && !hasConnected) {
      connectToPeer(hostId);
      setHasConnected(true)
    }
  }, [hostId, readyToConnect, connectToPeer, hasConnected]);

  useEffect(() => {
    const handleResize = () => {
      //TODO: Use media queries
      setViewportWidth(window.innerWidth);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const getResponsiveStyles = () => {
    // TODO: Just use media queries instead
    if (viewportWidth > 1200) {
      return {
        titleSize: "24px",
        textSize: "16px",
        padding: "0 24px",
      };
    } else if (viewportWidth > 768) {
      return {
        titleSize: "20px",
        textSize: "14px",
        padding: "0 16px",
      };
    } else {
      return {
        titleSize: "16px",
        textSize: "12px",
        padding: "0 8px",
      };
    }
  };

  const styles = getResponsiveStyles();

  const showDrawer = () => {
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
  };

  const applyFilters = (filters) => {
    setPageNumber(0);
    setQueryParameters(filters);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [fetchedResults] = await Promise.all([
          fetchResults(pageNumber, PAGE_LIMIT, queryParameters, {
            board,
            layout,
            size,
            set_ids,
          }),
        ]);

        // Append results if pageNumber increases, otherwise reset results
        if (pageNumber > 0) {
          setResults((prevResults) => [...prevResults, ...fetchedResults]);
        } else {
          setResults(fetchedResults);
        }

        if (!currentClimb && fetchedResults.length > 0) {
          setCurrentClimb(fetchedResults[0]);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, [board, layout, size, queryParameters, pageNumber]);

  const handleClimbClick = (climb) => {
    setCurrentClimb(climb);
    closeDrawer();
  };

  const navigateClimbsLeft = () => {
    if (!currentClimb) {
      return;
    }
    const currentIndex = results.findIndex((climb) => climb.uuid === currentClimb.uuid);
    if (currentIndex > 0) {
      setCurrentClimb(results[currentIndex - 1]);
    }
  };

  const navigateClimbsRight = () => {
    const currentIndex = results.findIndex((climb) => climb.uuid === currentClimb.uuid);

    if (currentIndex > results.length - 10) {
      setPageNumber(pageNumber + 1);
    }
    if (currentIndex < results.length - 1) {
      setCurrentClimb(results[currentIndex + 1]);
    }
  };

  // Keyboard event listener
  useEffect(() => {
    const handleKeyDown = (event) => {
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
                    by {currentClimb.setter}
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
                    Grade: {currentClimb.grade} ({currentClimb.gradeAdjustment}) at {currentClimb.angle}°
                  </Text>
                </Col>
                <Col>
                  <Space>
                     {currentClimb && (
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
          <KilterBoardLoader board={board} layout={layout} size={size} scale={0.8} litUpHolds={currentClimb ? currentClimb.holds : null} />
          <FloatingBar
          //@ts-expect-error goawaystupiderror
            currentClimb={currentClimb}
            navigateClimbsLeft={navigateClimbsLeft}
            navigateClimbsRight={navigateClimbsRight}
            board={board} 
            layout={layout}
            size={size}
          />
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
        size={size}
        set_ids={set_ids}
      />
    </Layout>
  );
};

export default ResultsPage;
