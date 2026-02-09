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
import IconButton from '@mui/material/IconButton';
import EditOutlined from '@mui/icons-material/EditOutlined';
import { useRouter } from 'next/navigation';
import SwipeableDrawer from '../swipeable-drawer/swipeable-drawer';
import BoardConfigPreview from '../setup-wizard/board-config-preview';
import { BoardConfigData } from '@/app/lib/server-board-configs';
import { BoardName } from '@/app/lib/types';
import { SUPPORTED_BOARDS, ANGLES } from '@/app/lib/board-data';
import { getDefaultSizeForLayout } from '@/app/lib/__generated__/product-sizes-data';
import { constructClimbListWithSlugs, constructBoardSlugListUrl } from '@/app/lib/url-utils';
import { loadSavedBoards, saveBoardConfig, deleteBoardConfig, StoredBoardConfig } from '@/app/lib/saved-boards-db';
import { setLastUsedBoard } from '@/app/lib/last-used-board-db';
import { useWsAuthToken } from '@/app/hooks/use-ws-auth-token';
import { createGraphQLHttpClient } from '@/app/lib/graphql/client';
import { GET_MY_BOARDS, type GetMyBoardsQueryResponse } from '@/app/lib/graphql/operations';
import type { UserBoard } from '@boardsesh/shared-schema';
import Chip from '@mui/material/Chip';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import LocationOnOutlined from '@mui/icons-material/LocationOnOutlined';
import CircularProgress from '@mui/material/CircularProgress';
import { themeTokens } from '@/app/theme/theme-config';
import styles from './board-selector-drawer.module.css';

interface BoardSelectorDrawerProps {
  open: boolean;
  onClose: () => void;
  boardConfigs: BoardConfigData;
  onBoardSelected?: (url: string) => void;
}

