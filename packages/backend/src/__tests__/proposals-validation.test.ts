import { describe, it, expect } from 'vitest';
import {
  CreateProposalInputSchema,
  VoteOnProposalInputSchema,
  ResolveProposalInputSchema,
  DeleteProposalInputSchema,
  SetterOverrideInputSchema,
  FreezeClimbInputSchema,
  BrowseProposalsInputSchema,
  GetClimbProposalsInputSchema,
} from '../validation/schemas';

describe('Proposal Validation Schemas', () => {
  describe('CreateProposalInputSchema', () => {
    const validInput = {
      climbUuid: 'abc123',
      boardType: 'kilter',
      angle: 40,
      type: 'grade',
      proposedValue: 'V5',
      reason: 'Feels more like V5',
    };

    it('should accept valid input', () => {
      const result = CreateProposalInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should accept null angle', () => {
      const result = CreateProposalInputSchema.safeParse({ ...validInput, angle: null });
      expect(result.success).toBe(true);
    });

    it('should accept angle at lower boundary (0)', () => {
      const result = CreateProposalInputSchema.safeParse({ ...validInput, angle: 0 });
      expect(result.success).toBe(true);
    });

    it('should accept angle at upper boundary (90)', () => {
      const result = CreateProposalInputSchema.safeParse({ ...validInput, angle: 90 });
      expect(result.success).toBe(true);
    });

    it('should reject angle above 90', () => {
      const result = CreateProposalInputSchema.safeParse({ ...validInput, angle: 91 });
      expect(result.success).toBe(false);
    });

    it('should reject negative angle', () => {
      const result = CreateProposalInputSchema.safeParse({ ...validInput, angle: -1 });
      expect(result.success).toBe(false);
    });

    it('should reject missing climbUuid', () => {
      const { climbUuid: _, ...withoutClimbUuid } = validInput;
      const result = CreateProposalInputSchema.safeParse(withoutClimbUuid);
      expect(result.success).toBe(false);
    });

    it('should reject empty proposedValue', () => {
      const result = CreateProposalInputSchema.safeParse({ ...validInput, proposedValue: '' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('empty');
      }
    });

    it('should reject proposedValue exceeding max length', () => {
      const result = CreateProposalInputSchema.safeParse({ ...validInput, proposedValue: 'a'.repeat(101) });
      expect(result.success).toBe(false);
    });

    it('should reject invalid type', () => {
      const result = CreateProposalInputSchema.safeParse({ ...validInput, type: 'invalid' });
      expect(result.success).toBe(false);
    });

    it('should accept all valid types', () => {
      for (const type of ['grade', 'classic', 'benchmark']) {
        const result = CreateProposalInputSchema.safeParse({ ...validInput, type });
        expect(result.success).toBe(true);
      }
    });

    it('should accept null reason', () => {
      const result = CreateProposalInputSchema.safeParse({ ...validInput, reason: null });
      expect(result.success).toBe(true);
    });

    it('should reject reason exceeding max length', () => {
      const result = CreateProposalInputSchema.safeParse({ ...validInput, reason: 'a'.repeat(501) });
      expect(result.success).toBe(false);
    });

    it('should reject invalid boardType', () => {
      const result = CreateProposalInputSchema.safeParse({ ...validInput, boardType: 'unknown' });
      expect(result.success).toBe(false);
    });
  });

  describe('VoteOnProposalInputSchema', () => {
    it('should accept +1 vote', () => {
      const result = VoteOnProposalInputSchema.safeParse({
        proposalUuid: '550e8400-e29b-41d4-a716-446655440000',
        value: 1,
      });
      expect(result.success).toBe(true);
    });

    it('should accept -1 vote', () => {
      const result = VoteOnProposalInputSchema.safeParse({
        proposalUuid: '550e8400-e29b-41d4-a716-446655440000',
        value: -1,
      });
      expect(result.success).toBe(true);
    });

    it('should reject 0 vote', () => {
      const result = VoteOnProposalInputSchema.safeParse({
        proposalUuid: '550e8400-e29b-41d4-a716-446655440000',
        value: 0,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('+1 or -1');
      }
    });

    it('should reject value of 2', () => {
      const result = VoteOnProposalInputSchema.safeParse({
        proposalUuid: '550e8400-e29b-41d4-a716-446655440000',
        value: 2,
      });
      expect(result.success).toBe(false);
    });

    it('should reject value of -2', () => {
      const result = VoteOnProposalInputSchema.safeParse({
        proposalUuid: '550e8400-e29b-41d4-a716-446655440000',
        value: -2,
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing proposalUuid', () => {
      const result = VoteOnProposalInputSchema.safeParse({ value: 1 });
      expect(result.success).toBe(false);
    });

    it('should reject invalid UUID format', () => {
      const result = VoteOnProposalInputSchema.safeParse({
        proposalUuid: 'not-a-uuid',
        value: 1,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('ResolveProposalInputSchema', () => {
    const validUuid = '550e8400-e29b-41d4-a716-446655440000';

    it('should accept approved status', () => {
      const result = ResolveProposalInputSchema.safeParse({
        proposalUuid: validUuid,
        status: 'approved',
      });
      expect(result.success).toBe(true);
    });

    it('should accept rejected status', () => {
      const result = ResolveProposalInputSchema.safeParse({
        proposalUuid: validUuid,
        status: 'rejected',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid status', () => {
      const result = ResolveProposalInputSchema.safeParse({
        proposalUuid: validUuid,
        status: 'pending',
      });
      expect(result.success).toBe(false);
    });

    it('should accept optional reason', () => {
      const result = ResolveProposalInputSchema.safeParse({
        proposalUuid: validUuid,
        status: 'approved',
        reason: 'Verified by setter',
      });
      expect(result.success).toBe(true);
    });

    it('should reject reason exceeding max length', () => {
      const result = ResolveProposalInputSchema.safeParse({
        proposalUuid: validUuid,
        status: 'approved',
        reason: 'a'.repeat(501),
      });
      expect(result.success).toBe(false);
    });
  });

  describe('DeleteProposalInputSchema', () => {
    it('should accept valid UUID', () => {
      const result = DeleteProposalInputSchema.safeParse({
        proposalUuid: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID format', () => {
      const result = DeleteProposalInputSchema.safeParse({
        proposalUuid: 'not-a-uuid',
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing proposalUuid', () => {
      const result = DeleteProposalInputSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe('SetterOverrideInputSchema', () => {
    const validInput = {
      climbUuid: 'abc123',
      boardType: 'kilter',
      angle: 40,
    };

    it('should accept valid input', () => {
      const result = SetterOverrideInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should accept optional communityGrade', () => {
      const result = SetterOverrideInputSchema.safeParse({ ...validInput, communityGrade: 'V5' });
      expect(result.success).toBe(true);
    });

    it('should accept optional isBenchmark', () => {
      const result = SetterOverrideInputSchema.safeParse({ ...validInput, isBenchmark: true });
      expect(result.success).toBe(true);
    });

    it('should reject invalid boardType', () => {
      const result = SetterOverrideInputSchema.safeParse({ ...validInput, boardType: 'unknown' });
      expect(result.success).toBe(false);
    });

    it('should reject angle above 90', () => {
      const result = SetterOverrideInputSchema.safeParse({ ...validInput, angle: 91 });
      expect(result.success).toBe(false);
    });

    it('should accept angle at boundaries', () => {
      expect(SetterOverrideInputSchema.safeParse({ ...validInput, angle: 0 }).success).toBe(true);
      expect(SetterOverrideInputSchema.safeParse({ ...validInput, angle: 90 }).success).toBe(true);
    });

    it('should reject communityGrade exceeding max length', () => {
      const result = SetterOverrideInputSchema.safeParse({ ...validInput, communityGrade: 'a'.repeat(101) });
      expect(result.success).toBe(false);
    });
  });

  describe('FreezeClimbInputSchema', () => {
    const validInput = {
      climbUuid: 'abc123',
      boardType: 'kilter',
      frozen: true,
    };

    it('should accept valid input', () => {
      const result = FreezeClimbInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should accept frozen=false', () => {
      const result = FreezeClimbInputSchema.safeParse({ ...validInput, frozen: false });
      expect(result.success).toBe(true);
    });

    it('should reject missing frozen field', () => {
      const { frozen: _, ...withoutFrozen } = validInput;
      const result = FreezeClimbInputSchema.safeParse(withoutFrozen);
      expect(result.success).toBe(false);
    });

    it('should accept optional reason', () => {
      const result = FreezeClimbInputSchema.safeParse({ ...validInput, reason: 'Duplicate climb' });
      expect(result.success).toBe(true);
    });

    it('should reject reason exceeding max length', () => {
      const result = FreezeClimbInputSchema.safeParse({ ...validInput, reason: 'a'.repeat(501) });
      expect(result.success).toBe(false);
    });
  });

  describe('BrowseProposalsInputSchema', () => {
    it('should accept empty input with defaults', () => {
      const result = BrowseProposalsInputSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(20);
        expect(result.data.offset).toBe(0);
      }
    });

    it('should accept custom limit and offset', () => {
      const result = BrowseProposalsInputSchema.safeParse({ limit: 10, offset: 5 });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(10);
        expect(result.data.offset).toBe(5);
      }
    });

    it('should reject limit exceeding max (50)', () => {
      const result = BrowseProposalsInputSchema.safeParse({ limit: 51 });
      expect(result.success).toBe(false);
    });

    it('should reject limit less than 1', () => {
      const result = BrowseProposalsInputSchema.safeParse({ limit: 0 });
      expect(result.success).toBe(false);
    });

    it('should reject negative offset', () => {
      const result = BrowseProposalsInputSchema.safeParse({ offset: -1 });
      expect(result.success).toBe(false);
    });

    it('should accept optional filters', () => {
      const result = BrowseProposalsInputSchema.safeParse({
        boardType: 'kilter',
        type: 'grade',
        status: 'open',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid status filter', () => {
      const result = BrowseProposalsInputSchema.safeParse({ status: 'invalid' });
      expect(result.success).toBe(false);
    });

    it('should reject invalid type filter', () => {
      const result = BrowseProposalsInputSchema.safeParse({ type: 'invalid' });
      expect(result.success).toBe(false);
    });
  });

  describe('GetClimbProposalsInputSchema', () => {
    const validInput = {
      climbUuid: 'abc123',
      boardType: 'kilter',
    };

    it('should accept valid input with defaults', () => {
      const result = GetClimbProposalsInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(20);
        expect(result.data.offset).toBe(0);
      }
    });

    it('should accept all optional filters', () => {
      const result = GetClimbProposalsInputSchema.safeParse({
        ...validInput,
        angle: 40,
        type: 'grade',
        status: 'open',
        limit: 10,
        offset: 5,
      });
      expect(result.success).toBe(true);
    });

    it('should reject limit exceeding max (50)', () => {
      const result = GetClimbProposalsInputSchema.safeParse({ ...validInput, limit: 51 });
      expect(result.success).toBe(false);
    });

    it('should reject limit less than 1', () => {
      const result = GetClimbProposalsInputSchema.safeParse({ ...validInput, limit: 0 });
      expect(result.success).toBe(false);
    });

    it('should reject negative offset', () => {
      const result = GetClimbProposalsInputSchema.safeParse({ ...validInput, offset: -1 });
      expect(result.success).toBe(false);
    });

    it('should accept null angle', () => {
      const result = GetClimbProposalsInputSchema.safeParse({ ...validInput, angle: null });
      expect(result.success).toBe(true);
    });

    it('should reject angle above 90', () => {
      const result = GetClimbProposalsInputSchema.safeParse({ ...validInput, angle: 91 });
      expect(result.success).toBe(false);
    });

    it('should reject missing climbUuid', () => {
      const result = GetClimbProposalsInputSchema.safeParse({ boardType: 'kilter' });
      expect(result.success).toBe(false);
    });

    it('should reject missing boardType', () => {
      const result = GetClimbProposalsInputSchema.safeParse({ climbUuid: 'abc123' });
      expect(result.success).toBe(false);
    });
  });
});
