import { MoonBoardCoordinate } from '@/app/lib/moonboard-config';
import { LitUpHoldsMap } from '../board-renderer/types';

// MoonBoard hold types (simpler than Aurora) - used for internal conversions
export type MoonBoardHoldType = 'start' | 'hand' | 'finish';

// A hold on the MoonBoard
export interface MoonBoardHold {
  coordinate: MoonBoardCoordinate;
  type: MoonBoardHoldType;
  holdId: number; // Computed from coordinate (1-198)
}

// MoonBoard climb data structure
export interface MoonBoardClimb {
  name: string;
  setter?: string;
  grade?: string;
  description?: string;
  holds: MoonBoardHold[];
  angle: number;
  isBenchmark?: boolean;
}

// Props for the MoonBoard renderer component
export interface MoonBoardRendererProps {
  layoutFolder: string; // e.g., 'moonboard2024'
  holdSetImages: string[]; // e.g., ['holdsetd.png', 'holdsete.png']
  litUpHoldsMap?: LitUpHoldsMap;
  mirrored?: boolean;
  thumbnail?: boolean;
  onHoldClick?: (holdId: number) => void;
}
