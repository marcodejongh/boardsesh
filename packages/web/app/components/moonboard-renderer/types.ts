import { MoonBoardCoordinate } from '@/app/lib/moonboard-config';

// MoonBoard hold types (simpler than Aurora)
export type MoonBoardHoldType = 'start' | 'hand' | 'finish';

// A hold on the MoonBoard
export interface MoonBoardHold {
  coordinate: MoonBoardCoordinate;
  type: MoonBoardHoldType;
  holdId: number; // Computed from coordinate (1-198)
}

// Lit up hold information for rendering
export interface MoonBoardLitUpHold {
  type: MoonBoardHoldType;
  color: string;
}

// Map of hold IDs to their lit up state
export type MoonBoardLitUpHoldsMap = Record<number, MoonBoardLitUpHold>;

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
  litUpHoldsMap?: MoonBoardLitUpHoldsMap;
  mirrored?: boolean;
  thumbnail?: boolean;
  onHoldClick?: (holdId: number) => void;
}
