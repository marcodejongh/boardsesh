'use client';

import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { BatchSpanProcessor, ParentBasedSampler, AlwaysOnSampler } from '@opentelemetry/sdk-trace-base';
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

declare global {
  interface Window {
    __OTEL_WEB_INITIALIZED__?: boolean;
  }
}

export function initWebTracing(): void {
  if (typeof window === 'undefined') return;
  if (window.__OTEL_WEB_INITIALIZED__) return;
  if ((process.env.NEXT_PUBLIC_OTEL_ENABLED ?? 'true') === 'false') return;

  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.ERROR);

  const endpoint =
    process.env.NEXT_PUBLIC_OTEL_EXPORTER_OTLP_ENDPOINT ||
    'http://localhost:4318/v1/traces';

  const provider = new WebTracerProvider({
    sampler: new ParentBasedSampler({ root: new AlwaysOnSampler() }),
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: 'boardsesh-web',
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV ?? 'development',
    }),
  });

  provider.addSpanProcessor(
    new BatchSpanProcessor(
      new OTLPTraceExporter({
        url: endpoint.endsWith('/v1/traces') ? endpoint : `${endpoint}/v1/traces`,
      })
    )
  );

  provider.register({
    contextManager: new ZoneContextManager(),
  });

  window.__OTEL_WEB_INITIALIZED__ = true;
}
