// Gym entity types

export type GymMemberRole = 'admin' | 'member';

export type Gym = {
  uuid: string;
  slug?: string | null;
  ownerId: string;
  ownerDisplayName?: string | null;
  ownerAvatarUrl?: string | null;
  name: string;
  description?: string | null;
  address?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isPublic: boolean;
  imageUrl?: string | null;
  createdAt: string;
  boardCount: number;
  memberCount: number;
  followerCount: number;
  commentCount: number;
  isFollowedByMe: boolean;
  isMember: boolean;
  myRole?: GymMemberRole | null;
};

export type GymConnection = {
  gyms: Gym[];
  totalCount: number;
  hasMore: boolean;
};

export type GymMember = {
  userId: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  role: GymMemberRole;
  createdAt: string;
};

export type GymMemberConnection = {
  members: GymMember[];
  totalCount: number;
  hasMore: boolean;
};

export type CreateGymInput = {
  name: string;
  description?: string;
  address?: string;
  contactEmail?: string;
  contactPhone?: string;
  latitude?: number;
  longitude?: number;
  isPublic?: boolean;
  imageUrl?: string;
  boardUuid?: string;
};

export type UpdateGymInput = {
  gymUuid: string;
  name?: string;
  slug?: string;
  description?: string;
  address?: string;
  contactEmail?: string;
  contactPhone?: string;
  latitude?: number;
  longitude?: number;
  isPublic?: boolean;
  imageUrl?: string;
};

export type AddGymMemberInput = {
  gymUuid: string;
  userId: string;
  role: GymMemberRole;
};

export type RemoveGymMemberInput = {
  gymUuid: string;
  userId: string;
};

export type FollowGymInput = {
  gymUuid: string;
};

export type MyGymsInput = {
  includeFollowed?: boolean;
  limit?: number;
  offset?: number;
};

export type SearchGymsInput = {
  query?: string;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  limit?: number;
  offset?: number;
};

export type GymMembersInput = {
  gymUuid: string;
  limit?: number;
  offset?: number;
};

export type LinkBoardToGymInput = {
  boardUuid: string;
  gymUuid?: string | null;
};
