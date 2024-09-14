import React, { useState, useEffect, useMemo } from "react";
import KilterBoard from "./KilterBoard";
import { fetchBoardDetails } from "../rest-api/api";
import { boardLayouts } from "./board-data";

type KilterBoardLoaderProps = {
  board: string;
  layout: string;
  size: string;
}

// TODO: Unhardcode set_ids
const KilterBoardLoader = (props: KilterBoardLoaderProps) => {
  const {board, layout, size} = props;
  // Memoize the set_ids to prevent unnecessary re-renders
  const set_ids = useMemo(() => {
    console.log(layout)
    if (layout && size) {
      return (boardLayouts[layout].find(([sizeId]) => sizeId == size) || [])[3];
    }
    return;
  }, [layout, size]);

  const [boardDetails, setBoardDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('wtf')
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

  if (loading) {
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
      {...props}
    />
  );
};

export default KilterBoardLoader;
