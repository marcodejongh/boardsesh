import { HOST_BASES, AuroraBoardName, LoginResponse, Session, ClientOptions } from './types.js';

/**
 * Aurora Climbing API Client
 */
export class AuroraClimbingClient {
  private baseURL: string;
  private token: string | null;
  private session: Session | null;
  private apiVersion: string;

  constructor({ boardName, token = null, apiVersion = 'v1' }: ClientOptions) {
    this.token = token;
    this.session = null;
    this.apiVersion = apiVersion;
    this.baseURL = `${HOST_BASES[boardName]}.com`;
  }

  setSession(session: Session): void {
    this.session = session;
    this.token = session.token;
  }

  getUserId(): number | null {
    return this.session?.user_id || null;
  }

  private createHeaders(contentType?: string): HeadersInit {
    const headers: HeadersInit = {
      Accept: 'application/json',
      'Content-Type': contentType || 'application/x-www-form-urlencoded',
      Connection: 'keep-alive',
      'Accept-Language': 'en-AU,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'User-Agent': 'Kilter Board/202 CFNetwork/1568.100.1 Darwin/24.0.0',
    };

    if (this.token) {
      headers['Cookie'] = `token=${this.token}`;
    }

    return headers;
  }

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
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });

      console.log(`Response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const responseClone = response.clone();
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          try {
            errorData = await responseClone.text();
          } catch {
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

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`Request timeout: ${url} took longer than 30 seconds`);
        }
        if (error.message.includes('fetch')) {
          throw new Error(
            `Network error: Unable to connect to ${url}. Check internet connection and Aurora API status.`,
          );
        }
        if (error.message.includes('Failed to fetch')) {
          throw new Error(`DNS/Connection error: Cannot resolve ${url}. Aurora servers may be unavailable.`);
        }
      }

      throw error;
    }
  }

  async signIn(username: string, password: string): Promise<LoginResponse> {
    try {
      const data = await this.request<LoginResponse>(
        '/sessions',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username,
            password,
            tou: 'accepted',
            pp: 'accepted',
            ua: 'app',
          }),
        },
        { apiUrl: false },
      );

      if (data.session) {
        this.setSession({ token: data.session.token, user_id: data.session.user_id });

        return {
          token: data.session.token,
          user_id: data.session.user_id,
          username: username,
          error: '',
          login: {
            created_at: new Date().toISOString(),
            token: data.session.token,
            user_id: data.session.user_id,
          },
          user: {
            id: data.session.user_id,
            username: username,
            email_address: '',
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
          },
        };
      } else if (data.token && data.user_id) {
        this.setSession({ token: data.token, user_id: data.user_id });
        return data;
      }
      throw new Error('Login failed: Invalid response format');
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'message' in error) {
        try {
          const errorObj = JSON.parse((error as Error).message);
          if (errorObj.status === 422) {
            throw new Error('Invalid username or password');
          } else if (errorObj.status === 429) {
            throw new Error('Too many login attempts. Please try again later.');
          }
        } catch {
          // If parsing fails, just throw the original error
        }
      }
      throw error;
    }
  }
}

export default AuroraClimbingClient;
