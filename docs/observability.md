# Observability (tracing)

## Local setup
- Start the built-in stack: `docker-compose up -d jaeger redis postgres` (Jaeger UI on http://localhost:16686).
- The OTLP HTTP receiver is exposed on port `4318` (also reachable via your Tailscale DNS name).
- When running `npm run dev` in `@boardsesh/web`, the dev script resolves your Tailscale hostname and sets `NEXT_PUBLIC_OTEL_EXPORTER_OTLP_ENDPOINT` (falls back to localhost). The backend tracing bootstrap sets `OTEL_EXPORTER_OTLP_ENDPOINT` similarly unless you override it.

## Environment toggles
- Disable tracing entirely: `OTEL_ENABLED=false` (backend) or `NEXT_PUBLIC_OTEL_ENABLED=false` (web).
- Override collector: set `OTEL_EXPORTER_OTLP_ENDPOINT` / `NEXT_PUBLIC_OTEL_EXPORTER_OTLP_ENDPOINT` to `http(s)://host:port[/v1/traces]`.
- Override Tailscale host: `TAILSCALE_HOSTNAME=<dns-name>`.

## What is traced
- WebSocket connection lifecycle and GraphQL-over-WS operations.
- Queue/session mutations and pub/sub fanout (trace metadata is attached to events for replay and cross-instance delivery).
- Browser spans are exported directly to the OTLP HTTP endpoint (CORS-friendly collector/Jaeger required).
