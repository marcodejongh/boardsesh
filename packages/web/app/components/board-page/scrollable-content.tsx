'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Content } from 'antd/es/layout/layout';

type ScrollContainerContextType = HTMLDivElement | null;

const ScrollContainerContext = createContext<ScrollContainerContextType>(null);

export function useScrollContainer(): HTMLDivElement | null {
  return useContext(ScrollContainerContext);
}

interface ScrollableContentProps {
  children: ReactNode;
}

export function ScrollableContent({ children }: ScrollableContentProps) {
  const [scrollContainer, setScrollContainer] = useState<HTMLDivElement | null>(null);

  const scrollContainerRef = useCallback((node: HTMLDivElement | null) => {
    if (node !== null) {
      setScrollContainer(node);
    }
  }, []);

  return (
    <ScrollContainerContext.Provider value={scrollContainer}>
      <Content
        ref={scrollContainerRef}
        id="content-for-scrollable"
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          overflowY: 'auto',
          overflowX: 'hidden',
          height: '80vh',
          paddingLeft: '10px',
          paddingRight: '10px',
        }}
      >
        {children}
      </Content>
    </ScrollContainerContext.Provider>
  );
}
