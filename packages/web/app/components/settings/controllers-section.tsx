'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import MuiSelect from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Chip from '@mui/material/Chip';
import MuiAlert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import { ConfirmPopover } from '@/app/components/ui/confirm-popover';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';
import AccessTimeOutlined from '@mui/icons-material/AccessTimeOutlined';
import DeleteOutlined from '@mui/icons-material/DeleteOutlined';
import AddOutlined from '@mui/icons-material/AddOutlined';
import ContentCopyOutlined from '@mui/icons-material/ContentCopyOutlined';
import WarningOutlined from '@mui/icons-material/WarningOutlined';
import { getBoardSelectorOptions } from '@/app/lib/__generated__/product-sizes-data';
import { BoardName } from '@/app/lib/types';
import styles from './controllers-section.module.css';
import { useSnackbar } from '@/app/components/providers/snackbar-provider';
import { executeGraphQL } from '@/app/lib/graphql/client';
import { useWsAuthToken } from '@/app/hooks/use-ws-auth-token';
import {
  GET_MY_CONTROLLERS,
  REGISTER_CONTROLLER,
  DELETE_CONTROLLER,
  type GetMyControllersQueryResponse,
  type ControllerInfoGql,
  type RegisterControllerMutationVariables,
  type RegisterControllerMutationResponse,
  type DeleteControllerMutationVariables,
  type DeleteControllerMutationResponse,
} from '@/app/lib/graphql/operations';

// Get board config data (synchronous - from generated data)
const boardSelectorOptions = getBoardSelectorOptions();

interface ControllerCardProps {
  controller: ControllerInfoGql;
  onRemove: () => void;
  isRemoving: boolean;
}

function ControllerCard({ controller, onRemove, isRemoving }: ControllerCardProps) {
  const boardName = controller.boardName.charAt(0).toUpperCase() + controller.boardName.slice(1);

  const getStatusTag = () => {
    if (controller.isOnline) {
      return (
        <Chip icon={<CheckCircleOutlined />} label="Online" size="small" color="success" />
      );
    }
    if (controller.lastSeen) {
      return (
        <Chip icon={<AccessTimeOutlined />} label="Offline" size="small" color="default" />
      );
    }
    return (
      <Chip label="Never connected" size="small" color="default" />
    );
  };

  const formatLastSeen = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  return (
    <Card className={styles.controllerCard}>
      <CardContent>
        <div className={styles.cardHeader}>
          <Typography variant="h5" sx={{ margin: 0 }}>
            {controller.name || 'Unnamed Controller'}
          </Typography>
          {getStatusTag()}
        </div>
        <div className={styles.controllerInfo}>
          <div className={styles.infoRow}>
            <Typography variant="body2" component="span" color="text.secondary">Board:</Typography>
            <Chip label={boardName} size="small" color="primary" />
          </div>
          <div className={styles.infoRow}>
            <Typography variant="body2" component="span" color="text.secondary">Layout:</Typography>
            <Typography variant="body2" component="span">{controller.layoutId} / Size {controller.sizeId}</Typography>
          </div>
          <div className={styles.infoRow}>
            <Typography variant="body2" component="span" color="text.secondary">Last seen:</Typography>
            <Typography variant="body2" component="span">{formatLastSeen(controller.lastSeen)}</Typography>
          </div>
        </div>
        <ConfirmPopover
          title="Delete controller"
          description="Are you sure you want to delete this controller? This cannot be undone."
          onConfirm={onRemove}
          okText="Yes, delete"
          cancelText="Cancel"
          okButtonProps={{ color: 'error' }}
        >
          <Button
            color="error"
            variant="outlined"
            startIcon={isRemoving ? <CircularProgress size={16} /> : <DeleteOutlined />}
            disabled={isRemoving}
            fullWidth
          >
            Delete Controller
          </Button>
        </ConfirmPopover>
      </CardContent>
    </Card>
  );
}

interface ApiKeySuccessModalProps {
  isOpen: boolean;
  apiKey: string;
  controllerName: string;
  onClose: () => void;
}

