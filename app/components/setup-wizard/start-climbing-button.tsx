'use client';

import React, { useState, useCallback } from 'react';
import { Button } from 'antd';
import Link from 'next/link';
import { BoardName } from '@/app/lib/types';
import { LayoutRow, SizeRow } from '@/app/lib/data/queries';
import { fetchBoardDetails } from '../rest-api/api';
import { constructClimbListWithSlugs } from '@/app/lib/url-utils';
import { BoardConfigData } from '@/app/lib/server-board-configs';

type StoredBoardConfig = {
  name: string;
  board: BoardName;
  layoutId: number;
  sizeId: number;
  setIds: number[];
  angle: number;
  useAsDefault: boolean;
  createdAt: string;
  lastUsed?: string;
};

type StartClimbingButtonProps = {
  selectedBoard?: BoardName;
  selectedLayout?: number;
  selectedSize?: number;
  selectedSets: number[];
  selectedAngle: number;
  configName: string;
  suggestedName: string;
  useAsDefault: boolean;
  layouts: LayoutRow[];
  sizes: SizeRow[];
  boardConfigs: BoardConfigData;
  saveConfiguration: (config: StoredBoardConfig) => Promise<void>;
  loadAllConfigurations: () => Promise<StoredBoardConfig[]>;
  setSavedConfigurations: (configs: StoredBoardConfig[]) => void;
};

export default function StartClimbingButton({
  selectedBoard,
  selectedLayout,
  selectedSize,
  selectedSets,
  selectedAngle,
  configName,
  suggestedName,
  useAsDefault,
  layouts,
  sizes,
  boardConfigs,
  saveConfiguration,
  loadAllConfigurations,
  setSavedConfigurations,
}: StartClimbingButtonProps) {
  const [isGeneratingUrl, setIsGeneratingUrl] = useState(false);
  const [climbingUrl, setClimbingUrl] = useState<string | null>(null);

  const isFormComplete = selectedBoard && selectedLayout && selectedSize && selectedSets.length > 0;

  const generateClimbingUrl = useCallback(async () => {
    if (!selectedBoard || !selectedLayout || !selectedSize || selectedSets.length === 0) {
      return null;
    }

    setIsGeneratingUrl(true);

    try {
      // Generate default name if none provided
      let configurationName = configName.trim();
      if (!configurationName) {
        const layout = layouts.find((l) => l.id === selectedLayout);
        const size = sizes.find((s) => s.id === selectedSize);

        const layoutName = layout?.name || `Layout ${selectedLayout}`;
        const sizeName = size?.name || `Size ${selectedSize}`;

        configurationName = suggestedName || `${layoutName} ${sizeName}`;
      }

      // Save configuration
      const config: StoredBoardConfig = {
        name: configurationName,
        board: selectedBoard,
        layoutId: selectedLayout,
        sizeId: selectedSize,
        setIds: selectedSets,
        angle: selectedAngle,
        useAsDefault,
        createdAt: new Date().toISOString(),
        lastUsed: new Date().toISOString(),
      };

      await saveConfiguration(config);
      // Refresh the saved configurations list
      const updatedConfigs = await loadAllConfigurations();
      setSavedConfigurations(updatedConfigs);

      const setsString = selectedSets.join(',');

      // Try to get board details for slug-based URL from cache first
      const detailsKey = `${selectedBoard}-${selectedLayout}-${selectedSize}-${setsString}`;
      let boardDetails = boardConfigs.details[detailsKey];

      if (!boardDetails) {
        boardDetails = await fetchBoardDetails(selectedBoard, selectedLayout, selectedSize, selectedSets);
      }

      if (boardDetails?.layout_name && boardDetails?.size_name && boardDetails?.set_names) {
        return constructClimbListWithSlugs(
          boardDetails.board_name,
          boardDetails.layout_name,
          boardDetails.size_name,
          boardDetails.set_names,
          selectedAngle,
        );
      } else {
        // This should not happen as boardDetails should always have the necessary fields
        throw new Error('Board details are missing required slug information');
      }
    } catch (error) {
      console.error('Error generating climbing URL:', error);
      // Re-throw error instead of falling back to old URL format
      throw error;
    } finally {
      setIsGeneratingUrl(false);
    }
  }, [
    selectedBoard,
    selectedLayout,
    selectedSize,
    selectedSets,
    selectedAngle,
    configName,
    suggestedName,
    useAsDefault,
    layouts,
    sizes,
    boardConfigs,
    saveConfiguration,
    loadAllConfigurations,
    setSavedConfigurations,
  ]);

  const handleClick = async () => {
    if (climbingUrl) {
      // URL already generated, just navigate
      return;
    }

    const url = await generateClimbingUrl();
    if (url) {
      setClimbingUrl(url);
    }
  };

  // Generate URL when form becomes complete
  React.useEffect(() => {
    if (isFormComplete) {
      generateClimbingUrl().then(setClimbingUrl);
    } else {
      setClimbingUrl(null);
    }
  }, [isFormComplete, generateClimbingUrl]);

  if (isFormComplete && climbingUrl) {
    return (
      <Link href={climbingUrl} style={{ textDecoration: 'none' }}>
        <Button type="primary" size="large" block disabled={isGeneratingUrl} loading={isGeneratingUrl}>
          {isGeneratingUrl ? 'Starting...' : 'Start Climbing'}
        </Button>
      </Link>
    );
  }

  return (
    <Button
      type="primary"
      size="large"
      block
      onClick={handleClick}
      disabled={!isFormComplete || isGeneratingUrl}
      loading={isGeneratingUrl}
    >
      {isGeneratingUrl ? 'Starting...' : 'Start Climbing'}
    </Button>
  );
}
