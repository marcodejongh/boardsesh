'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import MuiSelect, { SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MuiSwitch from '@mui/material/Switch';
import MuiTabs from '@mui/material/Tabs';
import MuiTab from '@mui/material/Tab';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import MuiTooltip from '@mui/material/Tooltip';
import ExpandMoreOutlined from '@mui/icons-material/ExpandMoreOutlined';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import MuiDivider from '@mui/material/Divider';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import GitHub from '@mui/icons-material/GitHub';
import EditOutlined from '@mui/icons-material/EditOutlined';
import GroupOutlined from '@mui/icons-material/GroupOutlined';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import HelpOutlineOutlined from '@mui/icons-material/HelpOutlineOutlined';
import { track } from '@vercel/analytics';
import { useSession } from 'next-auth/react';
import { SUPPORTED_BOARDS, ANGLES } from '@/app/lib/board-data';
import { BoardName, BoardDetails } from '@/app/lib/types';
import { getDefaultSizeForLayout, getBoardDetails } from '@/app/lib/__generated__/product-sizes-data';
import { getMoonBoardDetails } from '@/app/lib/moonboard-config';
import BoardConfigPreview from './board-config-preview';
import BoardRenderer from '../board-renderer/board-renderer';
import { constructClimbListWithSlugs } from '@/app/lib/url-utils';
import { BoardConfigData } from '@/app/lib/server-board-configs';
import Logo from '../brand/logo';
import { TabPanel } from '@/app/components/ui/tab-panel';
import { themeTokens } from '@/app/theme/theme-config';
import JoinSessionTab from './join-session-tab';
import SessionHistoryPanel from './session-history-panel';
import AuthModal from '../auth/auth-modal';
import { loadSavedBoards, saveBoardConfig, deleteBoardConfig, StoredBoardConfig } from '@/app/lib/saved-boards-db';
import { setLastUsedBoard } from '@/app/lib/last-used-board-db';

type ConsolidatedBoardConfigProps = {
  boardConfigs: BoardConfigData;
};

