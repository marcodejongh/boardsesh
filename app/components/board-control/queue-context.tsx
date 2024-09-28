"use client";

import { BoulderProblem, ParsedBoardRouteParameters, SearchRequest, SearchRequestPagination } from "@/app/lib/types";
import { constructClimbSearchUrl, searchParamsToUrlParams, urlParamsToSearchParams } from "@/app/lib/url-utils";
import { useSearchParams } from "next/navigation";
import { createContext, useContext, useState, ReactNode } from "react";
import useSWRInfinite from "swr/infinite";
import { v4 as uuidv4 } from 'uuid';
import { PAGE_LIMIT } from "../board-page/constants";

type QueueContextProps = {
  parsedParams: ParsedBoardRouteParameters;
  children: ReactNode;
  initialClimbSearchResults: BoulderProblem[];
  initialClimbSearchTotalCount: number;
}

type UserName = string;
type ClimbQueueItem = {
  addedBy?: UserName;
  tickedBy?: UserName[];
  climb: BoulderProblem;
  uuid: string;
};

const fetcher = (url: string) => fetch(url).then(res => res.json());

type ClimbQueue = ClimbQueueItem[];

interface QueueContextType {
  queue: ClimbQueue;
  suggestedQueue: ClimbQueue;
  // history: ClimbQueue;

  addToQueue: (climb: BoulderProblem) => void;
  removeFromQueue: (queueItem: ClimbQueueItem) => void;

  setCurrentClimb: (climb: BoulderProblem) => void;
  currentClimb: BoulderProblem | null;
  // nextClimb: () => void;
  // previousClimb: () => void;

  setClimbSearchParams: (searchParams: SearchRequestPagination) => void;
  climbSearchParams: SearchRequestPagination;
  climbSearchResults: BoulderProblem[];
  fetchMoreClimbs: () => void;

  setCurrentClimbQueueItem: (item: ClimbQueueItem) => void;

  getNextClimbQueueItem: () => ClimbQueueItem | null;
  getPreviousClimbQueueItem: () => ClimbQueueItem | null;
  hasMoreResults: boolean;
}

const QueueContext = createContext<QueueContextType | undefined>(undefined);

export const useQueueContext = () => {
  const context = useContext(QueueContext);
  if (!context) {
    throw new Error("useQueueContext must be used within a QueueProvider");
  }
  return context;
};

export const QueueProvider = ({ 
  parsedParams, 
  children, 
  initialClimbSearchResults = [], 
  initialClimbSearchTotalCount = 0 }: QueueContextProps) => {

  const [queue, setQueueState] = useState<ClimbQueue>([]);
  
  const [currentClimbQueueItem, setCurrentClimbQueueItemState] = useState<ClimbQueueItem | null>(null);
  
  const [suggestedQueue, setSuggestedQueueState] = useState<ClimbQueue>([]);
  const [climbSearchParams, setClimbSearchParams] = useState<SearchRequestPagination>(
    urlParamsToSearchParams(useSearchParams())
  );

  const addToQueue = (climb: BoulderProblem) => {
    setQueueState((prevQueue) => [
      ...prevQueue,
      { climb, uuid: uuidv4() },
    ]);
  };

  const removeFromQueue = (climbQueueItem: ClimbQueueItem) => {
    setQueueState((prevQueue) => {
      if (prevQueue === null) {
        return prevQueue;
      }
      return prevQueue.filter((item) => item.uuid !== climbQueueItem.uuid)
    });
  };

  const setCurrentClimb = (climb: BoulderProblem) => {
    setCurrentClimbQueueItemState({ 
      climb,
      uuid: uuidv4(),
    });
  }

  const setCurrentClimbQueueItem = (item: ClimbQueueItem) => {
    setCurrentClimbQueueItemState(item);
    
  }
  
  const getNextClimbQueueItem = (): ClimbQueueItem | null => {
    const queueItemIndex = queue.findIndex(({ uuid }) => uuid === currentClimbQueueItem?.uuid);
    const suggestedQueueItemIndex = suggestedQueue.findIndex(({ uuid }) => uuid === currentClimbQueueItem?.uuid);

    if (queue.length === 0 || queue.length < queueItemIndex ) {
      if (suggestedQueueItemIndex > -1) {
        return suggestedQueue[suggestedQueueItemIndex + 1];  
      }
      return suggestedQueue[0];
    }
    
    if (queueItemIndex > queue.length) {
      return null;
    }
    
    return queue[queueItemIndex + 1];
  }

  const getPreviousClimbQueueItem = (): ClimbQueueItem | null => {
    const queueItemIndex = queue.findIndex(({ uuid }) => uuid === currentClimbQueueItem?.uuid);
    const suggestedQueueItemIndex = suggestedQueue.findIndex(({ uuid }) => uuid === currentClimbQueueItem?.uuid);

    if (suggestedQueueItemIndex > 0) {
      return suggestedQueue[suggestedQueueItemIndex - 1];  
    }
    
    if (queueItemIndex > 0) {
      return queue[queueItemIndex - 1]
    }

    return null
  }

  const getKey = (pageIndex: number, previousPageData: any) => {
    if (previousPageData && previousPageData.boulderproblems.length === 0) return null;
    
    const queryString = searchParamsToUrlParams({
      ...climbSearchParams,
      page: pageIndex,
    }).toString();

    return constructClimbSearchUrl(parsedParams, queryString);
  };

  const { data, error, isLoading, isValidating, size, setSize } = useSWRInfinite(
    getKey,
    fetcher,
    { 
      fallbackData: [{ boulderproblems: initialClimbSearchResults, totalCount: initialClimbSearchTotalCount }],
      revalidateOnFocus: false, 
      revalidateFirstPage: false 
    }
  );
  
  const fetchMoreClimbs = () => {
    setSize(size + 1);
  };
  
  const hasMoreResults = true;
  
  // Aggregate all pages of climbs
  const climbSearchResults = data ? data.flatMap((page) => page.boulderproblems) : [];

  return (
    <QueueContext.Provider
      value={{
        queue,
        suggestedQueue,
        addToQueue,
        removeFromQueue,
        climbSearchResults,
        fetchMoreClimbs,
        hasMoreResults,
        currentClimb: currentClimbQueueItem?.climb || null,
        setCurrentClimb,
        setClimbSearchParams,
        climbSearchParams,
        setCurrentClimbQueueItem,
        getNextClimbQueueItem,
        getPreviousClimbQueueItem,
        
      }}
    >
      {children}
    </QueueContext.Provider>
  );
};
