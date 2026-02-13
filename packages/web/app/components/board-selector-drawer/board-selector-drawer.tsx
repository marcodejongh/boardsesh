'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MuiSelect, { SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useRouter } from 'next/navigation';
import SwipeableDrawer from '../swipeable-drawer/swipeable-drawer';
import BoardScrollSection from '../board-scroll/board-scroll-section';
import BoardScrollCard from '../board-scroll/board-scroll-card';
import CreateBoardCard from '../board-scroll/create-board-card';
import { BoardConfigData } from '@/app/lib/server-board-configs';
import { BoardName } from '@/app/lib/types';
import { SUPPORTED_BOARDS, ANGLES } from '@/app/lib/board-data';
import { getDefaultSizeForLayout } from '@/app/lib/__generated__/product-sizes-data';
import { constructClimbListWithSlugs, constructBoardSlugListUrl } from '@/app/lib/url-utils';
import { loadSavedBoards, saveBoardConfig, StoredBoardConfig } from '@/app/lib/saved-boards-db';
import { setLastUsedBoard } from '@/app/lib/last-used-board-db';
import { useMyBoards } from '@/app/hooks/use-my-boards';

interface BoardSelectorDrawerProps {
  open: boolean;
  onClose: () => void;
  boardConfigs: BoardConfigData;
  placement?: 'top' | 'bottom';
  onBoardSelected?: (url: string, config?: StoredBoardConfig) => void;
}

