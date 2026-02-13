'use client';

import React, { useState } from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import MuiButton from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import MuiTypography from '@mui/material/Typography';

export interface GymFormFieldValues {
  name: string;
  slug?: string;
  description: string;
  address: string;
  contactEmail: string;
  contactPhone: string;
  isPublic: boolean;
}

interface GymFormProps {
  title: string;
  submitLabel: string;
  initialValues: GymFormFieldValues;
  showSlugField?: boolean;
  onSubmit: (values: GymFormFieldValues) => Promise<void>;
  onCancel?: () => void;
}

export default function GymForm({
  title,
  submitLabel,
  initialValues,
  showSlugField = false,
  onSubmit,
  onCancel,
}: GymFormProps) {
  const [name, setName] = useState(initialValues.name);
  const [slug, setSlug] = useState(initialValues.slug ?? '');
  const [description, setDescription] = useState(initialValues.description);
  const [address, setAddress] = useState(initialValues.address);
  const [contactEmail, setContactEmail] = useState(initialValues.contactEmail);
  const [contactPhone, setContactPhone] = useState(initialValues.contactPhone);
  const [isPublic, setIsPublic] = useState(initialValues.isPublic);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await onSubmit({
        name: name.trim(),
        slug: slug.trim() || undefined,
        description: description.trim(),
        address: address.trim(),
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone.trim(),
        isPublic,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <MuiTypography variant="h6">{title}</MuiTypography>

      <TextField
        label="Gym Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        fullWidth
        size="small"
        placeholder="e.g., Boulder World, The Climbing Factory"
        inputProps={{ maxLength: 100 }}
      />

      {showSlugField && (
        <TextField
          label="URL Slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
          fullWidth
          size="small"
          helperText={`boardsesh.com/gym/${slug || '...'}`}
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
        placeholder="Optional description"
      />

      <TextField
        label="Address"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        fullWidth
        size="small"
        placeholder="e.g., 123 Main St, City"
      />

      <TextField
        label="Contact Email"
        value={contactEmail}
        onChange={(e) => setContactEmail(e.target.value)}
        fullWidth
        size="small"
        type="email"
        placeholder="Optional contact email"
      />

      <TextField
        label="Contact Phone"
        value={contactPhone}
        onChange={(e) => setContactPhone(e.target.value)}
        fullWidth
        size="small"
        placeholder="Optional contact phone"
      />

      <FormControlLabel
        control={<Switch checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />}
        label="Public gym"
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
