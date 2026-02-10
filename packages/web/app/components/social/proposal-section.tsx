'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import AcUnitIcon from '@mui/icons-material/AcUnit';
import { themeTokens } from '@/app/theme/theme-config';
import { useWsAuthToken } from '@/app/components/auth/ws-auth-provider';
import { createGraphQLHttpClient } from '@/app/lib/graphql/client';
import {
  GET_CLIMB_COMMUNITY_STATUS,
  GET_CLIMB_PROPOSALS,
  GET_MY_ROLES,
} from '@/app/lib/graphql/operations/proposals';
import type {
  ClimbCommunityStatusType,
  Proposal,
  ProposalConnection,
  CommunityRoleAssignment,
} from '@boardsesh/shared-schema';
import ProposalCard from './proposal-card';
import CreateProposalForm from './create-proposal-form';
import FreezeIndicator from './freeze-indicator';
import FreezeClimbDialog from './freeze-climb-dialog';
import CommunityStatusBadge from './community-status-badge';

interface ProposalSectionProps {
  climbUuid: string;
  boardType: string;
  angle: number;
}

export default function ProposalSection({ climbUuid, boardType, angle }: ProposalSectionProps) {
  const { token } = useWsAuthToken();
  const [communityStatus, setCommunityStatus] = useState<ClimbCommunityStatusType | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [isAdminOrLeader, setIsAdminOrLeader] = useState(false);
  const [showFreezeDialog, setShowFreezeDialog] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const client = createGraphQLHttpClient(token || undefined);

      const [statusResult, proposalsResult] = await Promise.all([
        client.request<{ climbCommunityStatus: ClimbCommunityStatusType }>(
          GET_CLIMB_COMMUNITY_STATUS,
          { climbUuid, boardType, angle },
        ),
        client.request<{ climbProposals: ProposalConnection }>(
          GET_CLIMB_PROPOSALS,
          { input: { climbUuid, boardType, angle, status: 'open', limit: 10, offset: 0 } },
        ),
      ]);

      setCommunityStatus(statusResult.climbCommunityStatus);
      setProposals(proposalsResult.climbProposals.proposals);

      // Check user roles
      if (token) {
        try {
          const rolesResult = await client.request<{ myRoles: CommunityRoleAssignment[] }>(GET_MY_ROLES);
          const hasRole = rolesResult.myRoles.some(
            (r) =>
              (r.role === 'admin' || r.role === 'community_leader') &&
              (r.boardType === null || r.boardType === boardType),
          );
          setIsAdminOrLeader(hasRole);
        } catch {
          // Not authenticated or no roles
        }
      }
    } catch (err) {
      console.error('[ProposalSection] Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  }, [climbUuid, boardType, angle, token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleProposalCreated = useCallback((proposal: Proposal) => {
    setProposals((prev) => [proposal, ...prev]);
    fetchData();
  }, [fetchData]);

  const handleProposalUpdated = useCallback((updated: Proposal) => {
    setProposals((prev) => prev.map((p) => (p.uuid === updated.uuid ? updated : p)));
    // Refresh status if proposal was resolved
    if (updated.status !== 'open') {
      fetchData();
    }
  }, [fetchData]);

  if (loading) return null;

  return (
    <Box sx={{ mb: 2 }}>
      {/* Community status badges */}
      {communityStatus && (
        <Box sx={{ mb: 1.5 }}>
          <CommunityStatusBadge
            communityGrade={communityStatus.communityGrade}
            isClassic={communityStatus.isClassic}
            isBenchmark={communityStatus.isBenchmark}
            isFrozen={communityStatus.isFrozen}
          />
        </Box>
      )}

      {/* Freeze indicator */}
      {communityStatus?.isFrozen && (
        <FreezeIndicator reason={communityStatus.freezeReason} />
      )}

      {/* Section header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: themeTokens.neutral[700] }}>
          Community Proposals
          {proposals.length > 0 && (
            <Typography component="span" variant="caption" sx={{ ml: 0.5, color: themeTokens.neutral[400] }}>
              ({proposals.length})
            </Typography>
          )}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {isAdminOrLeader && (
            <Tooltip title={communityStatus?.isFrozen ? 'Unfreeze climb' : 'Freeze climb'}>
              <IconButton
                size="small"
                onClick={() => setShowFreezeDialog(true)}
                sx={{ color: communityStatus?.isFrozen ? themeTokens.colors.warning : themeTokens.neutral[400] }}
              >
                <AcUnitIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <CreateProposalForm
            climbUuid={climbUuid}
            boardType={boardType}
            angle={angle}
            isFrozen={communityStatus?.isFrozen}
            outlierWarning={communityStatus?.outlierAnalysis?.isOutlier}
            onCreated={handleProposalCreated}
          />
        </Box>
      </Box>

      {/* Proposals list */}
      {proposals.length > 0 ? (
        proposals.map((proposal) => (
          <ProposalCard
            key={proposal.uuid}
            proposal={proposal}
            isAdminOrLeader={isAdminOrLeader}
            onUpdate={handleProposalUpdated}
          />
        ))
      ) : (
        <Typography variant="body2" sx={{ color: themeTokens.neutral[400], textAlign: 'center', py: 2 }}>
          No open proposals
        </Typography>
      )}

      {/* Freeze dialog */}
      {showFreezeDialog && communityStatus && (
        <FreezeClimbDialog
          open={showFreezeDialog}
          onClose={() => setShowFreezeDialog(false)}
          climbUuid={climbUuid}
          boardType={boardType}
          currentlyFrozen={communityStatus.isFrozen}
          onFreezeChanged={() => fetchData()}
        />
      )}
    </Box>
  );
}
