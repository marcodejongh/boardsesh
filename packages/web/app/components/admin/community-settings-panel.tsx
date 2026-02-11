'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Snackbar from '@mui/material/Snackbar';
import SaveIcon from '@mui/icons-material/Save';
import { themeTokens } from '@/app/theme/theme-config';
import { useWsAuthToken } from '@/app/hooks/use-ws-auth-token';
import { createGraphQLHttpClient } from '@/app/lib/graphql/client';
import {
  GET_COMMUNITY_SETTINGS,
  SET_COMMUNITY_SETTING,
} from '@/app/lib/graphql/operations/proposals';
import type { CommunitySettingType } from '@boardsesh/shared-schema';

const DEFAULT_SETTINGS = [
  { key: 'approval_threshold', label: 'Approval Threshold', description: 'Weighted votes needed for auto-approval', defaultValue: '5' },
  { key: 'outlier_min_ascents', label: 'Outlier Min Ascents', description: 'Min ascents for outlier detection', defaultValue: '10' },
  { key: 'outlier_grade_diff', label: 'Outlier Grade Diff', description: 'Grade difference threshold for outlier', defaultValue: '2' },
  { key: 'admin_vote_weight', label: 'Admin Vote Weight', description: 'Vote weight multiplier for admins', defaultValue: '3' },
  { key: 'leader_vote_weight', label: 'Leader Vote Weight', description: 'Vote weight multiplier for leaders', defaultValue: '2' },
];

export default function CommunitySettingsPanel() {
  const { token } = useWsAuthToken();
  const [scope, setScope] = useState('global');
  const [scopeKey, setScopeKey] = useState('');
  const [settings, setSettings] = useState<CommunitySettingType[]>([]);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState('');

  const fetchSettings = useCallback(async () => {
    if (!token) return;
    try {
      const client = createGraphQLHttpClient(token);
      const result = await client.request<{ communitySettings: CommunitySettingType[] }>(
        GET_COMMUNITY_SETTINGS,
        { scope, scopeKey: scope === 'global' ? '' : scopeKey },
      );
      setSettings(result.communitySettings);
      const values: Record<string, string> = {};
      for (const s of result.communitySettings) {
        values[s.key] = s.value;
      }
      setEditValues(values);
    } catch (err) {
      console.error('[Settings] Failed to fetch:', err);
    }
  }, [token, scope, scopeKey]);

  useEffect(() => {
    if (scope === 'global' || scopeKey) {
      fetchSettings();
    }
  }, [fetchSettings, scope, scopeKey]);

  const hasChanges = DEFAULT_SETTINGS.some((def) => {
    const savedValue = settings.find((s) => s.key === def.key)?.value;
    const editValue = editValues[def.key];
    // Changed if there's an edit value that differs from the saved value (or from empty if no saved value)
    return editValue !== undefined && editValue !== '' && editValue !== (savedValue ?? '');
  });

  const handleSaveAll = useCallback(async () => {
    if (!token) return;
    setSaving(true);
    try {
      const client = createGraphQLHttpClient(token);
      const promises = DEFAULT_SETTINGS
        .filter((def) => {
          const savedValue = settings.find((s) => s.key === def.key)?.value;
          const editValue = editValues[def.key];
          return editValue !== undefined && editValue !== '' && editValue !== (savedValue ?? '');
        })
        .map((def) =>
          client.request(SET_COMMUNITY_SETTING, {
            input: {
              scope,
              scopeKey: scope === 'global' ? '' : scopeKey,
              key: def.key,
              value: editValues[def.key],
            },
          }),
        );
      await Promise.all(promises);
      setSnackbar(`Saved ${promises.length} setting${promises.length !== 1 ? 's' : ''}`);
      fetchSettings();
    } catch {
      setSnackbar('Failed to save settings');
    } finally {
      setSaving(false);
    }
  }, [token, scope, scopeKey, editValues, settings, fetchSettings]);

  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
        Community Settings
      </Typography>

      {/* Scope selector */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Scope</InputLabel>
          <Select
            value={scope}
            label="Scope"
            onChange={(e) => {
              setScope(e.target.value);
              setScopeKey('');
            }}
          >
            <MenuItem value="global">Global</MenuItem>
            <MenuItem value="board">Board</MenuItem>
            <MenuItem value="climb">Climb</MenuItem>
          </Select>
        </FormControl>
        {scope !== 'global' && (
          <TextField
            label={scope === 'board' ? 'Board Type' : 'Climb UUID'}
            value={scopeKey}
            onChange={(e) => setScopeKey(e.target.value)}
            size="small"
            sx={{ flex: 1 }}
            placeholder={scope === 'board' ? 'kilter, tension' : 'Climb UUID'}
          />
        )}
      </Box>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Setting</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Value</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {DEFAULT_SETTINGS.map((def) => (
              <TableRow key={def.key}>
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{def.label}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="caption" sx={{ color: themeTokens.neutral[500] }}>
                    {def.description}
                  </Typography>
                </TableCell>
                <TableCell>
                  <TextField
                    value={editValues[def.key] || ''}
                    onChange={(e) => setEditValues((prev) => ({ ...prev, [def.key]: e.target.value }))}
                    size="small"
                    sx={{ width: 100 }}
                    placeholder={def.defaultValue}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSaveAll}
          disabled={!hasChanges || saving}
          sx={{
            textTransform: 'none',
            bgcolor: themeTokens.colors.primary,
            '&:hover': { bgcolor: themeTokens.colors.primaryHover },
          }}
        >
          {saving ? 'Saving...' : 'Save All'}
        </Button>
      </Box>

      <Snackbar
        open={!!snackbar}
        autoHideDuration={3000}
        onClose={() => setSnackbar('')}
        message={snackbar}
      />
    </Box>
  );
}
