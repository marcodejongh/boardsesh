import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { BatchSpanProcessor, ParentBasedSampler, AlwaysOnSampler } from '@opentelemetry/sdk-trace-base';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { IORedisInstrumentation } from '@opentelemetry/instrumentation-ioredis';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const TAILSCALE_STATUS_TIMEOUT_MS = 1500;
const DEFAULT_OTLP_PORT = 4318;

function normalizeHostname(hostname: string): string | null {
  const trimmed = hostname.trim().replace(/\.$/, '');
  if (!trimmed) return null;
  if (trimmed.includes('://') || trimmed.includes('/') || trimmed.includes(':')) return null;
  if (!/^[a-zA-Z0-9.-]+$/.test(trimmed)) return null;
  return trimmed.toLowerCase();
}

function resolveTailscaleHostname(): string | null {
  const envHostname = process.env.TAILSCALE_HOSTNAME;
  if (envHostname !== undefined) {
    return normalizeHostname(envHostname);
  }

  try {
    const statusJson = execFileSync('tailscale', ['status', '--json'], {
      encoding: 'utf8',
      timeout: TAILSCALE_STATUS_TIMEOUT_MS,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const parsed = JSON.parse(statusJson) as { Self?: { DNSName?: string } };
    const dnsName = parsed.Self?.DNSName;
    if (!dnsName) return null;
    return normalizeHostname(dnsName);
  } catch {
    return null;
  }
}

function defaultOtlpEndpoint(): string {
  const tailscaleHost = resolveTailscaleHostname();
  const host = tailscaleHost ?? 'localhost';
  return `http://${host}:${DEFAULT_OTLP_PORT}`;
}

function loadPackageVersion(): string | undefined {
  try {
    const require = createRequire(import.meta.url);
    const pkg = require('../../package.json') as { version?: string };
    return pkg.version;
  } catch {
    try {
      const raw = readFileSync(new URL('../../package.json', import.meta.url), 'utf8');
      const parsed = JSON.parse(raw) as { version?: string };
      return parsed.version;
    } catch {
      return undefined;
    }
  }
}

function shouldDisable(): boolean {
  if (process.env.NODE_ENV === 'test') return true;
  if ((process.env.OTEL_ENABLED ?? 'true') === 'false') return true;
  return false;
}

export function setupTracing(): void {
  if (shouldDisable()) return;

  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.ERROR);

  // Fill in a default OTLP endpoint if not provided.
  if (!process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = defaultOtlpEndpoint();
  }

  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT!;
  const url = endpoint.endsWith('/v1/traces') ? endpoint : `${endpoint}/v1/traces`;

  const resource = new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'boardsesh-backend',
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
    [SemanticResourceAttributes.SERVICE_VERSION]: loadPackageVersion(),
  });

  const provider = new NodeTracerProvider({
    resource,
    sampler: new ParentBasedSampler({ root: new AlwaysOnSampler() }),
  });

  provider.addSpanProcessor(new BatchSpanProcessor(new OTLPTraceExporter({ url })));
  provider.register();

  registerInstrumentations({
    instrumentations: [new IORedisInstrumentation()],
  });
}
