'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Typography } from 'antd';
import BoardRenderer from '../board-renderer/board-renderer';
import { BoardDetails } from '@/app/lib/types';
import { LitUpHoldsMap } from '../board-renderer/types';

const { Text } = Typography;

const loadingMessages = [
  "Setting up your board...",
  "Configuring climb routes...",
  "Preparing the wall...",
  "Loading hold sets...",
  "Almost ready to climb...",
  "Warming up the LEDs...",
  "Syncing board configuration...",
  "Calibrating difficulty grades...",
  "Getting your climbing groove on...",
  "Checking route conditions...",
];

interface AnimatedBoardLoadingProps {
  isVisible: boolean;
  boardDetails?: BoardDetails | null;
}

const AnimatedBoardLoading: React.FC<AnimatedBoardLoadingProps> = ({ isVisible, boardDetails }) => {
  const [currentMessage, setCurrentMessage] = useState(loadingMessages[0]);
  const [animationFrame, setAnimationFrame] = useState(0);

  // Generate animated holds map with rotating colors
  const animatedHoldsMap = useMemo<LitUpHoldsMap>(() => {
    if (!boardDetails?.holdsData) return {};
    
    const holdsMap: LitUpHoldsMap = {};
    const holdCount = boardDetails.holdsData.length;
    const numAnimatedHolds = Math.min(12, Math.floor(holdCount * 0.15)); // Animate 15% of holds, max 12
    
    // Create a pattern where holds light up in a spiral/wave pattern
    const selectedHolds = new Set<number>();
    const step = Math.floor(holdCount / numAnimatedHolds);
    
    for (let i = 0; i < numAnimatedHolds; i++) {
      const holdIndex = (i * step + animationFrame * 3) % holdCount;
      selectedHolds.add(boardDetails.holdsData[holdIndex].id);
    }
    
    // Assign colors to selected holds with a gradient effect
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#9B59B6'];
    let colorIndex = 0;
    
    selectedHolds.forEach(holdId => {
      holdsMap[holdId] = {
        state: 'ON',
        color: colors[colorIndex % colors.length],
      };
      colorIndex++;
    });
    
    return holdsMap;
  }, [boardDetails, animationFrame]);

  // Message rotation effect
  useEffect(() => {
    if (!isVisible) return;

    let messageIndex = 0;
    const messageInterval = setInterval(() => {
      messageIndex = (messageIndex + 1) % loadingMessages.length;
      setCurrentMessage(loadingMessages[messageIndex]);
    }, 2500);

    return () => clearInterval(messageInterval);
  }, [isVisible]);

  // Animation frame update for hold movement
  useEffect(() => {
    if (!isVisible || !boardDetails) return;

    const animationInterval = setInterval(() => {
      setAnimationFrame(prev => (prev + 1) % 100);
    }, 150); // Update every 150ms for smooth animation

    return () => clearInterval(animationInterval);
  }, [isVisible, boardDetails]);

  if (!isVisible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
        gap: '32px',
      }}
    >
      {boardDetails ? (
        <div style={{ 
          width: '250px',
          height: '250px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <BoardRenderer
            litUpHoldsMap={animatedHoldsMap}
            mirrored={false}
            boardDetails={boardDetails}
            thumbnail={false}
          />
        </div>
      ) : (
        // Fallback to simple animated dots if no board details
        <div style={{ display: 'flex', gap: '8px' }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: '#4ECDC4',
                animation: `pulse 1.5s ease-in-out ${i * 0.15}s infinite`,
              }}
            />
          ))}
        </div>
      )}
      
      <Text
        style={{
          color: 'white',
          fontSize: '18px',
          textAlign: 'center',
          opacity: 0.95,
          maxWidth: '350px',
          lineHeight: 1.5,
          fontWeight: 500,
        }}
      >
        {currentMessage}
      </Text>
      
      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 0.3;
            transform: scale(0.8);
          }
          50% {
            opacity: 1;
            transform: scale(1.2);
          }
        }
      `}</style>
    </div>
  );
};

export default AnimatedBoardLoading;