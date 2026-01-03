import { gql } from 'graphql-request';

// Fragment for playlist fields
export const PLAYLIST_FIELDS = gql`
  fragment PlaylistFields on Playlist {
    id
    uuid
    boardType
    layoutId
    name
    description
    isPublic
    color
    icon
    createdAt
    updatedAt
    climbCount
    userRole
  }
`;

// Get user's playlists for a board+layout
export const GET_USER_PLAYLISTS = gql`
  ${PLAYLIST_FIELDS}
  query GetUserPlaylists($input: GetUserPlaylistsInput!) {
    userPlaylists(input: $input) {
      ...PlaylistFields
    }
  }
`;

// Get playlist by ID
export const GET_PLAYLIST = gql`
  ${PLAYLIST_FIELDS}
  query GetPlaylist($playlistId: ID!) {
    playlist(playlistId: $playlistId) {
      ...PlaylistFields
    }
  }
`;

// Get playlists containing a climb (returns playlist IDs)
export const GET_PLAYLISTS_FOR_CLIMB = gql`
  query GetPlaylistsForClimb($input: GetPlaylistsForClimbInput!) {
    playlistsForClimb(input: $input)
  }
`;

// Create new playlist
export const CREATE_PLAYLIST = gql`
  ${PLAYLIST_FIELDS}
  mutation CreatePlaylist($input: CreatePlaylistInput!) {
    createPlaylist(input: $input) {
      ...PlaylistFields
    }
  }
`;

// Update playlist
export const UPDATE_PLAYLIST = gql`
  ${PLAYLIST_FIELDS}
  mutation UpdatePlaylist($input: UpdatePlaylistInput!) {
    updatePlaylist(input: $input) {
      ...PlaylistFields
    }
  }
`;

// Delete playlist
export const DELETE_PLAYLIST = gql`
  mutation DeletePlaylist($playlistId: ID!) {
    deletePlaylist(playlistId: $playlistId)
  }
`;

// Add climb to playlist
export const ADD_CLIMB_TO_PLAYLIST = gql`
  mutation AddClimbToPlaylist($input: AddClimbToPlaylistInput!) {
    addClimbToPlaylist(input: $input) {
      id
      playlistId
      climbUuid
      angle
      position
      addedAt
    }
  }
`;

// Remove climb from playlist
export const REMOVE_CLIMB_FROM_PLAYLIST = gql`
  mutation RemoveClimbFromPlaylist($input: RemoveClimbFromPlaylistInput!) {
    removeClimbFromPlaylist(input: $input)
  }
`;

// Get climbs in a playlist with full climb data
export const GET_PLAYLIST_CLIMBS = gql`
  query GetPlaylistClimbs($input: GetPlaylistClimbsInput!) {
    playlistClimbs(input: $input) {
      climbs {
        uuid
        layoutId
        setter_username
        name
        description
        frames
        angle
        ascensionist_count
        difficulty
        quality_average
        stars
        difficulty_error
        litUpHoldsMap
        benchmark_difficulty
      }
      totalCount
      hasMore
    }
  }
`;

// TypeScript types for operations

export interface Playlist {
  id: string;
  uuid: string;
  boardType: string;
  layoutId?: number | null; // Nullable for Aurora-synced circuits
  name: string;
  description?: string;
  isPublic: boolean;
  color?: string;
  icon?: string;
  createdAt: string;
  updatedAt: string;
  climbCount: number;
  userRole?: string;
}

export interface GetUserPlaylistsInput {
  boardType: string;
  layoutId: number;
}

export interface GetUserPlaylistsQueryVariables {
  input: GetUserPlaylistsInput;
}

export interface GetUserPlaylistsQueryResponse {
  userPlaylists: Playlist[];
}

export interface GetPlaylistQueryVariables {
  playlistId: string;
}

export interface GetPlaylistQueryResponse {
  playlist: Playlist | null;
}

export interface GetPlaylistsForClimbInput {
  boardType: string;
  layoutId: number;
  climbUuid: string;
}

export interface GetPlaylistsForClimbQueryVariables {
  input: GetPlaylistsForClimbInput;
}

export interface GetPlaylistsForClimbQueryResponse {
  playlistsForClimb: string[];
}

export interface CreatePlaylistInput {
  boardType: string;
  layoutId: number;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}

export interface CreatePlaylistMutationVariables {
  input: CreatePlaylistInput;
}

