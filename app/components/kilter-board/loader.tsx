import React, { useState, useEffect, useMemo } from "react";
import KilterBoard from "./KilterBoard";
import { fetchBoardDetails } from "../rest-api/api";
import { getSetIds } from "./board-data";
import type { KilterBoardLoaderProps } from "./types";

const KilterBoardLoader = (props: KilterBoardLoaderProps) => {
  const { board, layout, size } = props;
  
  const set_ids = useMemo(() => {
    if (layout && size) {
      return getSetIds(layout, size);
    }
    return;
  }, [layout, size]);

  const memoizedProps = useMemo(() => ({ ...props }), [props]); // Memoize the props

  const [boardDetails, setBoardDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!set_ids) {
      return;
    }
    fetchBoardDetails(board, layout, size, set_ids)
      .then((data) => {
        setBoardDetails(data);
        setLoading(false);
      })
      .catch((err) => {
        setError("Failed to fetch board details");
        setLoading(false);
      });
  }, [board, layout, size, set_ids]);

  if (loading || !boardDetails) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  return (
    <KilterBoard
      imagesToHolds={boardDetails.images_to_holds}
      edgeLeft={boardDetails.edge_left}
      edgeRight={boardDetails.edge_right}
      edgeBottom={boardDetails.edge_bottom}
      edgeTop={boardDetails.edge_top}
      {...memoizedProps} // Pass memoized props to KilterBoard
    />
  );
};

export default KilterBoardLoader;