export default function BoardSelectorDrawer({
  open,
  onClose,
  boardConfigs,
  placement = 'bottom',
  onBoardSelected,
}: BoardSelectorDrawerProps) {
  const router = useRouter();
  const [savedConfigurations, setSavedConfigurations] = useState<StoredBoardConfig[]>([]);
  const [showNewBoardForm, setShowNewBoardForm] = useState(false);
  const { boards: serverBoards, isLoading: isLoadingServerBoards } = useMyBoards(open);

  // New board form state
  const [selectedBoard, setSelectedBoard] = useState<BoardName | undefined>(undefined);
  const [selectedLayout, setSelectedLayout] = useState<number>();
  const [selectedSize, setSelectedSize] = useState<number>();
  const [selectedSets, setSelectedSets] = useState<number[]>([]);
  const [selectedAngle, setSelectedAngle] = useState<number>(40);
  const [configName, setConfigName] = useState('');

  // Derived data
  const layouts = useMemo(
    () => (selectedBoard ? boardConfigs.layouts[selectedBoard] || [] : []),
    [selectedBoard, boardConfigs.layouts],
  );
  const sizes = useMemo(
    () => (selectedBoard && selectedLayout ? boardConfigs.sizes[`${selectedBoard}-${selectedLayout}`] || [] : []),
    [selectedBoard, selectedLayout, boardConfigs.sizes],
  );
  const sets = useMemo(
    () =>
      selectedBoard && selectedLayout && selectedSize
        ? boardConfigs.sets[`${selectedBoard}-${selectedLayout}-${selectedSize}`] || []
        : [],
    [selectedBoard, selectedLayout, selectedSize, boardConfigs.sets],
  );

  // Load saved boards on open
  useEffect(() => {
    if (open) {
      loadSavedBoards().then((configs) => {
        setSavedConfigurations(configs);
      });
    }
  }, [open]);

  // Auto-cascade: layout when board changes
  useEffect(() => {
    if (!selectedBoard) {
      setSelectedLayout(undefined);
      setSelectedSize(undefined);
      setSelectedSets([]);
      return;
    }
    const availableLayouts = boardConfigs.layouts[selectedBoard] || [];
    if (availableLayouts.length > 0) {
      setSelectedLayout(availableLayouts[0].id);
    } else {
      setSelectedLayout(undefined);
    }
    setSelectedSize(undefined);
    setSelectedSets([]);
  }, [selectedBoard, boardConfigs]);

  // Auto-cascade: size when layout changes
  useEffect(() => {
    if (!selectedBoard || !selectedLayout) {
      setSelectedSize(undefined);
      setSelectedSets([]);
      return;
    }
    const defaultSizeId = getDefaultSizeForLayout(selectedBoard, selectedLayout);
    if (defaultSizeId !== null) {
      setSelectedSize(defaultSizeId);
    } else {
      const availableSizes = boardConfigs.sizes[`${selectedBoard}-${selectedLayout}`] || [];
      setSelectedSize(availableSizes.length > 0 ? availableSizes[0].id : undefined);
    }
    setSelectedSets([]);
  }, [selectedBoard, selectedLayout, boardConfigs]);

  // Auto-cascade: sets when size changes
  useEffect(() => {
    if (!selectedBoard || !selectedLayout || !selectedSize) {
      setSelectedSets([]);
      return;
    }
    const availableSets = boardConfigs.sets[`${selectedBoard}-${selectedLayout}-${selectedSize}`] || [];
    setSelectedSets(availableSets.map((s) => s.id));
  }, [selectedBoard, selectedLayout, selectedSize, boardConfigs]);

  // Compute target URL
  const targetUrl = useMemo(() => {
    if (!selectedBoard || !selectedLayout || !selectedSize || selectedSets.length === 0) {
      return null;
    }
    const layout = layouts.find((l) => l.id === selectedLayout);
    const size = sizes.find((s) => s.id === selectedSize);
    const selectedSetNames = sets.filter((s) => selectedSets.includes(s.id)).map((s) => s.name);
    if (layout && size && selectedSetNames.length > 0) {
      return constructClimbListWithSlugs(selectedBoard, layout.name, size.name, size.description, selectedSetNames, selectedAngle);
    }
    return null;
  }, [selectedBoard, selectedLayout, selectedSize, selectedSets, selectedAngle, layouts, sizes, sets]);

  const suggestedName = useMemo(() => {
    if (!selectedBoard || !selectedLayout || !selectedSize) return '';
    const layout = layouts.find((l) => l.id === selectedLayout);
    const size = sizes.find((s) => s.id === selectedSize);
    return `${layout?.name || ''} ${size?.name || ''}`.trim();
  }, [selectedBoard, selectedLayout, selectedSize, layouts, sizes]);

  const handleSelectBoard = useCallback(
    async (url: string, boardName: string, layoutName: string, sizeName: string, sizeDescription: string | undefined, setNames: string[], angle: number, config?: StoredBoardConfig) => {
      await setLastUsedBoard({
        url,
        boardName,
        layoutName,
        sizeName,
        sizeDescription,
        setNames,
        angle,
      });
      if (onBoardSelected) {
        onBoardSelected(url, config);
        onClose();
      } else {
        router.push(url);
        onClose();
      }
    },
    [router, onClose, onBoardSelected],
  );

  const handleServerBoardSelect = useCallback(
    (board: (typeof serverBoards)[number]) => {
      const url = constructBoardSlugListUrl(board.slug, board.angle);
      const config: StoredBoardConfig = {
        name: board.name,
        board: board.boardType as BoardName,
        layoutId: board.layoutId,
        sizeId: board.sizeId,
        setIds: board.setIds.split(',').map(Number),
        angle: board.angle,
        createdAt: board.createdAt,
      };
      if (onBoardSelected) {
        onBoardSelected(url, config);
        onClose();
      } else {
        router.push(url);
        onClose();
      }
    },
    [router, onClose, onBoardSelected],
  );

  const handleSavedConfigSelect = useCallback(
    (config: StoredBoardConfig) => {
      const layouts = boardConfigs.layouts[config.board] || [];
      const sizes = boardConfigs.sizes[`${config.board}-${config.layoutId}`] || [];
      const configSets = boardConfigs.sets[`${config.board}-${config.layoutId}-${config.sizeId}`] || [];
      const layout = layouts.find((l) => l.id === config.layoutId);
      const size = sizes.find((s) => s.id === config.sizeId);
      const setNames = configSets.filter((s) => config.setIds.includes(s.id)).map((s) => s.name);
      const angle = config.angle || 40;

      if (layout && size && setNames.length > 0) {
        const url = constructClimbListWithSlugs(config.board, layout.name, size.name, size.description, setNames, angle);
        handleSelectBoard(url, config.board, layout.name, size.name, size.description, setNames, angle, config);
      }
    },
    [boardConfigs, handleSelectBoard],
  );

  const handleOpenNewBoardForm = useCallback(() => {
    if (!selectedBoard && SUPPORTED_BOARDS.length > 0) {
      setSelectedBoard(SUPPORTED_BOARDS[0] as BoardName);
    }
    setShowNewBoardForm(true);
  }, [selectedBoard]);

  const handleStartClimbing = async () => {
    if (!selectedBoard || !selectedLayout || !selectedSize || selectedSets.length === 0 || !targetUrl) {
      return;
    }

    let name = configName.trim();
    if (!name) {
      name = suggestedName || `${selectedBoard} board`;
    }

    const layout = layouts.find((l) => l.id === selectedLayout);
    const size = sizes.find((s) => s.id === selectedSize);
    const selectedSetNames = sets.filter((s) => selectedSets.includes(s.id)).map((s) => s.name);

    const config: StoredBoardConfig = {
      name,
      board: selectedBoard,
      layoutId: selectedLayout,
      sizeId: selectedSize,
      setIds: selectedSets,
      angle: selectedAngle,
      createdAt: new Date().toISOString(),
      lastUsed: new Date().toISOString(),
    };

    await saveBoardConfig(config);
    setShowNewBoardForm(false);
    await handleSelectBoard(
      targetUrl,
      selectedBoard,
      layout?.name || '',
      size?.name || '',
      size?.description,
      selectedSetNames,
      selectedAngle,
      config,
    );
  };

  const isFormComplete = selectedBoard && selectedLayout && selectedSize && selectedSets.length > 0;
  const hasServerBoards = serverBoards.length > 0;
  const hasSavedConfigs = savedConfigurations.length > 0;
  const isEmpty = !isLoadingServerBoards && !hasServerBoards && !hasSavedConfigs;

  return (
    <>
      <SwipeableDrawer
        title="Select Board"
        placement={placement}
        open={open}
        onClose={onClose}
        height="85dvh"
      >
        {/* My Boards (server-side) */}
        {(hasServerBoards || isLoadingServerBoards) && (
          <BoardScrollSection title="My Boards" loading={isLoadingServerBoards}>
            <CreateBoardCard onClick={handleOpenNewBoardForm} />
            {serverBoards.map((board) => (
              <BoardScrollCard
                key={board.uuid}
                userBoard={board}
                onClick={() => handleServerBoardSelect(board)}
              />
            ))}
          </BoardScrollSection>
        )}

        {/* Recently Used (local configs) */}
        {hasSavedConfigs && (
          <BoardScrollSection title="Recently Used">
            {!hasServerBoards && (
              <CreateBoardCard onClick={handleOpenNewBoardForm} />
            )}
            {savedConfigurations.map((config) => (
              <BoardScrollCard
                key={config.name}
                storedConfig={config}
                boardConfigs={boardConfigs}
                onClick={() => handleSavedConfigSelect(config)}
              />
            ))}
          </BoardScrollSection>
        )}

        {/* Empty state */}
        {isEmpty && (
          <Box sx={{ textAlign: 'center', py: 4, px: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              No saved boards yet. Create a new board to get started.
            </Typography>
            <Button variant="contained" onClick={handleOpenNewBoardForm}>
              Create New Board
            </Button>
          </Box>
        )}
      </SwipeableDrawer>

      {/* Nested New Board form drawer */}
      <SwipeableDrawer
        title="New Board"
        placement={placement}
        open={showNewBoardForm}
        onClose={() => setShowNewBoardForm(false)}
        height="85dvh"
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Board</InputLabel>
            <MuiSelect
              value={selectedBoard || ''}
              label="Board"
              onChange={(e: SelectChangeEvent) => setSelectedBoard(e.target.value as BoardName)}
            >
              {SUPPORTED_BOARDS.map((board) => (
                <MenuItem key={board} value={board}>
                  {board.charAt(0).toUpperCase() + board.slice(1)}
                </MenuItem>
              ))}
            </MuiSelect>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel>Layout</InputLabel>
            <MuiSelect
              value={selectedLayout ?? ''}
              label="Layout"
              onChange={(e: SelectChangeEvent<number | string>) => setSelectedLayout(e.target.value as number)}
              disabled={!selectedBoard}
            >
              {layouts.map(({ id, name }) => (
                <MenuItem key={id} value={id}>{name}</MenuItem>
              ))}
            </MuiSelect>
          </FormControl>

          {selectedBoard !== 'moonboard' && (
            <FormControl fullWidth size="small">
              <InputLabel>Size</InputLabel>
              <MuiSelect
                value={selectedSize ?? ''}
                label="Size"
                onChange={(e: SelectChangeEvent<number | string>) => setSelectedSize(e.target.value as number)}
                disabled={!selectedLayout}
              >
                {sizes.map(({ id, name, description }) => (
                  <MenuItem key={id} value={id}>{`${name} ${description}`}</MenuItem>
                ))}
              </MuiSelect>
            </FormControl>
          )}

          <FormControl fullWidth size="small">
            <InputLabel>Hold Sets</InputLabel>
            <MuiSelect<number[]>
              multiple
              value={selectedSets}
              label="Hold Sets"
              onChange={(e) => setSelectedSets(e.target.value as number[])}
              disabled={!selectedSize}
            >
              {sets.map(({ id, name }) => (
                <MenuItem key={id} value={id}>{name}</MenuItem>
              ))}
            </MuiSelect>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel>Angle</InputLabel>
            <MuiSelect
              value={selectedAngle}
              label="Angle"
              onChange={(e: SelectChangeEvent<number>) => setSelectedAngle(e.target.value as number)}
              disabled={!selectedBoard}
            >
              {selectedBoard &&
                ANGLES[selectedBoard].map((angle) => (
                  <MenuItem key={angle} value={angle}>{angle}</MenuItem>
                ))}
            </MuiSelect>
          </FormControl>

          <TextField
            value={configName}
            onChange={(e) => setConfigName(e.target.value)}
            placeholder={suggestedName || 'Board name (optional)'}
            variant="outlined"
            size="small"
            fullWidth
            inputProps={{ maxLength: 50 }}
          />

          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={handleStartClimbing}
            disabled={!isFormComplete}
          >
            Save & Select
          </Button>
        </Box>
      </SwipeableDrawer>
    </>
  );
}
