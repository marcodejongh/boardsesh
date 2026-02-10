'use client';

import React, { useState } from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import MuiButton from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import MuiTypography from '@mui/material/Typography';

interface BoardFormFieldValues {
  name: string;
  slug?: string;
  description: string;
  locationName: string;
  isPublic: boolean;
  isOwned: boolean;
}

interface BoardFormProps {
  /** Form title displayed at the top */
  title: string;
  /** Submit button label */
  submitLabel: string;
  /** Initial field values */
  initialValues: BoardFormFieldValues;
  /** Whether to show the slug field (edit mode only) */
  showSlugField?: boolean;
  /** Slug helper text prefix */
  slugHelperPrefix?: string;
  /** Placeholder for the name field */
  namePlaceholder?: string;
  /** Placeholder for the description field */
  descriptionPlaceholder?: string;
  /** Placeholder for the location field */
  locationPlaceholder?: string;
  /** Called with form values on submit. Should throw on failure. */
  onSubmit: (values: BoardFormFieldValues) => Promise<void>;
  /** Optional cancel handler */
  onCancel?: () => void;
}

/**
 * Shared form component for creating and editing boards.
 * Consolidates the duplicated form structure between CreateBoardForm and EditBoardForm.
 */
export default function BoardForm({
  title,
  submitLabel,
  initialValues,
  showSlugField = false,
  slugHelperPrefix = 'boardsesh.com/b/',
  namePlaceholder,
  descriptionPlaceholder = 'Optional description',
  locationPlaceholder,
  onSubmit,
  onCancel,
}: BoardFormProps) {
  const [name, setName] = useState(initialValues.name);
  const [slug, setSlug] = useState(initialValues.slug ?? '');
  const [description, setDescription] = useState(initialValues.description);
  const [locationName, setLocationName] = useState(initialValues.locationName);
  const [isPublic, setIsPublic] = useState(initialValues.isPublic);
  const [isOwned, setIsOwned] = useState(initialValues.isOwned);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await onSubmit({
        name: name.trim(),
        slug: slug.trim() || undefined,
        description: description.trim(),
        locationName: locationName.trim(),
        isPublic,
        isOwned,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <MuiTypography variant="h6">{title}</MuiTypography>

      <TextField
        label="Board Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        fullWidth
        size="small"
        placeholder={namePlaceholder}
        inputProps={{ maxLength: 100 }}
      />

      {showSlugField && (
        <TextField
          label="URL Slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
          fullWidth
          size="small"
          helperText={`${slugHelperPrefix}${slug || '...'}`}
        />
      )}

      <TextField
        label="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        fullWidth
        size="small"
        multiline
        minRows={2}
        maxRows={4}
        placeholder={descriptionPlaceholder}
      />

      <TextField
        label="Location"
        value={locationName}
        onChange={(e) => setLocationName(e.target.value)}
        fullWidth
        size="small"
        placeholder={locationPlaceholder}
      />

      <FormControlLabel
        control={<Switch checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />}
        label="Public board"
      />

      <FormControlLabel
        control={<Switch checked={isOwned} onChange={(e) => setIsOwned(e.target.checked)} />}
        label="I own this board"
      />

      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mt: 1 }}>
        {onCancel && (
          <MuiButton variant="text" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </MuiButton>
        )}
        <MuiButton
          type="submit"
          variant="contained"
          disabled={isSubmitting || !name.trim()}
        >
          {isSubmitting ? <CircularProgress size={20} color="inherit" /> : submitLabel}
        </MuiButton>
      </Box>
    </Box>
  );
}
