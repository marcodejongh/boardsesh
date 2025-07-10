'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button, Form, Select, Typography, Input, Divider, Card, Row, Col, Checkbox, Tooltip, Space, Flex, Collapse } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { openDB } from 'idb';
import { track } from '@vercel/analytics';
import { SUPPORTED_BOARDS, ANGLES } from '@/app/lib/board-data';
import { fetchBoardDetails } from '../rest-api/api';
import { LayoutRow, SizeRow, SetRow } from '@/app/lib/data/queries';
import { BoardName } from '@/app/lib/types';
import BoardConfigPreview from './board-config-preview';
import BoardConfigLivePreview from './board-config-live-preview';
import StartClimbingButton from './start-climbing-button';
import { constructClimbListWithSlugs } from '@/app/lib/url-utils';
import { BoardConfigData } from '@/app/lib/server-board-configs';

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
  const layouts = selectedBoard ? boardConfigs.layouts[selectedBoard] || [] : [];
  const sizes = selectedBoard && selectedLayout ? boardConfigs.sizes[`${selectedBoard}-${selectedLayout}`] || [] : [];
  const sets = selectedBoard && selectedLayout && selectedSize ? boardConfigs.sets[`${selectedBoard}-${selectedLayout}-${selectedSize}`] || [] : [];
  
  // Login states - for now just skip login on setup page
  const [showLoginSection, setShowLoginSection] = useState(false);
  
  // Additional states
  const [useAsDefault, setUseAsDefault] = useState(false);
  const [savedConfigurations, setSavedConfigurations] = useState<StoredBoardConfig[]>([]);
  const [suggestedName, setSuggestedName] = useState<string>('');
  const [activeCollapsePanels, setActiveCollapsePanels] = useState<string[]>(['saved']);
  const [isStartingClimbing, setIsStartingClimbing] = useState(false);

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

  const loadDefaultConfiguration = async () => {
    try {
      const db = await initDB();
      const allConfigs = await db.getAll(STORE_NAME);
      return allConfigs.find(config => config.useAsDefault) || null;
    } catch (error) {
      console.error('Failed to load default configuration:', error);
      return null;
    }
  };

  const loadAllConfigurations = async () => {
    try {
      const db = await initDB();
      const allConfigs = await db.getAll(STORE_NAME);
      return allConfigs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
      console.error('Failed to load configurations:', error);
      return [];
    }
  };

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

    const layout = layouts.find(l => l.id === selectedLayout);
    const size = sizes.find(s => s.id === selectedSize);
    
    const layoutName = layout?.name || `Layout ${selectedLayout}`;
    const sizeName = size?.name || `Size ${selectedSize}`;
    
    setSuggestedName(`${layoutName} ${sizeName}`);
  }, [selectedBoard, selectedLayout, selectedSize, layouts, sizes]);

  // Generate climbing URL from current form selections
  const getClimbingUrl = useCallback(async () => {
    if (!selectedBoard || !selectedLayout || !selectedSize || selectedSets.length === 0) {
      return null;
    }

    const setsString = selectedSets.join(',');
    
    try {
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
          selectedAngle
        );
      } else {
        // Fallback to old URL format
        return `/${selectedBoard}/${selectedLayout}/${selectedSize}/${setsString}/${selectedAngle}/list`;
      }
    } catch (error) {
      console.error('Error constructing climbing URL:', error);
      // Fallback to old URL format
      return `/${selectedBoard}/${selectedLayout}/${selectedSize}/${setsString}/${selectedAngle}/list`;
    }
  }, [selectedBoard, selectedLayout, selectedSize, selectedSets, selectedAngle, boardConfigs]);

  // Load configurations on mount
  useEffect(() => {
    const loadConfigurations = async () => {
      // Load all saved configurations
      const allConfigs = await loadAllConfigurations();
      setSavedConfigurations(allConfigs);
      
      // Check for default configuration
      const defaultConfig = allConfigs.find(config => config.useAsDefault);
      if (defaultConfig) {
        setConfigName(defaultConfig.name);
        setSelectedBoard(defaultConfig.board);
        setSelectedLayout(defaultConfig.layoutId);
        setSelectedSize(defaultConfig.sizeId);
        setSelectedSets(defaultConfig.setIds);
        setSelectedAngle(defaultConfig.angle || 40);
        setUseAsDefault(defaultConfig.useAsDefault);
        
        // Track default configuration load
        track('Default Configuration Loaded', {
          board: defaultConfig.board,
          layoutId: defaultConfig.layoutId,
          sizeId: defaultConfig.sizeId,
          setCount: defaultConfig.setIds.length,
          angle: defaultConfig.angle || 40,
          configName: defaultConfig.name
        });
        
        // Redirect immediately if there's a default
        const setsString = defaultConfig.setIds.join(',');
        const savedAngle = defaultConfig.angle || 40;
        
        try {
          // Try to get board details for slug-based URL from cache first
          const detailsKey = `${defaultConfig.board}-${defaultConfig.layoutId}-${defaultConfig.sizeId}-${defaultConfig.setIds.join(',')}`;
          let boardDetails = boardConfigs.details[detailsKey];
          
          if (!boardDetails) {
            boardDetails = await fetchBoardDetails(defaultConfig.board, defaultConfig.layoutId, defaultConfig.sizeId, defaultConfig.setIds);
          }
          
          if (boardDetails.layout_name && boardDetails.size_name && boardDetails.set_names) {
            const slugUrl = constructClimbListWithSlugs(
              boardDetails.board_name,
              boardDetails.layout_name,
              boardDetails.size_name,
              boardDetails.set_names,
              savedAngle
            );
            router.push(slugUrl);
          } else {
            // Fallback to old URL format
            router.push(`/${defaultConfig.board}/${defaultConfig.layoutId}/${defaultConfig.sizeId}/${setsString}/${savedAngle}/list`);
          }
        } catch (error) {
          console.error('Error fetching board details for slug URL:', error);
          // Fallback to old URL format
          router.push(`/${defaultConfig.board}/${defaultConfig.layoutId}/${defaultConfig.sizeId}/${setsString}/${savedAngle}/list`);
        }
      }
    };
    
    loadConfigurations();
  }, [router, boardConfigs]);

  // Reset dependent selections when parent changes
  useEffect(() => {
    if (!selectedBoard) {
      setSelectedLayout(undefined);
      setSelectedSize(undefined);
      setSelectedSets([]);
      return;
    }
    setSelectedLayout(undefined);
    setSelectedSize(undefined);
    setSelectedSets([]);
  }, [selectedBoard]);

  useEffect(() => {
    if (!selectedBoard || !selectedLayout) return;
    setSelectedSize(undefined);
    setSelectedSets([]);
  }, [selectedBoard, selectedLayout]);

  useEffect(() => {
    if (!selectedBoard || !selectedLayout || !selectedSize) return;
    setSelectedSets([]);
  }, [selectedBoard, selectedLayout, selectedSize]);

  // Update suggested name when selections change
  useEffect(() => {
    generateSuggestedName();
  }, [selectedBoard, selectedLayout, selectedSize, generateSuggestedName]);

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
    if (selectedBoard && selectedLayout && selectedSize && selectedSets.length > 0) {
      setIsStartingClimbing(true);
      
      try {
        // Generate default name if none provided
        let configurationName = configName.trim();
        if (!configurationName) {
          const layout = layouts.find(l => l.id === selectedLayout);
          const size = sizes.find(s => s.id === selectedSize);
          
          const layoutName = layout?.name || `Layout ${selectedLayout}`;
          const sizeName = size?.name || `Size ${selectedSize}`;
          
          configurationName = `${layoutName} ${sizeName}`;
        }
        
        // Track board configuration completion
        track('Board Configuration Completed', {
          board: selectedBoard,
          layoutId: selectedLayout,
          sizeId: selectedSize,
          setCount: selectedSets.length,
          setIds: selectedSets.join(','),
          angle: selectedAngle,
          hasCustomName: !!configName.trim(),
          setAsDefault: useAsDefault
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
        
        const setsString = selectedSets.join(',');
        
        try {
          // Try to get board details for slug-based URL
          const boardDetails = await fetchBoardDetails(selectedBoard!, selectedLayout!, selectedSize!, selectedSets);
          
          if (boardDetails.layout_name && boardDetails.size_name && boardDetails.set_names) {
            const slugUrl = constructClimbListWithSlugs(
              boardDetails.board_name,
              boardDetails.layout_name,
              boardDetails.size_name,
              boardDetails.set_names,
              selectedAngle
            );
            router.push(slugUrl);
          } else {
            // Fallback to old URL format
            router.push(`/${selectedBoard}/${selectedLayout}/${selectedSize}/${setsString}/${selectedAngle}/list`);
          }
        } catch (error) {
          console.error('Error fetching board details for slug URL:', error);
          // Fallback to old URL format
          router.push(`/${selectedBoard}/${selectedLayout}/${selectedSize}/${setsString}/${selectedAngle}/list`);
        }
      } catch (error) {
        console.error('Error starting climbing session:', error);
        setIsStartingClimbing(false);
      }
    }
  };

  const isFormComplete = selectedBoard && selectedLayout && selectedSize && selectedSets.length > 0;

  return (
    <div style={{ padding: '24px', maxWidth: '600px', margin: '0 auto' }}>
      <Card>
        <Title level={1} style={{ textAlign: 'center', marginBottom: '8px' }}>
          BoardSesh
        </Title>
        <Title level={4} style={{ textAlign: 'center', marginBottom: '32px', color: '#666' }}>
          Configure your climbing board
        </Title>

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
                  children: (
                    <Flex gap="middle" wrap="wrap">
                      {savedConfigurations.map((config) => (
                        <BoardConfigPreview
                          key={config.name}
                          config={config}
                          onDelete={deleteConfiguration}
                          boardConfigs={boardConfigs}
                        />
                      ))}
                    </Flex>
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
              placeholder={suggestedName || "Enter a name for this configuration"}
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
                  <Select 
                    value={selectedAngle} 
                    onChange={handleAngleChange}
                    disabled={!selectedBoard}
                  >
                    {selectedBoard && ANGLES[selectedBoard].map((angle) => (
                      <Option key={angle} value={angle}>
                        {angle}°
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </Form.Item>

          <div style={{ marginBottom: '16px', textAlign: 'center' }}>
            <Text type="secondary">
              You can login after reaching the board page
            </Text>
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

          <Button 
            type="primary" 
            size="large"
            block 
            onClick={handleStartClimbing} 
            disabled={!isFormComplete || isStartingClimbing}
            loading={isStartingClimbing}
          >
            {isStartingClimbing ? 'Starting...' : 'Start Climbing'}
          </Button>
        </Form>

        {isFormComplete && (
          <>
            <Divider />
            <Collapse
              activeKey={activeCollapsePanels.includes('preview') ? ['preview'] : []}
              onChange={(keys) => {
                const updatedKeys = keys as string[];
                if (updatedKeys.includes('preview')) {
                  setActiveCollapsePanels([...activeCollapsePanels.filter(k => k !== 'preview'), 'preview']);
                } else {
                  setActiveCollapsePanels(activeCollapsePanels.filter(k => k !== 'preview'));
                }
              }}
              size="small"
              items={[
                {
                  key: 'preview',
                  label: 'Preview',
                  children: (
                    <Flex gap="middle" wrap="wrap">
                      <BoardConfigLivePreview
                        boardName={selectedBoard}
                        layoutId={selectedLayout}
                        sizeId={selectedSize}
                        setIds={selectedSets}
                        angle={selectedAngle}
                        configName={configName || suggestedName || 'New Configuration'}
                        useAsDefault={useAsDefault}
                        boardConfigs={boardConfigs}
                      />
                    </Flex>
                  ),
                },
              ]}
            />
          </>
        )}
      </Card>
    </div>
  );
};

export default ConsolidatedBoardConfig;