'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button, Form, Select, Typography, Input, Divider, Card, Row, Col, Flex, Collapse, Space } from 'antd';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { GithubOutlined, EditOutlined } from '@ant-design/icons';
import { openDB } from 'idb';
import { track } from '@vercel/analytics';
import { SUPPORTED_BOARDS, ANGLES } from '@/app/lib/board-data';
import { fetchBoardDetails } from '../rest-api/api';
import { BoardName, BoardDetails } from '@/app/lib/types';
import BoardConfigPreview from './board-config-preview';
import BoardRenderer from '../board-renderer/board-renderer';
import { constructClimbListWithSlugs } from '@/app/lib/url-utils';
import { BoardConfigData } from '@/app/lib/server-board-configs';
import AnimatedBoardLoading from '../loading/animated-board-loading';
import Logo from '../brand/logo';
import { themeTokens } from '@/app/theme/theme-config';

const { Option } = Select;
const { Title, Text } = Typography;

// IndexedDB configuration
const DB_NAME = 'boardsesh-config';
const DB_VERSION = 1;
const STORE_NAME = 'board-configurations';

// Types for stored configuration
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

type ConsolidatedBoardConfigProps = {
  boardConfigs: BoardConfigData;
};

const ConsolidatedBoardConfig = ({ boardConfigs }: ConsolidatedBoardConfigProps) => {
  const router = useRouter();

  // Selection states
  const [configName, setConfigName] = useState<string>('');
  const [selectedBoard, setSelectedBoard] = useState<BoardName | undefined>(undefined);
  const [selectedLayout, setSelectedLayout] = useState<number>();
  const [selectedSize, setSelectedSize] = useState<number>();
  const [selectedSets, setSelectedSets] = useState<number[]>([]);
  const [selectedAngle, setSelectedAngle] = useState<number>(40);

  // Data states - no longer needed as we get them from props
  const layouts = useMemo(() => selectedBoard ? boardConfigs.layouts[selectedBoard] || [] : [], [selectedBoard, boardConfigs.layouts]);
  const sizes = useMemo(() => selectedBoard && selectedLayout ? boardConfigs.sizes[`${selectedBoard}-${selectedLayout}`] || [] : [], [selectedBoard, selectedLayout, boardConfigs.sizes]);
  const sets = useMemo(() =>
    selectedBoard && selectedLayout && selectedSize
      ? boardConfigs.sets[`${selectedBoard}-${selectedLayout}-${selectedSize}`] || []
      : [], [selectedBoard, selectedLayout, selectedSize, boardConfigs.sets]);

  // Login states - for now just skip login on setup page

  // Additional states
  const [useAsDefault, setUseAsDefault] = useState(false);
  const [savedConfigurations, setSavedConfigurations] = useState<StoredBoardConfig[]>([]);
  const [suggestedName, setSuggestedName] = useState<string>('');
  const [activeCollapsePanels, setActiveCollapsePanels] = useState<string[]>(['saved']);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isStartingClimbing, setIsStartingClimbing] = useState(false);
  const [loadingBoardDetails, setLoadingBoardDetails] = useState<BoardDetails | null>(null);
  
  // Get board details for the preview (shared with loading animation)
  const [previewBoardDetails, setPreviewBoardDetails] = useState<BoardDetails | null>(null);
  
  // Load board details for preview when configuration changes
  useEffect(() => {
    if (!selectedBoard || !selectedLayout || !selectedSize || selectedSets.length === 0) {
      setPreviewBoardDetails(null);
      return;
    }

    const loadPreviewDetails = async () => {
      try {
        const detailsKey = `${selectedBoard}-${selectedLayout}-${selectedSize}-${selectedSets.join(',')}`;
        const cachedDetails = boardConfigs.details[detailsKey];
        
        if (cachedDetails) {
          setPreviewBoardDetails(cachedDetails);
        } else {
          try {
            const details = await fetchBoardDetails(selectedBoard, selectedLayout, selectedSize, selectedSets);
            setPreviewBoardDetails(details);
          } catch (error) {
            console.error('Failed to fetch board details for preview:', error);
            setPreviewBoardDetails(null);
          }
        }
      } catch (error) {
        console.error('Failed to load preview details:', error);
        setPreviewBoardDetails(null);
      }
    };

    loadPreviewDetails();
  }, [selectedBoard, selectedLayout, selectedSize, selectedSets, boardConfigs]);

  // IndexedDB helper functions
  const initDB = async () => {
    return openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'name' });
        }
      },
    });
  };

  const saveConfiguration = async (config: StoredBoardConfig) => {
    try {
      const db = await initDB();
      await db.put(STORE_NAME, config);

      // If this is set as default, clear other defaults
      if (config.useAsDefault) {
        const allConfigs = await db.getAll(STORE_NAME);
        for (const existingConfig of allConfigs) {
          if (existingConfig.name !== config.name && existingConfig.useAsDefault) {
            existingConfig.useAsDefault = false;
            await db.put(STORE_NAME, existingConfig);
          }
        }
      }
    } catch (error) {
      console.error('Failed to save configuration:', error);
    }
  };

  const loadAllConfigurations = useCallback(async () => {
    try {
      const db = await initDB();
      const allConfigs = await db.getAll(STORE_NAME);
      return allConfigs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
      console.error('Failed to load configurations:', error);
      return [];
    }
  }, []);

  const deleteConfiguration = async (configName: string) => {
    try {
      const db = await initDB();
      await db.delete(STORE_NAME, configName);
      // Reload configurations
      const updatedConfigs = await loadAllConfigurations();
      setSavedConfigurations(updatedConfigs);
    } catch (error) {
      console.error('Failed to delete configuration:', error);
    }
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
      // Load all saved configurations
      const allConfigs = await loadAllConfigurations();
      setSavedConfigurations(allConfigs);

      // Check for default configuration
      const defaultConfig = allConfigs.find((config) => config.useAsDefault);
      if (defaultConfig) {
        setConfigName(defaultConfig.name);
        setSelectedBoard(defaultConfig.board);
        setSelectedLayout(defaultConfig.layoutId);
        setSelectedSize(defaultConfig.sizeId);
        setSelectedSets(defaultConfig.setIds);
        setSelectedAngle(defaultConfig.angle || 40);
        setUseAsDefault(defaultConfig.useAsDefault);

        // Redirect immediately if there's a default - always use SEO-friendly slug URLs
        const savedAngle = defaultConfig.angle || 40;

        // Look up names from the pre-loaded board configs data
        const configLayouts = boardConfigs.layouts[defaultConfig.board as BoardName] || [];
        const configSizes = boardConfigs.sizes[`${defaultConfig.board}-${defaultConfig.layoutId}`] || [];
        const configSets = boardConfigs.sets[`${defaultConfig.board}-${defaultConfig.layoutId}-${defaultConfig.sizeId}`] || [];

        const layout = configLayouts.find((l: { id: number; name: string }) => l.id === defaultConfig.layoutId);
        const size = configSizes.find((s: { id: number; name: string; description: string }) => s.id === defaultConfig.sizeId);
        const setNames = configSets
          .filter((s) => defaultConfig.setIds.includes(s.id))
          .map((s) => s.name);

        if (layout && size && setNames.length > 0) {
          const slugUrl = constructClimbListWithSlugs(
            defaultConfig.board,
            layout.name,
            size.name,
            size.description,
            setNames,
            savedAngle,
          );
          router.push(slugUrl);
        }
      }
    };

    loadConfigurations();
  }, [router, boardConfigs, loadAllConfigurations]);

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

    // Auto-select first size when layout changes
    const availableSizes = boardConfigs.sizes[`${selectedBoard}-${selectedLayout}`] || [];
    if (availableSizes.length > 0) {
      setSelectedSize(availableSizes[0].id);
    } else {
      setSelectedSize(undefined);
    }

    setSelectedSets([]);
  }, [selectedBoard, selectedLayout, boardConfigs]);

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
      // Always use slug-based URL for SEO
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

  const handleStartClimbing = async () => {
    if (!selectedBoard || !selectedLayout || !selectedSize || selectedSets.length === 0) {
      return;
    }

    // Use the preview board details for loading animation
    setLoadingBoardDetails(previewBoardDetails);
    setIsStartingClimbing(true);

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
        setAsDefault: useAsDefault,
      });

      // Always save configuration with either user-provided or generated name
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

      // Navigate using the SEO-friendly slug URL (targetUrl is always computed with slugs)
      if (targetUrl) {
        router.push(targetUrl);
      }
    } catch (error) {
      console.error('Error starting climbing session:', error);
      setIsStartingClimbing(false);
      setLoadingBoardDetails(null);
    }
  };

  const isFormComplete = selectedBoard && selectedLayout && selectedSize && selectedSets.length > 0;

  return (
    <>
      <AnimatedBoardLoading isVisible={isStartingClimbing} boardDetails={loadingBoardDetails} />
      <div
        style={{
          padding: `10px ${themeTokens.spacing[6]} ${themeTokens.spacing[6]}`,
          maxWidth: '600px',
          margin: '0 auto',
        }}
      >
        <Card style={{ boxShadow: themeTokens.shadows.lg }}>
          <div style={{ textAlign: 'center', marginBottom: themeTokens.spacing[6] }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: themeTokens.spacing[4] }}>
              <Logo size="lg" showText={true} linkToHome={false} />
            </div>
            <Text style={{ color: themeTokens.neutral[500], fontSize: themeTokens.typography.fontSize.lg }}>
              Configure your climbing board
            </Text>
          </div>

        {savedConfigurations.length > 0 && (
          <>
            <Collapse
              activeKey={activeCollapsePanels}
              onChange={(keys) => setActiveCollapsePanels(keys as string[])}
              size="small"
              items={[
                {
                  key: 'saved',
                  label: `Saved Configurations (${savedConfigurations.length})`,
                  extra: (
                    <Button
                      type={isEditMode ? 'primary' : 'default'}
                      size="small"
                      icon={<EditOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsEditMode(!isEditMode);
                      }}
                    />
                  ),
                  children: (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', width: '100%', overflow: 'hidden' }}>
                      {savedConfigurations.map((config) => (
                        <BoardConfigPreview
                          key={config.name}
                          config={config}
                          onDelete={deleteConfiguration}
                          boardConfigs={boardConfigs}
                          isEditMode={isEditMode}
                        />
                      ))}
                    </div>
                  ),
                },
              ]}
            />
            <Divider />
          </>
        )}

        <Form layout="vertical">
          <Form.Item label="Configuration Name (Optional)">
            <Input
              value={configName}
              onChange={(e) => setConfigName(e.target.value)}
              placeholder={suggestedName || 'Enter a name for this configuration'}
              maxLength={50}
            />
          </Form.Item>

          <Form.Item label="Board Configuration" required>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12}>
                <Form.Item label="Board" noStyle>
                  <Select value={selectedBoard} onChange={handleBoardChange} placeholder="Please select">
                    {SUPPORTED_BOARDS.map((board_name) => (
                      <Option key={board_name} value={board_name}>
                        {board_name.charAt(0).toUpperCase() + board_name.slice(1)}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>

              <Col xs={24} sm={12}>
                <Form.Item label="Layout" noStyle>
                  <Select
                    value={selectedLayout}
                    onChange={handleLayoutChange}
                    placeholder="Select layout"
                    disabled={!selectedBoard}
                  >
                    {layouts.map(({ id: layoutId, name: layoutName }) => (
                      <Option key={layoutId} value={layoutId}>
                        {layoutName}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>

              <Col xs={24} sm={12}>
                <Form.Item label="Size" noStyle>
                  <Select
                    value={selectedSize}
                    onChange={handleSizeChange}
                    placeholder="Select size"
                    disabled={!selectedLayout}
                  >
                    {sizes.map(({ id, name, description }) => (
                      <Option key={id} value={id}>
                        {`${name} ${description}`}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>

              <Col xs={24} sm={12}>
                <Form.Item label="Hold Sets" noStyle>
                  <Select
                    mode="multiple"
                    value={selectedSets}
                    onChange={handleSetsChange}
                    placeholder="Select hold sets"
                    disabled={!selectedSize}
                  >
                    {sets.map(({ id, name }) => (
                      <Option key={id} value={id}>
                        {name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>

              <Col xs={24} sm={12}>
                <Form.Item label="Angle" noStyle>
                  <Select value={selectedAngle} onChange={handleAngleChange} disabled={!selectedBoard}>
                    {selectedBoard &&
                      ANGLES[selectedBoard].map((angle) => (
                        <Option key={angle} value={angle}>
                          {angle}°
                        </Option>
                      ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </Form.Item>

          <div style={{ marginBottom: themeTokens.spacing[4], textAlign: 'center' }}>
            <Text type="secondary">You can login after reaching the board page</Text>
          </div>

          {/* TODO: Improve UX for default board selection
          <Form.Item>
            <Checkbox
              checked={useAsDefault}
              onChange={(e) => setUseAsDefault(e.target.checked)}
              disabled={!isFormComplete}
            >
              Use this board configuration as default
              <Tooltip title="When this option is selected, navigating to BoardSesh will always load this board configuration immediately">
                <InfoCircleOutlined style={{ marginLeft: '4px', color: '#1890ff' }} />
              </Tooltip>
            </Checkbox>
          </Form.Item>
          */}

          {targetUrl ? (
            <Link href={targetUrl} onClick={handleStartClimbing}>
              <Button
                type="primary"
                size="large"
                block
                disabled={!isFormComplete || isStartingClimbing}
              >
                Start Climbing
              </Button>
            </Link>
          ) : (
            <Button
              type="primary"
              size="large"
              block
              onClick={handleStartClimbing}
              disabled={!isFormComplete || isStartingClimbing}
            >
              Start Climbing
            </Button>
          )}
        </Form>

        {isFormComplete && (
          <>
            <Divider />
            <Collapse
              activeKey={activeCollapsePanels.includes('preview') ? ['preview'] : []}
              onChange={(keys) => {
                const updatedKeys = keys as string[];
                if (updatedKeys.includes('preview')) {
                  setActiveCollapsePanels([...activeCollapsePanels.filter((k) => k !== 'preview'), 'preview']);
                } else {
                  setActiveCollapsePanels(activeCollapsePanels.filter((k) => k !== 'preview'));
                }
              }}
              size="small"
              items={[
                {
                  key: 'preview',
                  label: 'Preview',
                  children: (
                    <Flex gap="middle" wrap="wrap">
                      {previewBoardDetails ? (
                        <Card
                          style={{ width: 400 }}
                          cover={<BoardRenderer litUpHoldsMap={{}} mirrored={false} boardDetails={previewBoardDetails} thumbnail={false} />}
                        />
                      ) : selectedBoard && selectedLayout && selectedSize && selectedSets.length > 0 ? (
                        <Card style={{ width: 400 }}>
                          <div style={{ textAlign: 'center', padding: '20px' }}>
                            <div style={{ color: themeTokens.colors.primary, marginBottom: '8px' }}>
                              Loading preview...
                            </div>
                          </div>
                        </Card>
                      ) : (
                        <Card style={{ width: 400, textAlign: 'center' }}>
                          <Text type="secondary">Select board configuration to see preview</Text>
                        </Card>
                      )}
                    </Flex>
                  ),
                },
              ]}
            />
          </>
        )}

        <Divider />
        <Space style={{ width: '100%', justifyContent: 'center' }}>
          <a href="https://github.com/marcodejongh/boardsesh" target="_blank" rel="noopener noreferrer">
            <Button type="text" icon={<GithubOutlined />}>
              GitHub
            </Button>
          </a>
          <a href="https://discord.gg/YXA8GsXfQK" target="_blank" rel="noopener noreferrer">
            <Button
              type="text"
              icon={
                <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
              }
            >
              Discord
            </Button>
          </a>
        </Space>
      </Card>
    </div>
    </>
  );
};

export default ConsolidatedBoardConfig;
