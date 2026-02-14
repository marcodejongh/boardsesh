'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

interface BoardRouteBottomBarContextType {
  hasBoardRouteBottomBar: boolean;
  register: () => void;
  unregister: () => void;
}

const BoardRouteBottomBarContext = createContext<BoardRouteBottomBarContextType>({
  hasBoardRouteBottomBar: false,
  register: () => {},
  unregister: () => {},
});

export function BoardRouteBottomBarProvider({ children }: { children: React.ReactNode }) {
  const [count, setCount] = useState(0);

  const register = useCallback(() => {
    setCount((c) => c + 1);
  }, []);

  const unregister = useCallback(() => {
    setCount((c) => Math.max(0, c - 1));
  }, []);

  return (
    <BoardRouteBottomBarContext.Provider value={{ hasBoardRouteBottomBar: count > 0, register, unregister }}>
      {children}
    </BoardRouteBottomBarContext.Provider>
  );
}

export function useBoardRouteBottomBar() {
  return useContext(BoardRouteBottomBarContext);
}

/**
 * Renders null. On mount, registers with the BoardRouteBottomBarProvider
 * to signal that a board route has its own bottom bar.
 * On unmount, unregisters so the root bottom bar reappears.
 */
export function BoardRouteBottomBarRegistrar() {
  const { register, unregister } = useBoardRouteBottomBar();

  useEffect(() => {
    register();
    return () => unregister();
  }, [register, unregister]);

  return null;
}
