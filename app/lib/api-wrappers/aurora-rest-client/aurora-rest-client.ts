// aurora-api-client.ts

import { AscentDetails, BidDetails, CircuitDetails, ClientOptions, ClimbDetails, ClimbReport, ClimbSummary, DeleteUserValidationErrors, Exhibit, ExhibitsFilter, Follow, FollowState, GymPin, HOST_BASES, Leaderboard, LeaderboardScore, LoginResponse, NotificationsFilter, ProfileDetails, SearchResult, Session, SessionResponse, SharedSync, SignUpDetails, SyncResponse, Tag, UserProfile, UserSync, WallDetails } from "./types";
import { SaveAscentResponse } from "../aurora/types";



/**
 * Aurora Climbing API Client
 */
class AuroraClimbingClient {
  private baseURL: string;
  private token: string | null;
  private session: Session | null;
  private apiVersion: string;

  /**
   * Create a new API client instance
   * @param options - Configuration options
   */
  constructor({ boardName, token = null, apiVersion = 'v1' }: ClientOptions) {
    this.token = token;
    this.session = null;
    this.apiVersion = apiVersion;
    this.baseURL = `${HOST_BASES[boardName]}.com`;
  }

  /**
   * Set the authentication token
   * @param token - The authentication token
   */
  setSession(session: Session): void {
    this.session = session;
    this.token = session.token;
  }

  getUserId(): number | null {
    return this.session?.user_id || null;
  }

  /**
   * Create URL encoded form data from an object
   * @param data - Data to encode
   * @returns URL encoded string
   */
  private encodeFormData(data: Record<string, string | number | boolean | null | undefined>): string {
    return Object.keys(data)
      .map((key) => {
        if (data[key] === null || data[key] === undefined) {
          return '';
        }
        return `${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`;
      })
      .filter((part) => part !== '')
      .join('&');
  }

  /**
   * Create request headers with authentication
   * @param contentType - Optional content type override
   * @returns Headers object
   */
  private createHeaders(contentType?: string): HeadersInit {
    const headers: HeadersInit = {
      'Accept': 'application/json',
      'Content-Type': contentType || 'application/x-www-form-urlencoded',
      'Connection': 'keep-alive',
      'Accept-Language': 'en-AU,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'User-Agent': 'Kilter%20Board/202 CFNetwork/1568.100.1 Darwin/24.0.0'
    };

    if (this.token) {
      headers['Cookie'] = `token=${this.token}`;
    }

    return headers;
  }
  
