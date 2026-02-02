#!/usr/bin/env node
/**
 * OpenAPI Specification Generator Script
 *
 * Run this script to generate the OpenAPI specification file.
 * This is typically run as part of the build process or CI pipeline.
 *
 * Usage:
 *   npx tsx scripts/generate-openapi.ts
 *
 * Output:
 *   public/openapi.json
 */

import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

// Import the generator
import { generateOpenApiDocument } from '../app/lib/api-docs/generate-openapi';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputPath = join(__dirname, '../public/openapi.json');

console.log('Generating OpenAPI specification...');

const spec = generateOpenApiDocument();

// Ensure public directory exists
mkdirSync(dirname(outputPath), { recursive: true });

// Write the spec to file
writeFileSync(outputPath, JSON.stringify(spec, null, 2));

console.log(`OpenAPI specification written to: ${outputPath}`);
