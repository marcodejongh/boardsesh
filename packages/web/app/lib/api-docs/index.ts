/**
 * API Documentation Module
 *
 * This module provides OpenAPI specification generation for the Boardsesh REST API.
 *
 * Usage:
 * - Import generateOpenApiDocument() to get the full OpenAPI spec
 * - Schemas are defined in openapi-registry.ts
 * - Routes are registered in openapi-routes.ts
 *
 * Adding new endpoints:
 * 1. If the endpoint has new request/response types, add schemas to openapi-registry.ts
 * 2. Register the endpoint in openapi-routes.ts using registry.registerPath()
 */

export { generateOpenApiDocument } from './generate-openapi';
export { registry } from './openapi-registry';
export * from './openapi-registry';
