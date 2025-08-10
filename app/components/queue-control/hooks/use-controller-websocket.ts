import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { ReceivedPeerData, PeerData } from '../../connection-manager/types';

interface UseControllerWebSocketReturn {
  isControllerMode: boolean;
  isConnected: boolean;
  controllerId: string | null;
  sendData: (data: PeerData) => void;
  subscribeToData: (callback: (data: ReceivedPeerData) => void) => () => void;
}

type DataHandler = {
  id: string;
  callback: (data: ReceivedPeerData) => void;
};

export const useControllerWebSocket = (): UseControllerWebSocketReturn => {
  const searchParams = useSearchParams();
  const rawControllerUrl = searchParams.get('controllerUrl');
  const controllerUrl = rawControllerUrl ? decodeURIComponent(rawControllerUrl) : null;
  const isControllerMode = !!controllerUrl;
  
  const [isConnected, setIsConnected] = useState(false);
  const [controllerId, setControllerId] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const dataHandlers = useRef<DataHandler[]>([]);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  
  const subscribeToData = useCallback((callback: (data: ReceivedPeerData) => void) => {
    if (!isControllerMode) return () => {}; // No-op if not in controller mode
    
    const handlerId = uuidv4();
    dataHandlers.current.push({ id: handlerId, callback });
    
    return () => {
      dataHandlers.current = dataHandlers.current.filter((handler) => handler.id !== handlerId);
    };
  }, [isControllerMode]);
  
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
    if (!isControllerMode) return; // No-op if not in controller mode
    
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const message = { 
        ...data, 
        source: 'boardsesh-client', 
        messageId: uuidv4() 
      };
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('Controller WebSocket not connected, cannot send:', data.type);
    }
  }, [isControllerMode]);
  
  const connect = useCallback(() => {
    if (!controllerUrl) return;
    
    try {
      if (wsRef.current) {
        wsRef.current.close();
      }
      
      // Ensure the WebSocket URL includes the /ws path
      const wsUrl = controllerUrl.endsWith('/ws') ? controllerUrl : `${controllerUrl}/ws`;
      console.log('🎮 Connecting to Board Controller:', wsUrl);
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = () => {
        console.log('🎮 Connected to Board Controller');
        setIsConnected(true);
        reconnectAttempts.current = 0;
        
        // Send handshake
        const handshake = {
          type: 'boardsesh-handshake',
          clientType: 'boardsesh-web',
          version: '1.0'
        };
        wsRef.current?.send(JSON.stringify(handshake));
        
        // Send new-connection message to request initial queue data (mimics PeerJS behavior)
        const newConnectionMessage = {
          type: 'new-connection',
          source: 'boardsesh-client',
          messageId: uuidv4()
        };
        wsRef.current?.send(JSON.stringify(newConnectionMessage));
      };
      
      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('🎮 Received from Controller:', data.type, data);
          
          if (data.type === 'controller-handshake') {
            setControllerId(data.controllerId);
            console.log('🎮 Controller takeover confirmed, ID:', data.controllerId);
            
            // Notify queue context about controller takeover
            notifySubscribers({
              ...data,
              type: 'controller-takeover',
              source: data.controllerId || 'controller'
            });
            return;
          }
          
          // Pass through controller messages as peer data
          const peerData: ReceivedPeerData = {
            ...data,
            source: data.source || controllerId || 'controller'
          };
          
          notifySubscribers(peerData);
          
        } catch (error) {
          console.error('🎮 Error parsing controller message:', error);
        }
      };
      
      wsRef.current.onclose = (event) => {
        console.log('🎮 Controller disconnected:', event.code, event.reason);
        setIsConnected(false);
        
        // Reconnect logic
        if (event.code !== 1000 && reconnectAttempts.current < 5) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          console.log(`🎮 Reconnecting to controller in ${delay}ms...`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        }
      };
      
      wsRef.current.onerror = (error) => {
        console.error('🎮 Controller WebSocket error:', error);
        console.error('🎮 Attempted connection to:', wsUrl);
      };
      
    } catch (error) {
      console.error('🎮 Failed to connect to controller:', error);
    }
  }, [controllerUrl, controllerId, notifySubscribers]);
  
  // Auto-connect when controller mode is detected
  useEffect(() => {
    if (isControllerMode) {
      console.log('🎮 Controller mode detected, URL:', controllerUrl);
      console.log('🎮 Attempting connection...');
      connect();
    } else {
      console.log('🎮 No controller URL detected');
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
  
  return {
    isControllerMode,
    isConnected,
    controllerId,
    sendData,
    subscribeToData
  };
};