export default function BoardSelectorDrawer({
  open,
  onClose,
  boardConfigs,
  onBoardSelected,
}: BoardSelectorDrawerProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'saved' | 'new'>('saved');
  const [savedConfigurations, setSavedConfigurations] = useState<StoredBoardConfig[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [serverBoards, setServerBoards] = useState<UserBoard[]>([]);
  const [isLoadingServerBoards, setIsLoadingServerBoards] = useState(false);
  const { token, isAuthenticated } = useWsAuthToken();

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
        // Default to "new" tab if no saved boards
        if (configs.length === 0) {
          setActiveTab('new');
          if (!selectedBoard && SUPPORTED_BOARDS.length > 0) {
            setSelectedBoard(SUPPORTED_BOARDS[0] as BoardName);
          }
        }
      });
    }
  }, [open, selectedBoard]);

  // Fetch server-side board entities (owned + followed)
  useEffect(() => {
    if (!open || !isAuthenticated || !token) return;
    setIsLoadingServerBoards(true);
    const client = createGraphQLHttpClient(token);
    client
      .request<GetMyBoardsQueryResponse>(GET_MY_BOARDS, { input: { limit: 50, offset: 0 } })
      .then((data) => setServerBoards(data.myBoards.boards))
      .catch((err) => console.error('Failed to fetch boards:', err))
      .finally(() => setIsLoadingServerBoards(false));
  }, [open, isAuthenticated, token]);

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
    async (url: string, boardName: string, layoutName: string, sizeName: string, sizeDescription: string | undefined, setNames: string[], angle: number) => {
      await setLastUsedBoard({
        url,
        boardName,
        layoutName,
        sizeName,
        sizeDescription,
        setNames,
        angle,
      });
      onBoardSelected?.(url);
      router.push(url);
      onClose();
    },
    [router, onClose, onBoardSelected],
  );

  const handleSavedBoardSelect = useCallback(() => {
    // Navigation handled by Link in BoardConfigPreview
  }, []);

  const handleDeleteConfig = useCallback(
    async (name: string) => {
      await deleteBoardConfig(name);
      const updated = await loadSavedBoards();
      setSavedConfigurations(updated);
    },
    [],
  );

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
    await handleSelectBoard(
      targetUrl,
      selectedBoard,
      layout?.name || '',
      size?.name || '',
      size?.description,
      selectedSetNames,
      selectedAngle,
    );
  };

  const isFormComplete = selectedBoard && selectedLayout && selectedSize && selectedSets.length > 0;

  return (
    <SwipeableDrawer
      title="Select Board"
      placement="bottom"
      open={open}
      onClose={onClose}
      height="85dvh"
      extra={
        activeTab === 'saved' && savedConfigurations.length > 0 ? (
          <IconButton
            color={isEditMode ? 'primary' : 'default'}
            size="small"
            onClick={() => setIsEditMode(!isEditMode)}
          >
            <EditOutlined />
          </IconButton>
        ) : undefined
      }
    >
      {/* Pill tabs */}
      <div className={styles.pillContainer}>
        <button
          className={`${styles.pill} ${activeTab === 'saved' ? styles.pillActive : ''}`}
          onClick={() => setActiveTab('saved')}
        >
          Saved Boards ({savedConfigurations.length})
        </button>
        <button
          className={`${styles.pill} ${activeTab === 'new' ? styles.pillActive : ''}`}
          onClick={() => {
            setActiveTab('new');
            if (!selectedBoard && SUPPORTED_BOARDS.length > 0) {
              setSelectedBoard(SUPPORTED_BOARDS[0] as BoardName);
            }
          }}
        >
          New Board
        </button>
      </div>

      {activeTab === 'saved' && (
        <>
          {/* Server-side board entities (owned + followed) */}
          {isLoadingServerBoards ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : serverBoards.length > 0 ? (
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ px: 1, mb: 1, display: 'block' }}>
                My Boards
              </Typography>
              <Box className={styles.boardGrid}>
                {serverBoards.map((board) => (
                  <ServerBoardCard
                    key={board.uuid}
                    board={board}
                    onSelect={() => {
                      router.push(constructBoardSlugListUrl(board.slug, 40));
                      onClose();
                    }}
                  />
                ))}
              </Box>
            </Box>
          ) : null}

          {/* Locally saved board configurations */}
          {savedConfigurations.length > 0 ? (
            <>
              {serverBoards.length > 0 && (
                <Typography variant="caption" color="text.secondary" sx={{ px: 1, mb: 1, display: 'block' }}>
                  Local Configurations
                </Typography>
              )}
              <Box className={styles.boardGrid}>
                {savedConfigurations.map((config) => (
                  <BoardConfigPreview
                    key={config.name}
                    config={config}
                    onDelete={handleDeleteConfig}
                    onSelect={handleSavedBoardSelect}
                    boardConfigs={boardConfigs}
                    isEditMode={isEditMode}
                  />
                ))}
              </Box>
            </>
          ) : serverBoards.length === 0 ? (
            <div className={styles.emptyState}>
              <Typography variant="body2" color="text.secondary">
                No saved boards yet. Configure a new board to get started.
              </Typography>
            </div>
          ) : null}
        </>
      )}

      {activeTab === 'new' && (
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
            Start Climbing
          </Button>
        </Box>
      )}
    </SwipeableDrawer>
  );
}

const BOARD_TYPE_LABELS: Record<string, string> = {
  kilter: 'Kilter',
  tension: 'Tension',
  moonboard: 'MoonBoard',
  decoy: 'Decoy',
  touchstone: 'Touchstone',
  grasshopper: 'Grasshopper',
  soill: 'So iLL',
};

function ServerBoardCard({ board, onSelect }: { board: UserBoard; onSelect: () => void }) {
  return (
    <Card variant="outlined" sx={{ minWidth: 0, borderRadius: `${themeTokens.borderRadius.md}px` }}>
      <CardActionArea onClick={onSelect}>
        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 0.5 }}>
            <Typography variant="body2" fontWeight={600} noWrap>
              {board.name}
            </Typography>
            <Chip
              label={BOARD_TYPE_LABELS[board.boardType] || board.boardType}
              size="small"
              variant="outlined"
              sx={{ fontSize: 11, height: 20, flexShrink: 0 }}
            />
          </Box>
          {board.locationName && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
              <LocationOnOutlined sx={{ fontSize: 12, color: themeTokens.neutral[400] }} />
              <Typography variant="caption" color="text.secondary" noWrap>
                {board.locationName}
              </Typography>
            </Box>
          )}
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
