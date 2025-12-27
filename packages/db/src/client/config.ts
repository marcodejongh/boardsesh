import { neonConfig } from '@neondatabase/serverless';

export interface ConnectionConfig {
  connectionString: string;
  isLocal: boolean;
  isTest: boolean;
}

export function isLocalDevelopment(): boolean {
  return process.env.VERCEL_ENV === 'development' ||
         process.env.NODE_ENV === 'development';
}

export function isTestEnvironment(): boolean {
  return process.env.NODE_ENV === 'test' ||
         process.env.VITEST === 'true';
}

export function getConnectionConfig(): ConnectionConfig {
  let connectionString = process.env.DATABASE_URL;
  const isLocal = isLocalDevelopment();
  const isTest = isTestEnvironment();

  if (isLocal && !isTest) {
    connectionString = 'postgres://postgres:password@db.localtest.me:5432/main';
  }
  // In test mode, use DATABASE_URL as-is (set by test setup)

  return { connectionString: connectionString!, isLocal, isTest };
}

export function configureNeonForEnvironment(): void {
  const { isLocal, connectionString } = getConnectionConfig();

  if (isLocal) {
    neonConfig.fetchEndpoint = (host) => {
      const [protocol, port] = host === 'db.localtest.me' ? ['http', 4444] : ['https', 443];
      return `${protocol}://${host}:${port}/sql`;
    };
    const connectionStringUrl = new URL(connectionString);
    neonConfig.useSecureWebSocket = connectionStringUrl.hostname !== 'db.localtest.me';
    neonConfig.wsProxy = (host) => (host === 'db.localtest.me' ? `${host}:4444/v2` : `${host}/v2`);
  }
}
