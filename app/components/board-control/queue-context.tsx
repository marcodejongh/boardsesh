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
  suggested?: boolean;
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
  
  const hasMoreResults = data && data[0] && (size * PAGE_LIMIT) < data[0].totalCount;
  
  // Aggregate all pages of climbs
  const climbSearchResults = data ? data.flatMap((page) => page.boulderproblems) : [];

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

  /***
   * Immediately sets current climb, and inserts it into the queue.
   * If there is an active queue, we insert the new climb
   * after the old climb.
   */
  const setCurrentClimb = (climb: BoulderProblem) => {
    const queueItem = { 
      climb,
      uuid: uuidv4(),
    };
    setQueueState((prevQueue) => {
      setCurrentClimbQueueItemState(queueItem);
      
      if (!currentClimbQueueItem) {
        // If no current item, append the new one to the queue
        return [...prevQueue, queueItem];
      }
      
      const index = prevQueue.findIndex(({ uuid }) => uuid === currentClimbQueueItem?.uuid);
      if (index === -1) {
        // If the current item is not found, append the new one
        return [...prevQueue, queueItem];
      }
      
      // Replace the current item in the queue
      return [...prevQueue.slice(0, index + 1), queueItem, ...prevQueue.slice(index + 1)];
    });
  };



  const setCurrentClimbQueueItem = (item: ClimbQueueItem) => {
    setCurrentClimbQueueItemState(item);
    if (item.suggested && !queue.find(({ uuid }) => uuid === item.uuid)) {
      const suggestedQueueItemIndex = climbSearchResults.findIndex(({ uuid }) => uuid === currentClimbQueueItem?.climb.uuid);
      
      setQueueState((prevQueue) => [...prevQueue, item]);
      
      if (suggestedQueueItemIndex >  climbSearchResults.length - 5) {
        fetchMoreClimbs();
      }
    }
  };

  
  const getNextClimbQueueItem = (): ClimbQueueItem | null => {
    if (queue.length === 0 && climbSearchResults.length === 0) {
      return null;
    }

    const queueItemIndex = queue.findIndex(({ uuid }) => uuid === currentClimbQueueItem?.uuid);
    const suggestedQueueItemIndex = climbSearchResults.findIndex(({ uuid }) => uuid === currentClimbQueueItem?.climb.uuid);

    if (queue.length === 0 || queue.length <= queueItemIndex + 1 ) {
      return {
        uuid: uuidv4(),
        climb: climbSearchResults.filter(({uuid: searchUuid}, index) => index > suggestedQueueItemIndex && !queue.find(({ climb: { uuid }}) => uuid === searchUuid))[0],
        suggested: true,
      }
    }
    
    if (queueItemIndex > queue.length + 1) {
      return null;
    }
    
    return queue[queueItemIndex + 1];
  }

  const getPreviousClimbQueueItem = (): ClimbQueueItem | null => {
    const queueItemIndex = queue.findIndex(({ uuid }) => uuid === currentClimbQueueItem?.uuid);

    if (queueItemIndex > 0) {
      return queue[queueItemIndex - 1]
    }

    return null
  }

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
