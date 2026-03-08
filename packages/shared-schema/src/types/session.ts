// Session types

export type SessionUser = {
  id: string;
  username: string;
  isLeader: boolean;
  avatarUrl?: string;
};

export type SessionGradeCount = {
  grade: string;
  count: number;
};

export type SessionHardestClimb = {
  climbUuid: string;
  climbName: string;
  grade: string;
};

export type SessionParticipant = {
  userId: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  sends: number;
  attempts: number;
};

export type SessionSummary = {
  sessionId: string;
  totalSends: number;
  totalAttempts: number;
  gradeDistribution: SessionGradeCount[];
  hardestClimb?: SessionHardestClimb | null;
  participants: SessionParticipant[];
  startedAt?: string | null;
  endedAt?: string | null;
  durationMinutes?: number | null;
  goal?: string | null;
};

export type UpdateInferredSessionInput = {
  sessionId: string;
  name?: string | null;
  description?: string | null;
};

export type AddUserToSessionInput = {
  sessionId: string;
  userId: string;
};

export type RemoveUserFromSessionInput = {
  sessionId: string;
  userId: string;
};
