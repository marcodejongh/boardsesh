/**
 * OpenAPI Specification Endpoint
 *
 * Returns the OpenAPI 3.0 specification for the Boardsesh REST API.
 * This endpoint is used by Swagger UI and can be used for:
 * - Interactive API documentation
 * - Client SDK generation
 * - API validation tools
 *
 * The spec is generated from Zod schemas, ensuring documentation
 * stays in sync with actual validation.
 */

import { NextResponse } from 'next/server';
import { generateOpenApiDocument } from '@/app/lib/api-docs';

// Cache the generated document to avoid regenerating on every request
let cachedDocument: ReturnType<typeof generateOpenApiDocument> | null = null;

export async function GET() {
  if (!cachedDocument) {
    cachedDocument = generateOpenApiDocument();
  }

  return NextResponse.json(cachedDocument, {
    headers: {
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      'Access-Control-Allow-Origin': '*', // Allow CORS for external tools
    },
  });
}
