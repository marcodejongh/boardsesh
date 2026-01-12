import { BoardDetails } from '@/app/lib/types';

/**
 * All available hold types with their display labels
 * Order matches display order in the UI
 * Note: Values must match the database hold_type enum in packages/db/src/schema/app/hold-classifications.ts
 */
export const HOLD_TYPE_OPTIONS = [
  { value: 'jug', label: 'Jug', description: 'Large, positive holds' },
  { value: 'edge', label: 'Edge', description: 'Flat ledges and rails' },
  { value: 'sloper', label: 'Sloper', description: 'Rounded, friction-dependent holds' },
  { value: 'pinch', label: 'Pinch', description: 'Holds requiring thumb opposition' },
  { value: 'crimp', label: 'Crimp', description: 'Small edges requiring finger strength' },
  { value: 'pocket', label: 'Pocket', description: 'Holds for one or more fingers' },
  { value: 'sidepull', label: 'Sidepull', description: 'Holds oriented to the side' },
  { value: 'undercling', label: 'Undercling', description: 'Holds gripped from below' },
] as const;

/**
 * Hold type classification options
 * Derived from HOLD_TYPE_OPTIONS to ensure type safety
 */
export type HoldType = (typeof HOLD_TYPE_OPTIONS)[number]['value'];

/**
 * Hold type display information
 */
export type HoldTypeOption = (typeof HOLD_TYPE_OPTIONS)[number];

/**
 * User's classification for a specific hold
 */
export interface HoldClassification {
  holdId: number;
  holdType: HoldType | null;
  difficultyRating: number | null; // 1-5 rating
}

/**
 * Classification data stored in the database
 */
export interface StoredHoldClassification {
  id: string;
  userId: string;
  boardType: string;
  layoutId: number;
  sizeId: number;
  holdId: number;
  holdType: HoldType | null;
  difficultyRating: number | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Props for the HoldClassificationWizard component
 */
export interface HoldClassificationWizardProps {
  open: boolean;
  onClose: () => void;
  boardDetails: BoardDetails;
  onComplete?: () => void;
}

/**
 * API response for fetching classifications
 */
export interface GetClassificationsResponse {
  classifications: StoredHoldClassification[];
}

/**
 * API request body for saving a classification
 */
export interface SaveClassificationRequest {
  boardType: string;
  layoutId: number;
  sizeId: number;
  holdId: number;
  holdType: HoldType | null;
  difficultyRating: number | null;
}
