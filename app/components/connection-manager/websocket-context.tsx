'use client';

import React, { useCallback, useContext, createContext, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { ReceivedPeerData, PeerData } from './types';

interface WebSocketContextType {
  isConnected: boolean;
  isControllerMode: boolean;
  controllerId: string | null;
  sendData: (data: PeerData) => void;
  subscribeToData: (callback: (data: ReceivedPeerData) => void) => () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

type DataHandler = {
  id: string;
  callback: (data: ReceivedPeerData) => void;
};

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [controllerId, setControllerId] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const wsRef = useRef<WebSocket | null>(null);
  const dataHandlers = useRef<DataHandler[]>([]);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  
  // Get controller URL from URL parameters
  const controllerUrl = searchParams.get('controllerUrl');
  const isControllerMode = !!controllerUrl;
  
  const subscribeToData = useCallback((callback: (data: ReceivedPeerData) => void) => {
    const handlerId = uuidv4();
    dataHandlers.current.push({ id: handlerId, callback });
    
    return () => {
      dataHandlers.current = dataHandlers.current.filter((handler) => handler.id !== handlerId);
    };
  }, []);
  
  const notifySubscribers = useCallback((data: ReceivedPeerData) => {
    dataHandlers.current.forEach((handler) => {
      try {
        handler.callback(data);
      } catch (error) {
        console.error('Error in WebSocket data handler:', error);
      }
    });
  }, []);
  
  const sendData = useCallback((data: PeerData) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const message = { 
        ...data, 
        source: 'boardsesh-client', 
        messageId: uuidv4() 
      };
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, cannot send message:', data);
    }
  }, []);
  
  const connect = useCallback(() => {
    if (!controllerUrl) return;
    
    try {
      // Close existing connection
      if (wsRef.current) {
        wsRef.current.close();
      }
      
      console.log('Connecting to Board Controller:', controllerUrl);
      wsRef.current = new WebSocket(controllerUrl);
      
      wsRef.current.onopen = () => {
        console.log('Connected to Board Controller');
        setIsConnected(true);
        reconnectAttempts.current = 0;
        
        // Send initial handshake to indicate BoardSesh connection
        const handshake = {
          type: 'boardsesh-handshake',
          clientType: 'boardsesh-web',
          version: '1.0'
        };
        wsRef.current?.send(JSON.stringify(handshake));
      };
      
      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Received from Board Controller:', data);
          
          // Handle controller-specific messages
          if (data.type === 'controller-handshake') {
            setControllerId(data.controllerId);
            console.log('Controller handshake received, ID:', data.controllerId);
            
            // Notify subscribers about controller takeover
            notifySubscribers({
              ...data,
              type: 'controller-takeover',
              source: data.controllerId || 'controller'
            });
            return;
          }
          
          // Convert controller messages to PeerJS-compatible format
          const peerData: ReceivedPeerData = {
            ...data,
            source: data.source || controllerId || 'controller'
          };
          
          notifySubscribers(peerData);
          
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      wsRef.current.onclose = (event) => {
        console.log('Disconnected from Board Controller:', event.code, event.reason);
        setIsConnected(false);
        
        // Attempt to reconnect unless it was a manual close
        if (event.code !== 1000 && reconnectAttempts.current < 5) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          console.log(`Reconnecting to controller in ${delay}ms...`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        }
      };
      
      wsRef.current.onerror = (error) => {
        console.error('Board Controller WebSocket error:', error);
      };
      
    } catch (error) {
      console.error('Failed to connect to Board Controller:', error);
    }
  }, [controllerUrl, controllerId, notifySubscribers]);
  
  // Connect when controller URL is available
  useEffect(() => {
    if (isControllerMode) {
      connect();
    }
    
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounting');
      }
    };
  }, [isControllerMode, connect]);
  
  const contextValue: WebSocketContextType = {
    isConnected,
    isControllerMode,
    controllerId,
    sendData,
    subscribeToData
  };
  
  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocketContext = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  return context;
};