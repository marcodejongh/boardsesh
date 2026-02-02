/**
 * Axiom Log Forwarding Service
 *
 * Forwards device logs from ESP32 controllers to Axiom for aggregation.
 * Only active in production environment.
 */

export interface DeviceLog {
  _time: string;
  controller_id: string;
  level: string;
  component: string;
  message: string;
  [key: string]: unknown; // Additional metadata
}

const AXIOM_INGEST_URL = 'https://api.axiom.co/v1/datasets';

/**
 * Check if Axiom logging is configured and enabled
 */
export function isAxiomConfigured(): boolean {
  // Only enable in production
  if (process.env.NODE_ENV !== 'production') {
    return false;
  }

  return !!(process.env.AXIOM_TOKEN && process.env.AXIOM_DATASET);
}

/**
 * Forward logs to Axiom ingest API
 *
 * @param logs - Array of log entries to forward
 * @returns true if successful, false on failure (fire-and-forget)
 */
export async function forwardLogs(logs: DeviceLog[]): Promise<boolean> {
  if (!isAxiomConfigured()) {
    // In development, just log that we would have sent logs
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Axiom] Would forward ${logs.length} logs (disabled in development)`);
    }
    return true;
  }

  const token = process.env.AXIOM_TOKEN;
  const dataset = process.env.AXIOM_DATASET;

  if (!token || !dataset) {
    console.error('[Axiom] Missing AXIOM_TOKEN or AXIOM_DATASET');
    return false;
  }

  try {
    const response = await fetch(`${AXIOM_INGEST_URL}/${dataset}/ingest`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(logs),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Axiom] Ingest failed: ${response.status} ${errorText}`);
      return false;
    }

    console.log(`[Axiom] Successfully forwarded ${logs.length} logs`);
    return true;
  } catch (error) {
    // Fire-and-forget: log error but don't throw
    console.error('[Axiom] Ingest error:', error);
    return false;
  }
}