export interface CreatePlaylistMutationResponse {
  createPlaylist: Playlist;
}

export interface UpdatePlaylistInput {
  playlistId: string;
  name?: string;
  description?: string;
  isPublic?: boolean;
  color?: string;
  icon?: string;
}

export interface UpdatePlaylistMutationVariables {
  input: UpdatePlaylistInput;
}

export interface UpdatePlaylistMutationResponse {
  updatePlaylist: Playlist;
}

export interface DeletePlaylistMutationVariables {
  playlistId: string;
}

export interface DeletePlaylistMutationResponse {
  deletePlaylist: boolean;
}

export interface AddClimbToPlaylistInput {
  playlistId: string;
  climbUuid: string;
  angle: number;
}

export interface AddClimbToPlaylistMutationVariables {
  input: AddClimbToPlaylistInput;
}

export interface AddClimbToPlaylistMutationResponse {
  addClimbToPlaylist: {
    id: string;
    playlistId: string;
    climbUuid: string;
    angle: number;
    position: number;
    addedAt: string;
  };
}

export interface RemoveClimbFromPlaylistInput {
  playlistId: string;
  climbUuid: string;
}

export interface RemoveClimbFromPlaylistMutationVariables {
  input: RemoveClimbFromPlaylistInput;
}

export interface RemoveClimbFromPlaylistMutationResponse {
  removeClimbFromPlaylist: boolean;
}

export interface GetPlaylistClimbsInput {
  playlistId: string;
  boardName: string;
  layoutId: number;
  sizeId: number;
  setIds: string;
  angle: number;
  page?: number;
  pageSize?: number;
}

export interface GetPlaylistClimbsQueryVariables {
  input: GetPlaylistClimbsInput;
}

export interface PlaylistClimbsResult {
  climbs: Array<{
    uuid: string;
    layoutId?: number | null;
    setter_username: string;
    name: string;
    description: string;
    frames: string;
    angle: number;
    ascensionist_count: number;
    difficulty: string;
    quality_average: string;
    stars: number;
    difficulty_error: string;
    litUpHoldsMap: Record<string, unknown>;
    benchmark_difficulty: string | null;
  }>;
  totalCount: number;
  hasMore: boolean;
}

export interface GetPlaylistClimbsQueryResponse {
  playlistClimbs: PlaylistClimbsResult;
}

// ============================================
// Discover Playlists Types and Operations
// ============================================

// Playlist creator info for autocomplete
export interface PlaylistCreator {
  userId: string;
  displayName: string;
  playlistCount: number;
}

// Discoverable playlist with creator info
export interface DiscoverablePlaylist {
  id: string;
  uuid: string;
  boardType: string;
  layoutId?: number | null;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  createdAt: string;
  updatedAt: string;
  climbCount: number;
  creatorId: string;
  creatorName: string;
}

export interface DiscoverPlaylistsInput {
  boardType: string;
  layoutId: number;
  name?: string;
  creatorIds?: string[];
  page?: number;
  pageSize?: number;
}

export interface DiscoverPlaylistsResult {
  playlists: DiscoverablePlaylist[];
  totalCount: number;
  hasMore: boolean;
}

export interface DiscoverPlaylistsQueryVariables {
  input: DiscoverPlaylistsInput;
}

export interface DiscoverPlaylistsQueryResponse {
  discoverPlaylists: DiscoverPlaylistsResult;
}

export interface GetPlaylistCreatorsInput {
  boardType: string;
  layoutId: number;
  searchQuery?: string;
}

export interface GetPlaylistCreatorsQueryVariables {
  input: GetPlaylistCreatorsInput;
}

export interface GetPlaylistCreatorsQueryResponse {
  playlistCreators: PlaylistCreator[];
}

// Discover public playlists
export const DISCOVER_PLAYLISTS = gql`
  query DiscoverPlaylists($input: DiscoverPlaylistsInput!) {
    discoverPlaylists(input: $input) {
      playlists {
        id
        uuid
        boardType
        layoutId
        name
        description
        color
        icon
        createdAt
        updatedAt
        climbCount
        creatorId
        creatorName
      }
      totalCount
      hasMore
    }
  }
`;

// Get playlist creators for autocomplete
export const GET_PLAYLIST_CREATORS = gql`
  query GetPlaylistCreators($input: GetPlaylistCreatorsInput!) {
    playlistCreators(input: $input) {
      userId
      displayName
      playlistCount
    }
  }
`;
