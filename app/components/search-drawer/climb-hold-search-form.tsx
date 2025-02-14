'use client';
import React from 'react';
import { BoardDetails } from '@/app/lib/types';
import { HOLD_STATE_MAP, LitUpHoldsMap } from '../board-renderer/types';
import BoardRenderer from '../board-renderer/board-renderer';
import { useUISearchParams } from '@/app/components/queue-control/ui-searchparams-provider';
import { Select } from 'antd';

export type HoldCode = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 42 | 43 | 44 | 45 | 12 | 13 | 14 | 15;
export type BoardName = 'tension' | 'kilter';
export type HoldState = 'STARTING' | 'HAND' | 'FOOT' | 'FINISH' | 'OFF' | 'ANY' | 'NOT';

interface ClimbHoldSearchFormProps {
  boardDetails: BoardDetails;
}

const ClimbHoldSearchForm: React.FC<ClimbHoldSearchFormProps> = ({ boardDetails }) => {
  const { uiSearchParams, updateFilters } = useUISearchParams();
  const [selectedState, setSelectedState] = React.useState<HoldState>('ANY');

  const getStateCode = (state: HoldState, boardName: BoardName): HoldCode | null => {
    if (state === 'ANY' || state === 'NOT') return null;

    const stateMap = HOLD_STATE_MAP[boardName];
    const entry = Object.entries(stateMap).find(([, value]) => value.name === state);
    if (!entry) {
      throw new Error(`No code found for state ${state} on board ${boardName}`);
    }
    return parseInt(entry[0]) as HoldCode;
  };

  const handleHoldClick = (holdId: number) => {
    const stateCode = getStateCode(selectedState, boardDetails.board_name as BoardName);
    const updates: Record<string, any> = {};
    const holdKey = `hold_${holdId}`;

    // Handle ANY state (remove filter)
    if (selectedState === 'ANY') {
      updates[holdKey] = 'ANY';
    }
    // Handle NOT state
    else if (selectedState === 'NOT') {
      updates[holdKey] = 'NOT';
    }
    // Handle other states
    else {
      //@ts-expect-error fix later
      const currentValue = uiSearchParams[holdKey];
      if (currentValue === stateCode?.toString()) {
        updates[holdKey] = undefined;
      } else {
        updates[holdKey] = stateCode;
      }
    }

    // Handle mirrored hold
    const hold = boardDetails.holdsData.find((h) => h.id === holdId);
    if (hold?.mirroredHoldId) {
      //TODO: When on a board with mirrored holds, we should search an OR for the
      // two possible hold ids
      const mirrorKey = `hold_${hold.mirroredHoldId}`;
      updates[mirrorKey] = updates[holdKey];
    }

    // Create visual hold map for UI
    const newSelectedHolds: LitUpHoldsMap = { ...(uiSearchParams.holdsFilter || {}) };
    if (updates[holdKey] === undefined) {
      delete newSelectedHolds[holdId];
      if (hold?.mirroredHoldId) {
        delete newSelectedHolds[hold.mirroredHoldId];
      }
    } else {
      let displayInfo;
      if (selectedState === 'NOT') {
        displayInfo = {
          state: 'NOT',
          color: '#FF0000', // Red color for NOT state
        };
      } else if (selectedState === 'ANY') {
        displayInfo = {
          state: 'ANY',
          color: '#00CCCC',
        };
      } else if (stateCode !== null) {
        // This branch is needed for when adding search by foot/hand/etc
        const stateInfo = HOLD_STATE_MAP[boardDetails.board_name as BoardName][stateCode];
        displayInfo = {
          state: stateInfo.name,
          color: stateInfo.displayColor || stateInfo.color,
        };
      }
      

      if (displayInfo) {
        if (!newSelectedHolds[holdId] || newSelectedHolds[holdId].state !== displayInfo.state) {
          newSelectedHolds[holdId] = displayInfo;
        } else {
          delete newSelectedHolds[holdId];
        }
      }
    }

    updateFilters({
      //@ts-expect-error will fix later
      holdsFilter: newSelectedHolds,
    });
  };

  const clearAllHolds = () => {
    const updates: Record<string, undefined> = {};

    updateFilters({
      //@ts-expect-error
      holdsFilter: {},
    });
  };

  const stateItems = [
    { value: 'ANY', label: 'Any Hold' },
    // TODO: Shouldn't be hard to implement the other hold states
    // But not sure yet if I see the point in adding those
    // { value: 'STARTING', label: 'Starting Hold' },
    // { value: 'HAND', label: 'Hand Hold' },
    // { value: 'FOOT', label: 'Foot Hold' },
    // { value: 'FINISH', label: 'Finish Hold' },
    { value: 'NOT', label: 'Not This Hold' },
  ];

  return (
    <div className="relative">
      <div className="mb-4 flex items-center gap-4">
        <p>Select hold type:</p>
        <Select
          value={selectedState}
          onChange={(value) => setSelectedState(value as HoldState)}
          style={{ width: 200 }}
          options={stateItems}
        />
      </div>
      <p className="mb-4">Click on holds to set them to the selected type</p>
      <div className="w-full max-w-2xl mx-auto">
        <BoardRenderer
          boardDetails={boardDetails}
          litUpHoldsMap={uiSearchParams.holdsFilter || {}}
          mirrored={false}
          onHoldClick={handleHoldClick}
        />
      </div>
      {Object.keys(uiSearchParams.holdsFilter || {}).length > 0 && (
        <button onClick={clearAllHolds} className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">
          Clear Selected Holds
        </button>
      )}
    </div>
  );
};

export default ClimbHoldSearchForm;
