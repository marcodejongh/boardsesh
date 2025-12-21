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

  // Generate animated holds map with radial sweep animation (like clock hands)
  const animatedHoldsMap = useMemo<LitUpHoldsMap>(() => {
    if (!boardDetails?.holdsData) return {};

    // Calculate center of board
    const centerX = (boardDetails.edge_left + boardDetails.edge_right) / 2;
    const centerY = (boardDetails.edge_top + boardDetails.edge_bottom) / 2;

    // Current sweep angle (0-360), advances each frame
    const sweepAngle = (animationFrame * 7.2) % 360; // Full rotation over 50 frames
    const sweepWidth = 60; // 60 degree sweep arc

    const holdsMap: LitUpHoldsMap = {};
    const colors = ['#4ECDC4', '#45B7D1', '#96CEB4'];

    for (const hold of boardDetails.holdsData) {
      // Calculate angle from center (in degrees, 0-360)
      let angle = Math.atan2(hold.cy - centerY, hold.cx - centerX) * (180 / Math.PI);
      angle = (angle + 360) % 360; // Normalize to 0-360

      // Check if hold is within the sweep arc
      const diff = Math.abs(angle - sweepAngle);
      const withinSweep = diff < sweepWidth / 2 || diff > 360 - sweepWidth / 2;

      if (withinSweep) {
        // Color based on distance from sweep center for gradient effect
        const normalizedDiff = Math.min(diff, 360 - diff) / (sweepWidth / 2);
        const colorIndex = Math.floor(normalizedDiff * 3);

        holdsMap[hold.id] = {
          state: 'HAND',
          color: colors[colorIndex] || colors[0],
          displayColor: colors[colorIndex] || colors[0],
        };
      }
    }

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
    }, 80); // Update every 80ms for faster rotation

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
        // Show a spinning circle instead of dots when no board details
        <div style={{
          width: '80px',
          height: '80px',
          border: '4px solid rgba(76, 205, 196, 0.3)',
          borderTop: '4px solid #4ECDC4',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
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
      
      <style dangerouslySetInnerHTML={{
        __html: `
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
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `
      }} />
    </div>
  );
};

export default AnimatedBoardLoading;