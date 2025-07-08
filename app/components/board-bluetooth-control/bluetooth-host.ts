import { BoardName, LedPlacements } from '@/app/lib/types';
import { getBluetoothPacket, splitMessages, writeCharacteristicSeries, requestDevice, getCharacteristic } from './bluetooth';

// Bluetooth constants - using different service for host-client communication
const HOST_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9f'; // Different from board service
const HOST_CHARACTERISTIC_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9f';

// Board communication (reuse existing constants)
const BOARD_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const BOARD_CHARACTERISTIC_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';

export interface BluetoothHostOptions {
  deviceName?: string;
  onCommandReceived?: (command: BluetoothCommand) => void;
  onConnectionChange?: (connected: boolean) => void;
}

export interface BluetoothCommand {
  type: 'SHOW_CLIMB' | 'CLEAR_BOARD' | 'SET_LEDS';
  data?: {
    frames?: string;
    placementPositions?: LedPlacements;
    boardName?: BoardName;
    color?: string;
    positions?: number[];
  };
}

export class BluetoothHost {
  private boardDevice: BluetoothDevice | null = null;
  private boardCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private isInitialized = false;
  
  constructor(private options: BluetoothHostOptions = {}) {
    this.initializeOnLoad();
  }

  private async initializeOnLoad(): Promise<void> {
    if (typeof window !== 'undefined' && 'bluetooth' in navigator) {
      // Auto-initialize when the class is created (website loads)
      await this.initialize();
    }
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    if (!('bluetooth' in navigator)) {
      console.warn('Bluetooth not supported in this browser');
      return;
    }

    try {
      // Since Web Bluetooth can't act as peripheral, we'll use a different approach:
      // 1. Store a global reference so other devices can find this instance
      // 2. Use shared state or WebRTC for communication instead of Bluetooth
      // 3. Or implement using Web Serial/USB if available
      
      (window as any).__boardsesh_bluetooth_host = this;
      this.isInitialized = true;
      
      console.log('BoardSesh Bluetooth Host initialized');
      console.log('Note: Web Bluetooth peripheral mode not supported - using alternative communication');
      
    } catch (error) {
      console.error('Failed to initialize Bluetooth host:', error);
    }
  }

  // Public API for iPhone app to send commands
  async receiveCommand(command: BluetoothCommand): Promise<void> {
    console.log('Received command:', command);
    await this.executeCommand(command);
    this.options.onCommandReceived?.(command);
  }

  async connectToBoard(namePrefix: string): Promise<void> {
    try {
      this.boardDevice = await requestDevice(namePrefix);
      this.boardCharacteristic = await getCharacteristic(this.boardDevice) || null;
      
      console.log('Connected to climbing board');
    } catch (error) {
      console.error('Failed to connect to board:', error);
      throw error;
    }
  }

  async disconnectFromBoard(): Promise<void> {
    if (this.boardDevice?.gatt?.connected) {
      await this.boardDevice.gatt.disconnect();
      this.boardDevice = null;
      this.boardCharacteristic = null;
      console.log('Disconnected from climbing board');
    }
  }


  private async executeCommand(command: BluetoothCommand): Promise<void> {
    if (!this.boardCharacteristic) {
      console.warn('No board connected, cannot execute command');
      return;
    }

    switch (command.type) {
      case 'SHOW_CLIMB':
        if (command.data?.frames && command.data?.placementPositions && command.data?.boardName) {
          await this.showClimbOnBoard(
            command.data.frames,
            command.data.placementPositions,
            command.data.boardName
          );
        }
        break;
        
      case 'CLEAR_BOARD':
        await this.clearBoard();
        break;
        
      case 'SET_LEDS':
        if (command.data?.positions && command.data?.color) {
          await this.setLEDs(command.data.positions, command.data.color);
        }
        break;
        
      default:
        console.warn('Unknown command type:', command.type);
    }
  }

  private async showClimbOnBoard(
    frames: string,
    placementPositions: LedPlacements,
    boardName: BoardName
  ): Promise<void> {
    try {
      const packet = getBluetoothPacket(frames, placementPositions, boardName);
      const messages = splitMessages(packet);
      await writeCharacteristicSeries(this.boardCharacteristic!, messages);
      console.log('Sent climb to board');
    } catch (error) {
      console.error('Failed to show climb on board:', error);
    }
  }

  private async clearBoard(): Promise<void> {
    try {
      // Send empty frames to clear the board
      const emptyPacket = getBluetoothPacket('', {}, 'kilter');
      const messages = splitMessages(emptyPacket);
      await writeCharacteristicSeries(this.boardCharacteristic!, messages);
      console.log('Cleared board');
    } catch (error) {
      console.error('Failed to clear board:', error);
    }
  }

  private async setLEDs(positions: number[], color: string): Promise<void> {
    try {
      // Convert positions and color to frames format
      const frames = positions.map(pos => `p${pos}r1`).join('');
      // This is a simplified implementation - you may need to create a proper color mapping
      const packet = getBluetoothPacket(frames, positions.reduce((acc, pos, i) => ({ ...acc, [i]: pos }), {}), 'kilter');
      const messages = splitMessages(packet);
      await writeCharacteristicSeries(this.boardCharacteristic!, messages);
      console.log('Set LEDs on board');
    } catch (error) {
      console.error('Failed to set LEDs:', error);
    }
  }

  // Get current status for external access
  getStatus(): any {
    return {
      boardConnected: this.isConnectedToBoard(),
      initialized: this.isInitialized,
      timestamp: Date.now()
    };
  }

  isConnectedToBoard(): boolean {
    return this.boardDevice?.gatt?.connected ?? false;
  }

  async disconnect(): Promise<void> {
    await this.disconnectFromBoard();
    this.options.onConnectionChange?.(false);
  }
}

// Auto-create global instance when module loads
let globalHost: BluetoothHost | null = null;

export const getGlobalBluetoothHost = (): BluetoothHost => {
  if (!globalHost) {
    globalHost = new BluetoothHost({
      deviceName: 'BoardSesh-Host',
      onCommandReceived: (command) => console.log('Command received:', command),
      onConnectionChange: (connected) => console.log('Connection changed:', connected)
    });
  }
  return globalHost;
};

// Helper function to get the host instance (creates if needed)
export const createBluetoothHost = (options: BluetoothHostOptions = {}): BluetoothHost => {
  return new BluetoothHost(options);
};