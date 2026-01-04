import { BoardDetails } from '@/app/lib/types';
import { HoldRenderData } from '../board-renderer/types';

/**
 * Hold type classification options
 * Matches the database enum values
 */
export type HoldType =
  | 'edge'
  | 'sloper'
  | 'pinch'
  | 'sidepull'
  | 'undercling'
  | 'jug'
  | 'crimp'
  | 'pocket';

/**
 * Hold type display information
 */
export interface HoldTypeOption {
  value: HoldType;
  label: string;
  description: string;
}

/**
 * All available hold types with their display labels
 */
export const HOLD_TYPE_OPTIONS: HoldTypeOption[] = [
  { value: 'jug', label: 'Jug', description: 'Large, positive holds' },
  { value: 'edge', label: 'Edge', description: 'Flat ledges and rails' },
  { value: 'sloper', label: 'Sloper', description: 'Rounded, friction-dependent holds' },
  { value: 'pinch', label: 'Pinch', description: 'Holds requiring thumb opposition' },
  { value: 'crimp', label: 'Crimp', description: 'Small edges requiring finger strength' },
  { value: 'pocket', label: 'Pocket', description: 'Holds for one or more fingers' },
  { value: 'sidepull', label: 'Sidepull', description: 'Holds oriented to the side' },
  { value: 'undercling', label: 'Undercling', description: 'Holds gripped from below' },
];

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

/**
 * State for a single hold being classified
 */
export interface HoldClassificationState {
  hold: HoldRenderData;
  classification: HoldClassification;
  isModified: boolean;
}