function ApiKeySuccessModal({ isOpen, apiKey, controllerName, onClose }: ApiKeySuccessModalProps) {
  const { showMessage } = useSnackbar();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(apiKey);
      showMessage('API key copied to clipboard', 'success');
    } catch {
      showMessage('Failed to copy - please select and copy manually', 'error');
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      disableEscapeKeyDown
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>Controller Registered</DialogTitle>
      <DialogContent>
        <MuiAlert severity="warning" icon={<WarningOutlined />} sx={{ marginBottom: 2 }}>
          <AlertTitle>Save this API key now!</AlertTitle>
          This is the only time you'll see this key. If you lose it, you'll need to delete and re-register the controller.
        </MuiAlert>
        <Typography variant="body1" component="p">
          Your controller <strong>{controllerName || 'Unnamed Controller'}</strong> has been registered.
        </Typography>
        <Typography variant="body1" component="p" color="text.secondary">
          Enter this API key in your ESP32 configuration:
        </Typography>
        <TextField
          value={apiKey}
          multiline
          rows={2}
          fullWidth
          variant="outlined"
          size="small"
          slotProps={{ input: { readOnly: true, style: { fontFamily: 'monospace' } } }}
          sx={{ marginBottom: 1 }}
        />
        <Button variant="outlined" startIcon={<ContentCopyOutlined />} onClick={handleCopy} fullWidth>
          Copy API Key
        </Button>
      </DialogContent>
      <DialogActions>
        <Button variant="contained" onClick={onClose}>
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function ControllersSection() {
  const [controllers, setControllers] = useState<ControllerInfoGql[]>([]);
  const [loading, setLoading] = useState(true);
  const { token: authToken } = useWsAuthToken();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState({ name: '' });
  const { showMessage } = useSnackbar();

  // Board configuration selection state
  const [selectedBoard, setSelectedBoard] = useState<BoardName | undefined>(undefined);
  const [selectedLayout, setSelectedLayout] = useState<number | undefined>(undefined);
  const [selectedSize, setSelectedSize] = useState<number | undefined>(undefined);
  const [selectedSets, setSelectedSets] = useState<number[]>([]);

  // Derived data for dropdowns
  const layouts = useMemo(() =>
    selectedBoard ? boardSelectorOptions.layouts[selectedBoard] || [] : [],
    [selectedBoard]
  );

  const sizes = useMemo(() =>
    selectedBoard && selectedLayout
      ? boardSelectorOptions.sizes[`${selectedBoard}-${selectedLayout}`] || []
      : [],
    [selectedBoard, selectedLayout]
  );

  const sets = useMemo(() =>
    selectedBoard && selectedLayout && selectedSize
      ? boardSelectorOptions.sets[`${selectedBoard}-${selectedLayout}-${selectedSize}`] || []
      : [],
    [selectedBoard, selectedLayout, selectedSize]
  );

  // Success state for showing API key
  const [successApiKey, setSuccessApiKey] = useState<string | null>(null);
  const [successControllerName, setSuccessControllerName] = useState('');

  const fetchControllers = async () => {
    if (!authToken) return;
    try {
      const data = await executeGraphQL<GetMyControllersQueryResponse>(
        GET_MY_CONTROLLERS,
        {},
        authToken,
      );
      setControllers(data.myControllers);
    } catch (error) {
      console.error('Failed to fetch controllers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authToken) {
      fetchControllers();
    }
  }, [authToken]);

  const handleAddClick = () => {
    setFormValues({ name: '' });
    setSelectedBoard(undefined);
    setSelectedLayout(undefined);
    setSelectedSize(undefined);
    setSelectedSets([]);
    setIsModalOpen(true);
  };

  const handleModalCancel = () => {
    setIsModalOpen(false);
    setFormValues({ name: '' });
    setSelectedBoard(undefined);
    setSelectedLayout(undefined);
    setSelectedSize(undefined);
    setSelectedSets([]);
  };

  const handleBoardChange = (value: BoardName) => {
    setSelectedBoard(value);
    setSelectedLayout(undefined);
    setSelectedSize(undefined);
    setSelectedSets([]);
  };

  const handleLayoutChange = (value: number) => {
    setSelectedLayout(value);
    setSelectedSize(undefined);
    setSelectedSets([]);
  };

  const handleSizeChange = (value: number) => {
    setSelectedSize(value);
    // Auto-select all sets when size is selected
    const availableSets = selectedBoard && selectedLayout
      ? boardSelectorOptions.sets[`${selectedBoard}-${selectedLayout}-${value}`] || []
      : [];
    const allSetIds = availableSets.map((s) => s.id);
    setSelectedSets(allSetIds);
  };

  const handleSetsChange = (value: number[]) => {
    setSelectedSets(value);
  };

  const handleRegister = async (values: {
    name?: string;
    boardName: BoardName;
    layoutId: number;
    sizeId: number;
    setIds: number[];
  }) => {
    setIsSaving(true);
    try {
      const data = await executeGraphQL<RegisterControllerMutationResponse, RegisterControllerMutationVariables>(
        REGISTER_CONTROLLER,
        {
          input: {
            name: values.name,
            boardName: values.boardName,
            layoutId: values.layoutId,
            sizeId: values.sizeId,
            setIds: Array.isArray(values.setIds) ? values.setIds.join(',') : String(values.setIds),
          },
        },
        authToken,
      );

      // Close the registration modal
      setIsModalOpen(false);
      setFormValues({ name: '' });

      // Show the API key success modal
      setSuccessApiKey(data.registerController.apiKey);
      setSuccessControllerName(values.name || '');

      await fetchControllers();
    } catch (error) {
      showMessage(error instanceof Error ? error.message : 'Failed to register controller', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async (controllerId: string) => {
    setRemovingId(controllerId);
    try {
      await executeGraphQL<DeleteControllerMutationResponse, DeleteControllerMutationVariables>(
        DELETE_CONTROLLER,
        { controllerId },
        authToken,
      );

      showMessage('Controller deleted successfully', 'success');
      await fetchControllers();
    } catch (error) {
      showMessage(error instanceof Error ? error.message : 'Failed to delete controller', 'error');
    } finally {
      setRemovingId(null);
    }
  };

  const handleSuccessClose = () => {
    setSuccessApiKey(null);
    setSuccessControllerName('');
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <div className={styles.loadingContainer}>
            <CircularProgress />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent>
          <Typography variant="h5">ESP32 Controllers</Typography>
          <Typography variant="body2" component="span" color="text.secondary" className={styles.sectionDescription}>
            Register ESP32 devices to control your board via Bluetooth bridge.
            This allows you to use BoardSesh with official Kilter/Tension apps.
          </Typography>

          {controllers.length === 0 ? (
            <div className={styles.emptyState}>
              <Typography variant="body2" component="span" color="text.secondary">
                No controllers registered. Add an ESP32 to use BoardSesh with official apps.
              </Typography>
            </div>
          ) : (
            <Stack spacing={2} className={styles.cardsContainer}>
              {controllers.map((controller) => (
                <ControllerCard
                  key={controller.id}
                  controller={controller}
                  onRemove={() => handleRemove(controller.id)}
                  isRemoving={removingId === controller.id}
                />
              ))}
            </Stack>
          )}

          <Button
            variant="contained"
            startIcon={<AddOutlined />}
            onClick={handleAddClick}
            fullWidth
            className={styles.addButton}
          >
            Add Controller
          </Button>
        </CardContent>
      </Card>

      <Dialog
        open={isModalOpen}
        onClose={handleModalCancel}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Register ESP32 Controller</DialogTitle>
        <DialogContent>
          <Typography variant="body2" component="span" color="text.secondary" className={styles.modalDescription}>
            Register a new ESP32 controller to receive LED commands from BoardSesh.
            You'll receive an API key to configure on the device.
          </Typography>
        <Box
          component="form"
          onSubmit={(e: React.FormEvent) => {
            e.preventDefault();
            if (!selectedBoard || !selectedLayout || !selectedSize || selectedSets.length === 0) return;
            handleRegister({
              name: formValues.name,
              boardName: selectedBoard,
              layoutId: selectedLayout,
              sizeId: selectedSize,
              setIds: selectedSets,
            });
          }}
          sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}
        >
          <TextField
            label="Controller Name (optional)"
            placeholder="e.g., Living Room Board"
            variant="outlined"
            size="small"
            fullWidth
            value={formValues.name}
            onChange={(e) => setFormValues((prev) => ({ ...prev, name: e.target.value }))}
            inputProps={{ maxLength: 100 }}
          />

          <FormControl fullWidth required>
            <InputLabel>Board Type</InputLabel>
            <MuiSelect
              value={selectedBoard || ''}
              label="Board Type"
              onChange={(e) => handleBoardChange(e.target.value as BoardName)}
            >
              <MenuItem value="kilter">Kilter</MenuItem>
              <MenuItem value="tension">Tension</MenuItem>
            </MuiSelect>
          </FormControl>

          <FormControl fullWidth required disabled={!selectedBoard}>
            <InputLabel>Layout</InputLabel>
            <MuiSelect
              value={selectedLayout ?? ''}
              label="Layout"
              onChange={(e) => handleLayoutChange(e.target.value as number)}
            >
              {layouts.map(({ id, name }) => (
                <MenuItem key={id} value={id}>{name}</MenuItem>
              ))}
            </MuiSelect>
          </FormControl>

          <FormControl fullWidth required disabled={!selectedLayout}>
            <InputLabel>Size</InputLabel>
            <MuiSelect
              value={selectedSize ?? ''}
              label="Size"
              onChange={(e) => handleSizeChange(e.target.value as number)}
            >
              {sizes.map(({ id, name, description }) => (
                <MenuItem key={id} value={id}>{name} {description}</MenuItem>
              ))}
            </MuiSelect>
          </FormControl>

          <FormControl fullWidth required disabled={!selectedSize}>
            <InputLabel>Hold Sets</InputLabel>
            <MuiSelect
              multiple
              value={selectedSets}
              label="Hold Sets"
              onChange={(e) => handleSetsChange(e.target.value as number[])}
            >
              {sets.map(({ id, name }) => (
                <MenuItem key={id} value={id}>{name}</MenuItem>
              ))}
            </MuiSelect>
          </FormControl>

          <Button
            variant="contained"
            type="submit"
            disabled={isSaving}
            startIcon={isSaving ? <CircularProgress size={16} /> : undefined}
            fullWidth
          >
            {isSaving ? 'Registering...' : 'Register Controller'}
          </Button>
        </Box>
        </DialogContent>
      </Dialog>

      <ApiKeySuccessModal
        isOpen={!!successApiKey}
        apiKey={successApiKey || ''}
        controllerName={successControllerName}
        onClose={handleSuccessClose}
      />
    </>
  );
}
