"use client";

import { BoulderProblem, SearchRequest, SearchRequestPagination } from "@/app/lib/types";
import { urlParamsToSearchParams } from "@/app/lib/url-utils";
import { useSearchParams } from "next/navigation";
import { createContext, useContext, useState, ReactNode } from "react";
import { v4 as uuidv4 } from 'uuid';

type UserName = string;
type ClimbQueueItem = {
  addedBy?: UserName;
  tickedBy?: UserName[];
  climb: BoulderProblem;
  uuid: string;
};

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

  setSuggestedQueue: (climbs: BoulderProblem[]) => void;
  
  setCurrentClimbQueueItem: (item: ClimbQueueItem) => void;

  getNextClimbQueueItem: () => ClimbQueueItem | null;
  getPreviousClimbQueueItem: () => ClimbQueueItem | null;
}

const QueueContext = createContext<QueueContextType | undefined>(undefined);

export const useQueueContext = () => {
  const context = useContext(QueueContext);
  if (!context) {
    throw new Error("useQueueContext must be used within a QueueProvider");
  }
  return context;
};

export const QueueProvider = ({ children }: { children: ReactNode }) => {
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

  return (
    <QueueContext.Provider
      value={{
        queue,
        suggestedQueue,
        addToQueue,
        removeFromQueue,
        currentClimb: currentClimbQueueItem?.climb || null,
        setCurrentClimb,
        setClimbSearchParams,
        climbSearchParams,
        setCurrentClimbQueueItem,
        getNextClimbQueueItem,
        getPreviousClimbQueueItem,
        setSuggestedQueue: (climbs: BoulderProblem[]) =>
          setSuggestedQueueState(climbs.map((climb) => ({ climb, uuid: uuidv4(), source: 'suggestedQueue' }))),
      }}
    >
      {children}
    </QueueContext.Provider>
  );
};