  private constructUrl() {}
  /**
   * Make an API request
   * @param endpoint - API endpoint
   * @param fetchOptions - Fetch options
   * @returns Response data
   */
  private async request<T>(
    endpoint: string,
    fetchOptions: RequestInit = {},
    options: { apiUrl: boolean } = { apiUrl: false },
  ): Promise<T> {
    const url = `https://${options.apiUrl ? 'api.' : ''}${this.baseURL}${options.apiUrl ? `/${this.apiVersion}` : ''}${endpoint}`;

    try {
      const contentType =
        fetchOptions.headers && typeof fetchOptions.headers === 'object' && !Array.isArray(fetchOptions.headers)
          ? (fetchOptions.headers as Record<string, string>)['Content-Type']
          : undefined;

      const response = await fetch(url, {
        ...fetchOptions,
        headers: {
          ...this.createHeaders(contentType),
          ...(fetchOptions.headers || {}),
        },
        // Add timeout to prevent hanging requests
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });

      console.log(`Response status: ${response.status} ${response.statusText}`);
      console.log(`Response headers:`, Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const responseClone = response.clone();
        let errorData;
        try {
          errorData = await response.json();
        } catch (parseError) {
          try {
            errorData = await responseClone.text();
          } catch (textError) {
            errorData = 'Could not read error response';
          }
        }
        console.error(`API Error - ${url}:`, {
          status: response.status,
          statusText: response.statusText,
          data: errorData,
        });
        throw new Error(
          JSON.stringify({
            status: response.status,
            statusText: response.statusText,
            data: errorData,
            url: url,
          }),
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      
      // Enhance error messages for common issues
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`Request timeout: ${url} took longer than 30 seconds`);
        }
        if (error.message.includes('fetch')) {
          throw new Error(`Network error: Unable to connect to ${url}. Check internet connection and Aurora API status.`);
        }
        if (error.message.includes('Failed to fetch')) {
          throw new Error(`DNS/Connection error: Cannot resolve ${url}. Aurora servers may be unavailable.`);
        }
      }
      
      throw error;
    }
  }

  // #region Authentication

  /**
   * Sign up for a new account
   * @param signUpDetails - Sign up details
   * @returns Session data including token
   */
  async signUp(signUpDetails: SignUpDetails): Promise<SessionResponse> {
    try {
      const formData = this.encodeFormData({
        username: signUpDetails.username,
        password: signUpDetails.password,
        email_address: signUpDetails.emailAddress,
        tou: 'accepted',
        pp: 'accepted',
        ua: 'app',
      });

      if (signUpDetails.mailingListOptIn) {
        formData + '&' + this.encodeFormData({ ml: 'accepted' });
      }

      const response = await this.request<{ session: Session }>('/users?session=1', {
        method: 'POST',
        body: formData,
      });

      // Store the token for future requests
      if (response.session && response.session.token) {
        this.setSession(response.session);
      }

      return response;
    } catch (error) {
      // Parse error message
      if (typeof error === 'object' && error !== null && 'message' in error) {
        try {
          const errorObj = JSON.parse((error as Error).message);
          if (errorObj.status === 422) {
            throw new Error('Invalid sign-up details');
          } else if (errorObj.status === 429) {
            throw new Error('Too many sign-up attempts. Please try again later.');
          }
        } catch (e) {
          // If parsing fails, just throw the original error
        }
      }
      throw error;
    }
  }

  /**
   * Continue an existing session
   * @returns Session data
   * @throws Error if no existing token
   */
  async verifySession(username: string, password: string): Promise<Session> {
    if (!this.token) {
      throw new Error('No session token available');
    }

    const formData = this.encodeFormData({
      username,
      password,
      tou: 'accepted',
      pp: 'accepted',
      ua: 'app',
    });

    const data = await this.request<SessionResponse>('/sessions', {
      method: 'POST',
      body: formData,
    });

    if (data.session) {
      this.setSession(data.session);
      return data.session;
    }

    throw new Error('Failed to continue session');
  }

  /**
   * Sign in to the Aurora Climbing API with username and password
   * @param username - Username
   * @param password - Password
   * @returns Session data including token
   */
  async signIn(username: string, password: string): Promise<LoginResponse> {
    try {
      // Use /sessions endpoint on web host only
      const data = await this.request<LoginResponse>(
        '/sessions',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            username, 
            password,
            tou: "accepted",
            pp: "accepted",
            ua: "app"
          }),
        },
        { apiUrl: false }, // Use web host only
      );

      // Handle session extraction - response might have a session object
      if (data.session) {
        this.setSession({ token: data.session.token, user_id: data.session.user_id });
        
        // Construct a response that matches the UI expectations
        return { 
          token: data.session.token, 
          user_id: data.session.user_id,
          username: username, // Use the provided username since API doesn't return it
          error: '', // No error
          login: {
            created_at: new Date().toISOString(), // Use current time since API doesn't provide it
            token: data.session.token,
            user_id: data.session.user_id,
          },
          user: {
            id: data.session.user_id,
            username: username,
            email_address: '', // These will be filled by subsequent API calls
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            is_listed: true,
            is_public: true,
            avatar_image: null,
            banner_image: null,
            city: null,
            country: null,
            height: null,
            weight: null,
            wingspan: null,
          }
        };
      } else if (data.token && data.user_id) {
        this.setSession({ token: data.token, user_id: data.user_id });
        return data;
      }
      throw new Error('Login failed: Invalid response format');
    } catch (error) {
      // Parse error message
      if (typeof error === 'object' && error !== null && 'message' in error) {
        try {
          const errorObj = JSON.parse((error as Error).message);
          if (errorObj.status === 422) {
            throw new Error('Invalid username or password');
          } else if (errorObj.status === 429) {
            throw new Error('Too many login attempts. Please try again later.');
          }
        } catch (e) {
          // If parsing fails, just throw the original error
        }
      }
      throw error;
    }
  }

  /**
   * Sign out
   * @returns Promise that resolves on success
   */
  async signOut(): Promise<void> {
    if (!this.token) {
      throw new Error('Authentication required. Call signIn() first.');
    }

    const formData = this.encodeFormData({
      token: this.token,
    });

    await this.request('/sessions/delete', {
      method: 'POST',
      body: formData,
    });

    // Clear the token
    this.token = null;
  }

  /**
   * Synchronize data with the server
   * @param sharedSyncs - Shared sync information
   * @param userSyncs - User sync information (only if authenticated)
   * @returns Sync response data
   */
  async sync(sharedSyncs: SharedSync[], userSyncs?: UserSync[]): Promise<SyncResponse> {
    // Build sync parameters
    const params: string[] = [];

    // Process shared syncs - match APK database schema order
    const sharedTables = [
      'products',
      'product_sizes', 
      'holes',
      'leds',
      'products_angles',
      'layouts',
      'product_sizes_layouts_sets',
      'placements',
      'sets',
      'placement_roles',
      'climbs',
      'climb_stats',
      'beta_links',
      'attempts',
      'kits',
    ];

    // Map of table names to last sync timestamps
    const sharedSyncsMap: Record<string, string> = {};
    sharedSyncs.forEach((sync) => {
      sharedSyncsMap[sync.tableName] = sync.lastSynchronizedAt;
    });

    // Add shared syncs parameters
    sharedTables.forEach((table) => {
      const timestamp = sharedSyncsMap[table] || '1970-01-01 00:00:00.000000';
      params.push(`${encodeURIComponent(table)}=${encodeURIComponent(timestamp)}`);
    });

    // If authenticated, add user sync parameters
    if (this.token && userSyncs) {
      const userTables = ['users', 'walls', 'wall_expungements', 'draft_climbs', 'ascents', 'bids', 'tags', 'circuits'];

      // Map of table names to last sync timestamps
      const userSyncsMap: Record<string, string> = {};
      userSyncs.forEach((sync) => {
        userSyncsMap[sync.tableName] = sync.lastSynchronizedAt;
      });

      // Add user syncs parameters
      userTables.forEach((table) => {
        const timestamp = userSyncsMap[table] || '1970-01-01 00:00:00.000000';
        params.push(`${encodeURIComponent(table)}=${encodeURIComponent(timestamp)}`);
      });
    }

    // Build the request body
    const body = params.join('&');

    // Determine if we need to add authentication
    const options: RequestInit = {
      method: 'POST',
      body,
    };

    return await this.request<SyncResponse>('/sync', options);
  }

  // #endregion

  // #region Tags Management

  /**
   * Save a tag
   * @param tag - Tag to save
   * @returns Response data
   */
  async saveTag(tag: Tag): Promise<Tag> {
    if (!this.token) {
      throw new Error('Authentication required. Call signIn() first.');
    }

    const formData = this.encodeFormData({
      entity_uuid: tag.entityUUID,
      user_id: tag.userID,
      name: tag.name,
      is_listed: tag.isListed,
    });

    return await this.request<Tag>('/tags/save', {
      method: 'POST',
      body: formData,
    });
  }

  // #endregion

  // #region Exhibits Management

  /**
   * Save an exhibit
   * @param userId - User ID
   * @param climbUUID - Climb UUID
   * @param serialNumber - Optional serial number
   * @returns Promise that resolves on success
   */
  async saveExhibit(userId: number, climbUUID: string, serialNumber?: string): Promise<void> {
    if (!this.token) {
      throw new Error('Authentication required. Call signIn() first.');
    }

    // Build the form data
    let formData = this.encodeFormData({
      user_id: userId,
      climb_uuid: climbUUID,
    });

    // Add serial number if provided
    if (serialNumber) {
      formData +=
        '&' +
        this.encodeFormData({
          serial_number: serialNumber,
        });
    }

    await this.request('/exhibits', {
      method: 'POST',
      body: formData,
    });
  }

  /**
   * Get exhibits
   * @param parameters - Filter parameters
   * @returns List of exhibits
   */
  async getExhibits(parameters: ExhibitsFilter): Promise<Exhibit[]> {
    if (!this.token) {
      throw new Error('Authentication required. Call signIn() first.');
    }

    const params: string[] = [];

    // Add serial number
    params.push(`serial_number=${encodeURIComponent(parameters.serialNumber)}`);

    // Add before parameter if provided
    if (parameters.before) {
      params.push(`before=${encodeURIComponent(parameters.before)}`);
    }

    // Add after parameter if provided
    if (parameters.after) {
      params.push(`after=${encodeURIComponent(parameters.after)}`);
    }

    const endpoint = `/exhibits?${params.join('&')}`;

    const data = await this.request<{ exhibits: Exhibit[] }>(endpoint, {
      method: 'GET',
    });

    return data.exhibits || [];
  }

  // #endregion

  // #region Search and Explore

  /**
   * Search for content
   * @param query - Search query
   * @param type - Optional type filter
   * @returns Search results
   */
  async explore(query?: string, type?: string): Promise<SearchResult[]> {
    if (!this.token) {
      throw new Error('Authentication required. Call signIn() first.');
    }

    let endpoint = '/explore';
    const params = [];

    if (query) {
      params.push(`q=${encodeURIComponent(query)}`);
    }

    if (type) {
      params.push(`t=${encodeURIComponent(type)}`);
    }

    if (params.length > 0) {
      endpoint += `?${params.join('&')}`;
    }

    const data = await this.request<{ results: SearchResult[] }>(endpoint, {
      method: 'GET',
    });

    return data.results || [];
  }

  // #endregion

  // #region Notifications

  /**
   * Get user notifications
   * @param parameters - Filter parameters
   * @returns List of notifications
   */
  async getNotifications(parameters: NotificationsFilter): Promise<Notification[]> {
    if (!this.token) {
      throw new Error('Authentication required. Call signIn() first.');
    }

    // Map notification types to API parameters
    const typeMapping: Record<string, string> = {
      user: 'users',
      climb: 'climbs',
      ascent: 'ascents',
      like: 'likes',
      follow: 'follows',
    };

    const params: string[] = [];

    // Add type filters
    parameters.types.forEach((type) => {
      if (typeMapping[type]) {
        params.push(`${typeMapping[type]}=1`);
      }
    });

    // Add before parameter if provided
    if (parameters.before) {
      params.push(`before=${encodeURIComponent(parameters.before)}`);
    }

    const endpoint = `/notifications${params.length > 0 ? `?${params.join('&')}` : ''}`;

    const data = await this.request<{ notifications: Notification[] }>(endpoint, {
      method: 'GET',
    });

    return data.notifications || [];
  }

  // #endregion

  // #region Leaderboards

  /**
   * Get leaderboards
   * @returns List of leaderboards
   */
  async getLeaderboards(): Promise<Leaderboard[]> {
    const data = await this.request<{ leaderboards: Leaderboard[] }>('/leaderboards', {
      method: 'GET',
    });

    return data.leaderboards || [];
  }

  /**
   * Get leaderboard scores
   * @param leaderboardId - Leaderboard ID
   * @param offset - Pagination offset
   * @returns List of leaderboard scores
   */
  async getLeaderboardScores(leaderboardId: number, offset: number = 0): Promise<LeaderboardScore[]> {
    const endpoint = `/leaderboard_scores?leaderboard_id=${leaderboardId}&offset=${offset}`;

    const data = await this.request<{ scores: LeaderboardScore[] }>(endpoint, {
      method: 'GET',
    });

    return data.scores || [];
  }

  // #endregion

  // #region Pins and Gyms

  /**
   * Get pins (for gyms)
   * @returns List of pins
   */
  async getPins(): Promise<GymPin[]> {
    const data = await this.request<{ gyms: GymPin[] }>('/pins?gyms=1', {
      method: 'GET',
    });

    return data.gyms || [];
  }

  // #endregion

  // #region User Management and Profiles

  /**
   * Get user profile
   * @param userId - User ID
   * @returns User profile data
   */
  async getUserProfile(userId: number): Promise<UserProfile> {
    if (!this.token) {
      throw new Error('Authentication required. Call signIn() first.');
    }

    const response = await this.request<{ user: UserProfile }>(`/users/${userId}`, {
      method: 'GET',
    });

    return response.user;
  }

  /**
   * Update user profile
   * @param profileDetails - Profile details to update
   * @returns Promise that resolves on success
   */
  async saveProfile(profileDetails: ProfileDetails): Promise<void> {
    if (!this.token) {
      throw new Error('Authentication required. Call signIn() first.');
    }

    // This endpoint uses multipart/form-data - we need to build a FormData object
    const formData = new FormData();

    // Add basic profile fields
    formData.append('id', profileDetails.id.toString());
    formData.append('name', profileDetails.name);
    formData.append('email_address', profileDetails.emailAddress);

    // Add Instagram username if provided
    if (profileDetails.instagramUsername && profileDetails.instagramUsername.trim() !== '') {
      formData.append('instagram_username', profileDetails.instagramUsername);
    }

    // Add public setting
    formData.append('is_public', profileDetails.isPublic ? 'true' : 'false');

    // Handle avatar actions
    if (profileDetails.avatarAction) {
      if (profileDetails.avatarAction.type === 'clear') {
        formData.append('avatar', 'null');
      } else if (profileDetails.avatarAction.type === 'upload' && profileDetails.avatarAction.data) {
        formData.append('avatar', profileDetails.avatarAction.data, 'avatar.jpg');
      }
    }

    // Handle gym details if provided
    if (profileDetails.gymDetails) {
      formData.append('_update_gym', 'true');

      // Add all gym fields with gym_ prefix
      Object.entries(profileDetails.gymDetails).forEach(([key, value]) => {
        formData.append(`gym_${key}`, value.toString());
      });
    }

    await this.request('/user_profiles/save', {
      method: 'POST',
      headers: {
        // FormData sets its own Content-Type header with boundary
        Accept: 'application/json',
      },
      body: formData,
    });
  }

  /**
   * Delete user account
   * @param userId - User ID to delete
   * @param password - User's password for confirmation
   * @returns Promise that resolves on success
   * @throws Error with validation errors or failure message
   */
  async deleteUser(userId: number, password: string): Promise<void> {
    if (!this.token) {
      throw new Error('Authentication required. Call signIn() first.');
    }

    const formData = this.encodeFormData({
      user_id: userId,
      password: password,
    });

    try {
      await this.request('/users/delete', {
        method: 'POST',
        body: formData,
      });
      // If we get here, it was successful
      return;
    } catch (error) {
      // Check if this is a validation error (422)
      if (typeof error === 'object' && error !== null && 'message' in error) {
        try {
          const errorObj = JSON.parse((error as Error).message);
          if (errorObj.status === 422 && errorObj.data) {
            // Transform the error data into a DeleteUserValidationErrors object
            const validationErrors: DeleteUserValidationErrors = {};

            // Extract validation errors from the response
            if (errorObj.data.errors?.password) {
              validationErrors.password = Array.isArray(errorObj.data.errors.password)
                ? errorObj.data.errors.password
                : [errorObj.data.errors.password];
            }

            throw new Error(JSON.stringify(validationErrors));
          }
        } catch (e) {
          // If parsing fails, just throw the original error
        }
      }
      throw error;
    }
  }

  /**
   * Get the followers or following for a user
   * @param userId - User ID to get followers/following for
   * @param type - Type of relationship ('followers' or 'following')
   * @returns List of profiles
   */
  async getUserFollows(userId: number, type: 'followers' | 'following'): Promise<UserProfile[]> {
    if (!this.token) {
      throw new Error('Authentication required. Call signIn() first.');
    }

    const data = await this.request<{ users: UserProfile[] }>(`/users/${userId}/${type}`, {
      method: 'GET',
    });

    return data.users || [];
  }

  // #endregion

  // #region Social Features

  /**
   * Get user's followers
   * @param userId - User ID
   * @returns List of followers
   */
  async getFollowers(userId: number): Promise<UserProfile[]> {
    if (!this.token) {
      throw new Error('Authentication required. Call signIn() first.');
    }

    return this.getUserFollows(userId, 'followers');
  }

  /**
   * Get users being followed by a user
   * @param userId - User ID
   * @returns List of followees
   */
  async getFollowing(userId: number): Promise<UserProfile[]> {
    if (!this.token) {
      throw new Error('Authentication required. Call signIn() first.');
    }

    return this.getUserFollows(userId, 'following');
  }

  /**
   * Save or update a follow relationship
   * @param followeeId - ID of user being followed
   * @param followerId - ID of user who is following
   * @param state - Follow state
   * @returns Follow data
   */
  async saveFollow(followeeId: number, followerId: number, state: FollowState): Promise<Follow> {
    if (!this.token) {
      throw new Error('Authentication required. Call signIn() first.');
    }

    const formData = this.encodeFormData({
      followee_id: followeeId,
      follower_id: followerId,
      state: state,
    });

    const data = await this.request<{ follows: Follow[] }>('/follows/save', {
      method: 'POST',
      body: formData,
    });

    if (data.follows && data.follows.length > 0) {
      return data.follows[0];
    } else {
      throw new Error('Could not parse response body');
    }
  }

  // #endregion

  // #region Climbs Management

  /**
   * Save a climb
   * @param climbDetails - Climb details to save
   * @returns Created/updated climb data
   */
  async saveClimb(climbDetails: ClimbDetails): Promise<ClimbSummary> {
    if (!this.token) {
      throw new Error('Authentication required. Call signIn() first.');
    }

    // Build the form data
    const formData: Record<string, string | number | boolean | null | undefined> = {
      uuid: climbDetails.uuid,
      layout_id: climbDetails.layoutId,
      setter_id: climbDetails.setterId,
      name: climbDetails.name,
      description: climbDetails.description,
      is_draft: climbDetails.isDraft ? '1' : '0',
      frames_count: climbDetails.framesCount,
      frames_pace: climbDetails.framesPace,
      frames: '', // In real implementation, this would be compressed frames data
    };

    if (climbDetails.angle !== null && climbDetails.angle !== undefined) {
      formData.angle = climbDetails.angle;
    }

    const encodedData = this.encodeFormData(formData);

    const response = await this.request<{ climbs: ClimbSummary[] }>('/climbs/save', {
      method: 'POST',
      body: encodedData,
    });

    if (response.climbs && response.climbs.length > 0) {
      return response.climbs[0];
    } else {
      throw new Error('Could not parse climbs data in response');
    }
  }

  /**
   * Delete a climb
   * @param climbUUID - UUID of the climb to delete
   * @returns Response data
   */
  async deleteClimb(climbUUID: string): Promise<void> {
    if (!this.token) {
      throw new Error('Authentication required. Call signIn() first.');
    }

    const formData = this.encodeFormData({
      uuid: climbUUID,
    });

    await this.request<void>('/climbs/delete', {
      method: 'POST',
      body: formData,
    });
  }

  /**
   * Report a climb
   * @param climbReport - Climb report details
   */
  async reportClimb(climbReport: ClimbReport): Promise<void> {
    if (!this.token) {
      throw new Error('Authentication required. Call signIn() first.');
    }

    const formData = this.encodeFormData({
      user_id: climbReport.userID,
      climb_uuid: climbReport.climbUUID,
      message: climbReport.message,
    });

    await this.request('/climb_reports', {
      method: 'POST',
      body: formData,
    });
  }

  // #endregion

  // #region Ascents Management

  /**
   * Save an ascent
   * @param ascentDetails - Ascent details to save
   * @returns Response data
   */
  async saveAscent(ascentDetails: AscentDetails): Promise<SaveAscentResponse> {
    if (!this.token) {
      throw new Error('Authentication required. Call signIn() first.');
    }

    const formData = this.encodeFormData({
      uuid: ascentDetails.uuid,
      user_id: ascentDetails.userID,
      climb_uuid: ascentDetails.climbUUID,
      angle: ascentDetails.angle,
      is_mirror: ascentDetails.isMirror,
      bid_count: ascentDetails.bidCount,
      quality: ascentDetails.quality,
      difficulty: ascentDetails.difficulty,
      is_benchmark: ascentDetails.isBenchmark,
      comment: ascentDetails.comment,
      climbed_at: ascentDetails.climbedAt,
    });

    return await this.request<SaveAscentResponse>('/ascents/save', {
      method: 'POST',
      body: formData,
    });
  }

  /**
   * Delete an ascent
   * @param ascentUUID - UUID of the ascent to delete
   * @returns Response data
   */
  async deleteAscent(ascentUUID: string): Promise<void> {
    if (!this.token) {
      throw new Error('Authentication required. Call signIn() first.');
    }

    const formData = this.encodeFormData({
      uuid: ascentUUID,
    });

    await this.request<void>('/ascents/delete', {
      method: 'POST',
      body: formData,
    });
  }

  /**
   * Get a user's logbook (ascents), primarily used for getting the ascents
   * of people the current user followed. The ascents of the current user should
   * be synced to the db using the user sync.
   *
   * @param userId - User ID
   * @param types - Types of ascents to include
   * @returns List of logbook items
   */
  async getLogbook(userId: number, ascents: boolean = true, attempts: boolean = true): Promise<AscentDetails[]> {
    const types = [];
    if (ascents) {
      types.push('ascents');
    }
    if (attempts) {
      types.push('bids');
    }

    if (!this.token) {
      throw new Error('Authentication required. Call signIn() first.');
    }

    const endpoint = `/users/${userId}/logbook?types=${types.join(',')}`;

    const data = await this.request<{ logbook: AscentDetails[] }>(endpoint, {
      method: 'GET',
    });

    return data.logbook || [];
  }

  // #endregion

  // #region Bids Management

  /**
   * Save a bid
   * @param bidDetails - Bid details to save
   * @returns Response data
   */
  async saveBid(bidDetails: BidDetails): Promise<void> {
    if (!this.token) {
      throw new Error('Authentication required. Call signIn() first.');
    }

    const formData = this.encodeFormData({
      uuid: bidDetails.uuid,
      user_id: bidDetails.userID,
      climb_uuid: bidDetails.climbUUID,
      angle: bidDetails.angle,
      is_mirror: bidDetails.isMirror,
      bid_count: bidDetails.bidCount,
      comment: bidDetails.comment,
      climbed_at: bidDetails.climbedAt,
    });

    await this.request<void>('/bids/save', {
      method: 'POST',
      body: formData,
    });
  }

  /**
   * Delete a bid
   * @param bidUUID - UUID of the bid to delete
   * @returns Response data
   */
  async deleteBid(bidUUID: string): Promise<void> {
    if (!this.token) {
      throw new Error('Authentication required. Call signIn() first.');
    }

    const formData = this.encodeFormData({
      uuid: bidUUID,
    });

    await this.request<void>('/bids/delete', {
      method: 'POST',
      body: formData,
    });
  }

  // #endregion

  // #region Walls Management

  /**
   * Save a wall
   * @param wallDetails - Wall details to save
   * @returns Response data
   */
  async saveWall(wallDetails: WallDetails): Promise<void> {
    if (!this.token) {
      throw new Error('Authentication required. Call signIn() first.');
    }

    // Build the form data
    let formData = this.encodeFormData({
      uuid: wallDetails.uuid,
      user_id: wallDetails.userId,
      name: wallDetails.name,
      is_adjustable: wallDetails.isAdjustable,
      angle: wallDetails.angle,
      layout_id: wallDetails.layoutId,
      product_size_id: wallDetails.productSizeId,
    });

    // Add serial number if provided
    if (wallDetails.serialNumber && wallDetails.serialNumber.trim() !== '') {
      formData +=
        '&' +
        this.encodeFormData({
          serial_number: wallDetails.serialNumber.trim(),
        });
    }

    // Add hold set IDs
    wallDetails.holdSetIds.forEach((setId) => {
      formData += `&set_ids[]=${encodeURIComponent(setId)}`;
    });

    await this.request<void>('/walls/save', {
      method: 'POST',
      body: formData,
    });
  }

  /**
   * Delete a wall
   * @param wallUUID - UUID of the wall to delete
   * @returns Response data
   */
  async deleteWall(wallUUID: string): Promise<void> {
    if (!this.token) {
      throw new Error('Authentication required. Call signIn() first.');
    }

    const formData = this.encodeFormData({
      uuid: wallUUID,
    });

    await this.request<void>('/walls/delete', {
      method: 'POST',
      body: formData,
    });
  }

  // #endregion

  // #region Circuits Management

  /**
   * Save a circuit
   * @param circuitDetails - Circuit details to save
   * @returns Response data
   */
  async saveCircuit(circuitDetails: CircuitDetails): Promise<void> {
    if (!this.token) {
      throw new Error('Authentication required. Call signIn() first.');
    }

    const formData = this.encodeFormData({
      uuid: circuitDetails.uuid,
      user_id: circuitDetails.userID,
      name: circuitDetails.name,
      description: circuitDetails.description,
      color: circuitDetails.color,
      is_public: circuitDetails.isPublic,
    });

    await this.request<void>('/circuits/save', {
      method: 'POST',
      body: formData,
    });
  }

  /**
   * Delete a circuit
   * @param circuitUUID - UUID of the circuit to delete
   * @returns Response data
   */
  async deleteCircuit(circuitUUID: string): Promise<void> {
    if (!this.token) {
      throw new Error('Authentication required. Call signIn() first.');
    }

    const formData = this.encodeFormData({
      uuid: circuitUUID,
    });

    await this.request<void>('/circuits/delete', {
      method: 'POST',
      body: formData,
    });
  }

  /**
   * Save climbs to a circuit
   * @param circuitUUID - UUID of the circuit
   * @param climbUUIDs - List of climb UUIDs to add to the circuit
   * @returns Response data
   */
  async saveCircuitClimbs(circuitUUID: string, climbUUIDs: string[]): Promise<void> {
    if (!this.token) {
      throw new Error('Authentication required. Call signIn() first.');
    }

    // Build form data with array parameters
    let formData = `circuit_uuid=${encodeURIComponent(circuitUUID)}`;
    climbUUIDs.forEach((uuid) => {
      formData += `&climb_uuids[]=${encodeURIComponent(uuid)}`;
    });

    await this.request<void>('/circuit_climbs/save', {
      method: 'POST',
      body: formData,
    });
  }

  /**
   * Save circuits to a climb
   * @param climbUUID - UUID of the climb
   * @param circuitUUIDs - Set of circuit UUIDs to add the climb to
   * @returns Response data
   */
  async saveClimbCircuits(climbUUID: string, circuitUUIDs: Set<string>): Promise<void> {
    if (!this.token) {
      throw new Error('Authentication required. Call signIn() first.');
    }

    // Build form data with array parameters
    let formData = `climb_uuid=${encodeURIComponent(climbUUID)}`;
    circuitUUIDs.forEach((uuid) => {
      formData += `&circuit_uuids[]=${encodeURIComponent(uuid)}`;
    });

    await this.request<void>('/climb_circuits/save', {
      method: 'POST',
      body: formData,
    });
  }

  // #endregion
}

export default AuroraClimbingClient;
