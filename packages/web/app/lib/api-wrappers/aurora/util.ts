import { v4 as uuidv4 } from 'uuid';
import { promisify } from 'util';
import { unzip } from 'zlib';

const unzipAsync = promisify(unzip);

export function generateUuid(): string {
  return uuidv4().replace(/-/g, '').toUpperCase();
}

/**
 * Throws if the response is not ok, including the status code in the error message.
 * Use for Aurora API responses where a simple error throw is sufficient.
 * Accepts both native fetch Response and undici Response.
 */
export function handleAuroraApiResponse(response: { ok: boolean; status: number }, context?: string): void {
  if (!response.ok) {
    const prefix = context ? `${context}: ` : '';
    throw new Error(`${prefix}HTTP error! status: ${response.status}`);
  }
}

export async function auroraGetApi<T>(url: string, token: string): Promise<T> {
  // Default headers
  const headers: Record<string, string> = {
    Accept: '*/*', // Accept any content type
    'Accept-Encoding': 'gzip, deflate, br',
    Host: 'kilterboardapp.com', // Explicitly set the host
    'User-Agent': 'Kilter Board/300 CFNetwork/1568.200.51 Darwin/24.1.0', // Simulate the specific user-agent
    'Accept-Language': 'en-AU,en;q=0.9', // Accept preferred languages
  };

  // Add Authorization header if token is provided
  if (token) {
    headers['Cookie'] = `token=${token}`;
  }

  const fetchOptions: RequestInit = {
    method: 'GET',
    headers,
  };

  const response = await fetch(url, fetchOptions);
  handleAuroraApiResponse(response);

  // Handle compressed responses
  const contentEncoding = response.headers.get('content-encoding');
  if (contentEncoding === 'gzip' || contentEncoding === 'br' || contentEncoding === 'deflate') {
    const buffer = Buffer.from(await response.arrayBuffer());
    const decompressed = await unzipAsync(buffer); // Decompress asynchronously
    return JSON.parse(decompressed.toString()) as T; // Parse JSON from decompressed data
  }

  // Handle plain JSON response
  return response.json() as Promise<T>;
}