const ConsolidatedBoardConfig = ({ boardConfigs }: ConsolidatedBoardConfigProps) => {
  const router = useRouter();
  const { data: session } = useSession();

  // Selection states
  const [configName, setConfigName] = useState<string>('');
  const [selectedBoard, setSelectedBoard] = useState<BoardName | undefined>(undefined);
  const [selectedLayout, setSelectedLayout] = useState<number>();
  const [selectedSize, setSelectedSize] = useState<number>();
  const [selectedSets, setSelectedSets] = useState<number[]>([]);
  const [selectedAngle, setSelectedAngle] = useState<number>(40);

  // Session settings states
  const [allowOthersToJoin, setAllowOthersToJoin] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [activeTab, setActiveTab] = useState('start');

  // Data states - no longer needed as we get them from props
  const layouts = useMemo(() => selectedBoard ? boardConfigs.layouts[selectedBoard] || [] : [], [selectedBoard, boardConfigs.layouts]);
  const sizes = useMemo(() => selectedBoard && selectedLayout ? boardConfigs.sizes[`${selectedBoard}-${selectedLayout}`] || [] : [], [selectedBoard, selectedLayout, boardConfigs.sizes]);
  const sets = useMemo(() =>
    selectedBoard && selectedLayout && selectedSize
      ? boardConfigs.sets[`${selectedBoard}-${selectedLayout}-${selectedSize}`] || []
      : [], [selectedBoard, selectedLayout, selectedSize, boardConfigs.sets]);

  // Login states - for now just skip login on setup page

  // Additional states
  const [savedConfigurations, setSavedConfigurations] = useState<StoredBoardConfig[]>([]);
  const [suggestedName, setSuggestedName] = useState<string>('');
  const [savedBoardsExpanded, setSavedBoardsExpanded] = useState(false);
  const [previewExpanded, setPreviewExpanded] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // Get board details for the preview (shared with loading animation)
  const [previewBoardDetails, setPreviewBoardDetails] = useState<BoardDetails | null>(null);

  // Load board details for preview when configuration changes
  useEffect(() => {
    if (!selectedBoard || !selectedLayout || !selectedSize || selectedSets.length === 0) {
      setPreviewBoardDetails(null);
      return;
    }

    try {
      const detailsKey = `${selectedBoard}-${selectedLayout}-${selectedSize}-${selectedSets.join(',')}`;
      const cachedDetails = boardConfigs.details[detailsKey];

      if (cachedDetails) {
        setPreviewBoardDetails(cachedDetails);
      } else if (selectedBoard === 'moonboard') {
        // Moonboard uses its own details function
        const details = getMoonBoardDetails({
          layout_id: selectedLayout,
          set_ids: selectedSets,
        });
        setPreviewBoardDetails(details);
      } else {
        const details = getBoardDetails({
          board_name: selectedBoard,
          layout_id: selectedLayout,
          size_id: selectedSize,
          set_ids: selectedSets,
        });
        setPreviewBoardDetails(details);
      }
    } catch (error) {
      console.error('Failed to load preview details:', error);
      setPreviewBoardDetails(null);
    }
  }, [selectedBoard, selectedLayout, selectedSize, selectedSets, boardConfigs]);

  const deleteConfiguration = async (name: string) => {
    await deleteBoardConfig(name);
    const updatedConfigs = await loadSavedBoards();
    setSavedConfigurations(updatedConfigs);
  };

  // Generate suggested name based on current selections
  const generateSuggestedName = useCallback(() => {
    if (!selectedBoard || !selectedLayout || !selectedSize) {
      setSuggestedName('');
      return;
    }

    const layout = layouts.find((l) => l.id === selectedLayout);
    const size = sizes.find((s) => s.id === selectedSize);

    const layoutName = layout?.name || `Layout ${selectedLayout}`;
    const sizeName = size?.name || `Size ${selectedSize}`;

    setSuggestedName(`${layoutName} ${sizeName}`);
  }, [selectedBoard, selectedLayout, selectedSize, layouts, sizes]);

  // Prefetch images for common board configurations
  useEffect(() => {
    const prefetchImages = () => {
      Object.values(boardConfigs.details).forEach((details) => {
        if (!details) return;
        Object.keys(details.images_to_holds).forEach((imageUrl) => {
          const fullUrl = `/images/${details.board_name}/${imageUrl}`;
          const link = document.createElement('link');
          link.rel = 'prefetch';
          link.href = fullUrl;
          link.as = 'image';
          document.head.appendChild(link);
        });
      });
    };
    prefetchImages();
  }, [boardConfigs.details]);

  // Load configurations on mount
  useEffect(() => {
    const loadConfigurations = async () => {
      const allConfigs = await loadSavedBoards();
      setSavedConfigurations(allConfigs);

      if (allConfigs.length > 0) {
        setSavedBoardsExpanded(true);
      }
    };

    loadConfigurations();
  }, []);

  // Set default selections on initial load if no saved configs exist
  useEffect(() => {
    // Only set defaults if no board is selected and no saved configs exist
    if (!selectedBoard && savedConfigurations.length === 0) {
      // Auto-select first board
      if (SUPPORTED_BOARDS.length > 0) {
        setSelectedBoard(SUPPORTED_BOARDS[0] as BoardName);
      }

      // Auto-select first angle (40 degrees is already the default)
      // Keep the existing default angle of 40
    }
  }, [selectedBoard, savedConfigurations]);

  // Reset dependent selections when parent changes
  useEffect(() => {
    if (!selectedBoard) {
      setSelectedLayout(undefined);
      setSelectedSize(undefined);
      setSelectedSets([]);
      return;
    }

    // Auto-select first layout when board changes
    const availableLayouts = boardConfigs.layouts[selectedBoard] || [];
    if (availableLayouts.length > 0) {
      setSelectedLayout(availableLayouts[0].id);
    } else {
      setSelectedLayout(undefined);
    }

    setSelectedSize(undefined);
    setSelectedSets([]);
  }, [selectedBoard, boardConfigs]);

  useEffect(() => {
    if (!selectedBoard || !selectedLayout) {
      setSelectedSize(undefined);
      setSelectedSets([]);
      return;
    }

    // Auto-select default size for this layout (or first available if no default)
    const defaultSizeId = getDefaultSizeForLayout(selectedBoard, selectedLayout);
    if (defaultSizeId !== null) {
      setSelectedSize(defaultSizeId);
    } else {
      // Fall back to first available size from board configs (needed for moonboard
      // which has sizes in boardConfigs but not in the generated product-sizes-data)
      const availableSizes = boardConfigs.sizes[`${selectedBoard}-${selectedLayout}`] || [];
      if (availableSizes.length > 0) {
        setSelectedSize(availableSizes[0].id);
      } else {
        setSelectedSize(undefined);
      }
    }

    setSelectedSets([]);
  }, [selectedBoard, selectedLayout]);

  useEffect(() => {
    if (!selectedBoard || !selectedLayout || !selectedSize) {
      setSelectedSets([]);
      return;
    }

    // Auto-select all available sets when size is selected
    const availableSets = boardConfigs.sets[`${selectedBoard}-${selectedLayout}-${selectedSize}`] || [];
    const allSetIds = availableSets.map((set) => set.id);
    setSelectedSets(allSetIds);
  }, [selectedBoard, selectedLayout, selectedSize, boardConfigs]);

  // Update suggested name when selections change
  useEffect(() => {
    generateSuggestedName();
  }, [selectedBoard, selectedLayout, selectedSize, generateSuggestedName]);

  // Compute target URL for navigation optimization - always use SEO-friendly slug URLs
  const targetUrl = useMemo(() => {
    if (!selectedBoard || !selectedLayout || !selectedSize || selectedSets.length === 0) {
      return null;
    }

    // Get names from the locally available data (layouts, sizes, sets arrays)
    const layout = layouts.find((l) => l.id === selectedLayout);
    const size = sizes.find((s) => s.id === selectedSize);
    const selectedSetNames = sets
      .filter((s) => selectedSets.includes(s.id))
      .map((s) => s.name);

    if (layout && size && selectedSetNames.length > 0) {
      // Go to list view for all boards
      return constructClimbListWithSlugs(
        selectedBoard,
        layout.name,
        size.name,
        size.description,
        selectedSetNames,
        selectedAngle,
      );
    }

    return null;
  }, [selectedBoard, selectedLayout, selectedSize, selectedSets, selectedAngle, layouts, sizes, sets]);

  const handleFormChange = () => {
    // Don't automatically expand saved configurations when form changes
    // Let user control collapse state manually
  };

  const handleBoardChange = (value: BoardName) => {
    setSelectedBoard(value);
    handleFormChange();
  };

  const handleLayoutChange = (value: number) => {
    setSelectedLayout(value);
    handleFormChange();
  };

  const handleSizeChange = (value: number) => {
    setSelectedSize(value);
    handleFormChange();
  };

  const handleSetsChange = (value: number[]) => {
    setSelectedSets(value);
    handleFormChange();
  };

  const handleAngleChange = (value: number) => {
    setSelectedAngle(value);
    handleFormChange();
  };

  // Login will be handled after reaching the main board page

  const handleSavedBoardSelect = () => {
    // Navigation happens via the Link component
    // Suspense boundary in layout.tsx will show skeleton during loading
  };

  const handleStartClimbing = async () => {
    if (!selectedBoard || !selectedLayout || !selectedSize || selectedSets.length === 0) {
      return;
    }

    try {
      // Generate default name if none provided
      let configurationName = configName.trim();
      if (!configurationName) {
        const layout = layouts.find((l) => l.id === selectedLayout);
        const size = sizes.find((s) => s.id === selectedSize);

        const layoutName = layout?.name || `Layout ${selectedLayout}`;
        const sizeName = size?.name || `Size ${selectedSize}`;

        configurationName = `${layoutName} ${sizeName}`;
      }

      // Track board configuration completion
      track('Board Configuration Completed', {
        boardLayout: selectedLayout,
      });

      const layout = layouts.find((l) => l.id === selectedLayout);
      const size = sizes.find((s) => s.id === selectedSize);
      const selectedSetNames = sets
        .filter((s) => selectedSets.includes(s.id))
        .map((s) => s.name);

      // Always save configuration with either user-provided or generated name
      const config: StoredBoardConfig = {
        name: configurationName,
        board: selectedBoard,
        layoutId: selectedLayout,
        sizeId: selectedSize,
        setIds: selectedSets,
        angle: selectedAngle,
        createdAt: new Date().toISOString(),
        lastUsed: new Date().toISOString(),
      };

      await saveBoardConfig(config);
      // Refresh the saved configurations list
      const updatedConfigs = await loadSavedBoards();
      setSavedConfigurations(updatedConfigs);

      // Save as last used board
      if (targetUrl) {
        await setLastUsedBoard({
          url: targetUrl,
          boardName: selectedBoard,
          layoutName: layout?.name || '',
          sizeName: size?.name || '',
          sizeDescription: size?.description,
          setNames: selectedSetNames,
          angle: selectedAngle,
        });
        router.push(targetUrl);
      }
    } catch (error) {
      console.error('Error starting climbing session:', error);
    }
  };

  const isFormComplete = selectedBoard && selectedLayout && selectedSize && selectedSets.length > 0;

  return (
    <Box
        sx={{
          padding: `${themeTokens.spacing[6]}px`,
          maxWidth: '600px',
          margin: '0 auto',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        <Card sx={{ boxShadow: themeTokens.shadows.lg }}>
          <CardContent>
            <Box sx={{ textAlign: 'center', marginBottom: `${themeTokens.spacing[4]}px` }}>
              <Box sx={{ display: 'flex', justifyContent: 'center', marginBottom: `${themeTokens.spacing[4]}px` }}>
                <Logo size="lg" showText={true} linkToHome={false} />
              </Box>
            </Box>

            <MuiTabs
              value={activeTab}
              onChange={(_, v) => setActiveTab(v)}
              centered
            >
              <MuiTab label="Start a sesh" value="start" />
              <MuiTab label="Join a sesh" value="join" />
            </MuiTabs>

            <TabPanel value={activeTab} index="start">
                      <SessionHistoryPanel />

                      <Accordion
                        expanded={savedBoardsExpanded}
                        onChange={(_, isExpanded) => setSavedBoardsExpanded(isExpanded)}
                        elevation={0}
                        sx={{ '&:before': { display: 'none' } }}
                      >
                        <AccordionSummary expandIcon={<ExpandMoreOutlined />}>
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ width: '100%' }}>
                            <Typography variant="body2" sx={{ flexGrow: 1 }}>
                              {`Saved Boards (${savedConfigurations.length})`}
                            </Typography>
                            {savedConfigurations.length > 0 && (
                              <IconButton
                                color={isEditMode ? 'primary' : 'default'}
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setIsEditMode(!isEditMode);
                                }}
                              >
                                <EditOutlined />
                              </IconButton>
                            )}
                          </Stack>
                        </AccordionSummary>
                        <AccordionDetails>
                          {savedConfigurations.length > 0 ? (
                            <Box
                              sx={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(2, 1fr)',
                                gap: '16px',
                                width: '100%',
                                overflow: 'hidden',
                              }}
                            >
                              {savedConfigurations.map((config) => (
                                <BoardConfigPreview
                                  key={config.name}
                                  config={config}
                                  onDelete={deleteConfiguration}
                                  onSelect={handleSavedBoardSelect}
                                  boardConfigs={boardConfigs}
                                  isEditMode={isEditMode}
                                />
                              ))}
                            </Box>
                          ) : (
                            <Typography variant="body2" component="span" color="text.secondary">No saved boards yet. Configure your board below and it will be saved automatically.</Typography>
                          )}
                        </AccordionDetails>
                      </Accordion>
          <MuiDivider />

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>Board Configuration *</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                <Box sx={{ width: { xs: '100%', sm: '50%' } }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Board</InputLabel>
                    <MuiSelect
                      value={selectedBoard || ''}
                      label="Board"
                      onChange={(e: SelectChangeEvent) => handleBoardChange(e.target.value as BoardName)}
                    >
                      {SUPPORTED_BOARDS.map((board_name) => (
                        <MenuItem key={board_name} value={board_name}>
                          {board_name.charAt(0).toUpperCase() + board_name.slice(1)}
                        </MenuItem>
                      ))}
                    </MuiSelect>
                  </FormControl>
                </Box>

                <Box sx={{ width: { xs: '100%', sm: '50%' } }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Layout</InputLabel>
                    <MuiSelect
                      value={selectedLayout ?? ''}
                      label="Layout"
                      onChange={(e: SelectChangeEvent<number | string>) => handleLayoutChange(e.target.value as number)}
                      disabled={!selectedBoard}
                    >
                      {layouts.map(({ id: layoutId, name: layoutName }) => (
                        <MenuItem key={layoutId} value={layoutId}>
                          {layoutName}
                        </MenuItem>
                      ))}
                    </MuiSelect>
                  </FormControl>
                </Box>

                {selectedBoard !== 'moonboard' && (
                  <Box sx={{ width: { xs: '100%', sm: '50%' } }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Size</InputLabel>
                      <MuiSelect
                        value={selectedSize ?? ''}
                        label="Size"
                        onChange={(e: SelectChangeEvent<number | string>) => handleSizeChange(e.target.value as number)}
                        disabled={!selectedLayout}
                      >
                        {sizes.map(({ id, name, description }) => (
                          <MenuItem key={id} value={id}>
                            {`${name} ${description}`}
                          </MenuItem>
                        ))}
                      </MuiSelect>
                    </FormControl>
                  </Box>
                )}

                <Box sx={{ width: { xs: '100%', sm: '50%' } }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Hold Sets</InputLabel>
                    <MuiSelect<number[]>
                      multiple
                      value={selectedSets}
                      label="Hold Sets"
                      onChange={(e) => handleSetsChange(e.target.value as number[])}
                      disabled={!selectedSize}
                    >
                      {sets.map(({ id, name }) => (
                        <MenuItem key={id} value={id}>
                          {name}
                        </MenuItem>
                      ))}
                    </MuiSelect>
                  </FormControl>
                </Box>

                <Box sx={{ width: { xs: '100%', sm: '50%' } }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Angle</InputLabel>
                    <MuiSelect
                      value={selectedAngle}
                      label="Angle"
                      onChange={(e: SelectChangeEvent<number>) => handleAngleChange(e.target.value as number)}
                      disabled={!selectedBoard}
                    >
                      {selectedBoard &&
                        ANGLES[selectedBoard].map((angle) => (
                          <MenuItem key={angle} value={angle}>
                            {angle}
                          </MenuItem>
                        ))}
                    </MuiSelect>
                  </FormControl>
                </Box>
              </Box>
            </Box>

            <Box>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>Board Name (Optional)</Typography>
              <TextField
                value={configName}
                onChange={(e) => setConfigName(e.target.value)}
                placeholder={suggestedName || 'Enter a name for this board'}
                variant="outlined"
                size="small"
                fullWidth
                inputProps={{ maxLength: 50 }}
              />
            </Box>

            <Box>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>Session Settings</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: `${themeTokens.spacing[2]}px` }}>
                <MuiSwitch
                  checked={allowOthersToJoin}
                  onChange={(_, checked) => {
                    if (checked && !session) {
                      setShowAuthModal(true);
                    } else {
                      setAllowOthersToJoin(checked);
                    }
                  }}
                />
                <Box component="span">
                  <GroupOutlined sx={{ marginRight: `${themeTokens.spacing[1]}px` }} />
                  Allow others nearby to join
                </Box>
                <MuiTooltip title="When enabled, climbers within 500 meters can find and join your session. Requires you to be signed in.">
                  <InfoOutlined sx={{ color: 'var(--neutral-400)' }} />
                </MuiTooltip>
              </Box>
              {allowOthersToJoin && !session && (
                <Typography variant="body2" component="span" sx={{ display: 'block', marginTop: `${themeTokens.spacing[2]}px`, color: 'warning.main' }}>
                  Please sign in to enable discoverable sessions.
                </Typography>
              )}
            </Box>

            {targetUrl ? (
              <Link href={targetUrl} onClick={handleStartClimbing}>
                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  disabled={!isFormComplete}
                >
                  Start Climbing
                </Button>
              </Link>
            ) : (
              <Button
                variant="contained"
                size="large"
                fullWidth
                onClick={handleStartClimbing}
                disabled={!isFormComplete}
              >
                Start Climbing
              </Button>
            )}
          </Box>

          {isFormComplete && (
            <>
              <MuiDivider />
              <Accordion
                expanded={previewExpanded}
                onChange={(_, isExpanded) => setPreviewExpanded(isExpanded)}
                elevation={0}
                sx={{ '&:before': { display: 'none' } }}
              >
                <AccordionSummary expandIcon={<ExpandMoreOutlined />}>
                  <Typography variant="body2">Preview</Typography>
                </AccordionSummary>
                <AccordionDetails>
                      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        {previewBoardDetails ? (
                          <Card
                            sx={{ width: 400 }}
                          >
                            <BoardRenderer litUpHoldsMap={{}} mirrored={false} boardDetails={previewBoardDetails} thumbnail={false} />
                          </Card>
                        ) : selectedBoard && selectedLayout && selectedSize && selectedSets.length > 0 ? (
                          <Card sx={{ width: 400 }}>
                            <CardContent>
                              <Box sx={{ textAlign: 'center', padding: '20px' }}>
                                <Box sx={{ color: themeTokens.colors.primary, marginBottom: '8px' }}>
                                  Loading preview...
                                </Box>
                              </Box>
                            </CardContent>
                          </Card>
                        ) : (
                          <Card sx={{ width: 400, textAlign: 'center' }}>
                            <CardContent>
                              <Typography variant="body2" component="span" color="text.secondary">Select board configuration to see preview</Typography>
                            </CardContent>
                          </Card>
                        )}
                      </Box>
                </AccordionDetails>
              </Accordion>
            </>
          )}
            </TabPanel>

            <TabPanel value={activeTab} index="join">
              <JoinSessionTab />
            </TabPanel>

          <MuiDivider />
          <Stack direction="row" spacing={1} sx={{ width: '100%', justifyContent: 'center' }}>
            <a href="https://github.com/marcodejongh/boardsesh" target="_blank" rel="noopener noreferrer">
              <Button variant="text" startIcon={<GitHub />}>
                GitHub
              </Button>
            </a>
            <a href="https://discord.gg/YXA8GsXfQK" target="_blank" rel="noopener noreferrer">
              <Button
                variant="text"
                startIcon={
                  <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                  </svg>
                }
              >
                Discord
              </Button>
            </a>
            <Link href="/about">
              <Button variant="text" startIcon={<HelpOutlineOutlined />}>
                About
              </Button>
            </Link>
          </Stack>
        </CardContent>
      </Card>

      <AuthModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => {
          setShowAuthModal(false);
          setAllowOthersToJoin(true);
        }}
      />
    </Box>
  );
};

export default ConsolidatedBoardConfig;
