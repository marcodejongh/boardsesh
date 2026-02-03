#!/usr/bin/env node
/**
 * GraphQL to C++ Type Generator for ESP32 Firmware
 *
 * This script reads the GraphQL schema from packages/shared-schema and generates
 * C++ header files with ArduinoJson-compatible structs for the ESP32 firmware.
 *
 * Usage:
 *   node embedded/scripts/generate-graphql-types.mjs
 *
 * Or via npm script:
 *   npm run controller:codegen
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path configuration
const SCHEMA_PATH = path.join(__dirname, '../../packages/shared-schema/src/schema.ts');
const OUTPUT_DIR = path.join(__dirname, '../libs/graphql-types/src');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'graphql_types.h');

// Types that the firmware needs (controller-relevant subset)
const CONTROLLER_TYPES = [
  'LedCommand',
  'LedCommandInput',
  'LedUpdate',
  'ControllerPing',
  'ControllerEvent',
  'ClimbMatchResult',
  'DeviceLogEntry',
  'SendDeviceLogsInput',
  'SendDeviceLogsResponse',
];

// GraphQL to C++ type mapping
const TYPE_MAP = {
  'Int': 'int32_t',
  'Int!': 'int32_t',
  'Float': 'float',
  'Float!': 'float',
  'String': 'const char*',
  'String!': 'const char*',
  'Boolean': 'bool',
  'Boolean!': 'bool',
  'ID': 'const char*',
  'ID!': 'const char*',
};

// Field-specific type overrides for embedded optimization
// These override the default mappings for specific fields
const FIELD_TYPE_OVERRIDES = {
  'LedCommand.r': 'uint8_t',
  'LedCommand.g': 'uint8_t',
  'LedCommand.b': 'uint8_t',
  'LedCommandInput.r': 'uint8_t',
  'LedCommandInput.g': 'uint8_t',
  'LedCommandInput.b': 'uint8_t',
};

// Sentinel value for optional role field (use -1 to indicate "not set")
const ROLE_NOT_SET = -1;

/**
 * Parse GraphQL schema and extract types
 * @param {string} schemaContent
 * @returns {Map<string, object>}
 */
function parseGraphQLSchema(schemaContent) {
  const types = new Map();

  // Remove doc comments for easier parsing
  const cleanSchema = schemaContent.replace(/"""[\s\S]*?"""/g, '');

  // Parse type definitions
  const typeRegex = /(type|input)\s+(\w+)\s*\{([^}]+)\}/g;
  let match;

  while ((match = typeRegex.exec(cleanSchema)) !== null) {
    const kind = match[1];
    const name = match[2];
    const body = match[3];

    if (!CONTROLLER_TYPES.includes(name)) continue;

    const fields = [];
    const fieldRegex = /(\w+)\s*:\s*(\[?\w+!?\]?!?)/g;
    let fieldMatch;

    while ((fieldMatch = fieldRegex.exec(body)) !== null) {
      const fieldName = fieldMatch[1];
      let fieldType = fieldMatch[2];

      const isArray = fieldType.startsWith('[');
      const isNullable = !fieldType.endsWith('!');

      // Clean up type
      fieldType = fieldType.replace(/[\[\]!]/g, '');

      fields.push({
        name: fieldName,
        type: fieldType,
        isNullable,
        isArray,
      });
    }

    types.set(name, { name, kind, fields });
  }

  // Parse union types
  const unionRegex = /union\s+(\w+)\s*=\s*([^#\n]+)/g;
  while ((match = unionRegex.exec(cleanSchema)) !== null) {
    const name = match[1];
    const unionBody = match[2].trim();

    if (!CONTROLLER_TYPES.includes(name)) continue;

    const unionTypes = unionBody.split('|').map(t => t.trim());
    types.set(name, {
      name,
      kind: 'union',
      fields: [],
      unionTypes,
    });
  }

  return types;
}

/**
 * Convert GraphQL type to C++ type
 * @param {string} graphqlType
 * @param {boolean} isNullable
 * @param {boolean} isArray
 * @returns {string}
 */
function graphqlTypeToCpp(graphqlType, isNullable, isArray) {
  // Check if it's a known scalar type
  const key = isNullable ? graphqlType : `${graphqlType}!`;
  if (TYPE_MAP[key]) {
    return TYPE_MAP[key];
  }
  if (TYPE_MAP[graphqlType]) {
    return TYPE_MAP[graphqlType];
  }

  // For custom types, return struct name
  return graphqlType;
}

// Types that need include guards (defined elsewhere for native test compatibility)
const GUARDED_TYPES = ['LedCommand'];

/**
 * Generate C++ struct for a GraphQL type
 * @param {object} type
 * @returns {string}
 */
function generateCppStruct(type) {
  if (type.kind === 'union') {
    return `// Union type: ${type.name} = ${type.unionTypes?.join(' | ')}
// Use __typename field to determine actual type`;
  }

  const lines = [];
  const needsGuard = GUARDED_TYPES.includes(type.name);
  const guardName = `${type.name.toUpperCase()}_DEFINED`;

  if (needsGuard) {
    lines.push(`// Include guard: ${type.name} may also be defined in led_controller.h for native tests`);
    lines.push(`#ifndef ${guardName}`);
    lines.push(`#define ${guardName}`);
  }

  lines.push(`/**`);
  lines.push(` * ${type.kind === 'input' ? 'Input' : 'Output'} type: ${type.name}`);
  lines.push(` * Generated from GraphQL schema`);
  lines.push(` */`);
  lines.push(`struct ${type.name} {`);

  for (const field of type.fields) {
    // Check for field-specific type override
    const overrideKey = `${type.name}.${field.name}`;
    let cppType = FIELD_TYPE_OVERRIDES[overrideKey];

    if (!cppType) {
      cppType = graphqlTypeToCpp(field.type, field.isNullable, field.isArray);
    }

    if (field.isArray) {
      // For arrays, we need a pointer and count
      lines.push(`    ${cppType}* ${field.name};`);
      lines.push(`    size_t ${field.name}Count;`);
    } else {
      lines.push(`    ${cppType} ${field.name};`);
    }
  }

  lines.push(`};`);

  if (needsGuard) {
    lines.push(`#endif // ${guardName}`);
  }

  return lines.join('\n');
}

/**
 * Generate GraphQL operation strings
 * @returns {string}
 */
function generateOperations() {
  return `
// ============================================
// GraphQL Operations for ESP32 Controller
// ============================================

namespace GraphQLOps {

/**
 * Subscription: Controller Events
 * Receives LED updates and ping events from the backend
 */
constexpr const char* CONTROLLER_EVENTS_SUBSCRIPTION =
    "subscription ControllerEvents($sessionId: ID!) { "
    "controllerEvents(sessionId: $sessionId) { "
    "... on LedUpdate { __typename commands { position r g b } climbUuid climbName angle } "
    "... on ControllerPing { __typename timestamp } "
    "} }";

/**
 * Mutation: Set Climb From LED Positions
 * Sends LED positions from Bluetooth to match a climb
 */
constexpr const char* SET_CLIMB_FROM_LED_POSITIONS =
    "mutation SetClimbFromLeds($sessionId: ID!, $positions: [LedCommandInput!]!) { "
    "setClimbFromLedPositions(sessionId: $sessionId, positions: $positions) { "
    "matched climbUuid climbName } }";

/**
 * Mutation: Controller Heartbeat
 * Keep-alive ping to update lastSeenAt
 */
constexpr const char* CONTROLLER_HEARTBEAT =
    "mutation ControllerHeartbeat($sessionId: ID!) { "
    "controllerHeartbeat(sessionId: $sessionId) }";

/**
 * Mutation: Send Device Logs
 * Forward device logs to backend for Axiom ingestion
 */
constexpr const char* SEND_DEVICE_LOGS =
    "mutation SendDeviceLogs($input: SendDeviceLogsInput!) { "
    "sendDeviceLogs(input: $input) { success accepted } }";

} // namespace GraphQLOps
`;
}

/**
 * Generate the complete C++ header file
 * @param {Map<string, object>} types
 * @returns {string}
 */
function generateHeader(types) {
  let content = `/**
 * Auto-generated GraphQL Types for ESP32 Firmware
 *
 * Source: packages/shared-schema/src/schema.ts
 *
 * DO NOT EDIT MANUALLY - This file is generated by:
 *   npm run controller:codegen
 *
 * These types are compatible with ArduinoJson for JSON serialization.
 */

#ifndef GRAPHQL_TYPES_H
#define GRAPHQL_TYPES_H

#include <Arduino.h>
#include <stdint.h>
#include <stddef.h>

// ============================================
// GraphQL Type Constants
// ============================================

namespace GraphQLTypename {
    constexpr const char* LED_UPDATE = "LedUpdate";
    constexpr const char* CONTROLLER_PING = "ControllerPing";
}

// ============================================
// GraphQL Types for Controller
// ============================================

`;

  // Generate structs in dependency order
  const orderedTypes = [
    'LedCommand',
    'LedCommandInput',
    'LedUpdate',
    'ControllerPing',
    'ClimbMatchResult',
    'DeviceLogEntry',
    'SendDeviceLogsResponse',
  ];

  for (const typeName of orderedTypes) {
    const type = types.get(typeName);
    if (type) {
      content += generateCppStruct(type) + '\n\n';
    }
  }

  // Add union comment
  const controllerEvent = types.get('ControllerEvent');
  if (controllerEvent) {
    content += `// ${generateCppStruct(controllerEvent)}\n\n`;
  }

  // Add operations
  content += generateOperations();

  // Add helper functions for JSON parsing
  content += `
// ============================================
// Constants
// ============================================

/** Sentinel value indicating role field is not set */
constexpr int32_t ROLE_NOT_SET = ${ROLE_NOT_SET};

// ============================================
// JSON Parsing Helpers (ArduinoJson)
// ============================================
//
// IMPORTANT: String pointer lifetime
// ----------------------------------
// The climbUuid, climbName, and other const char* fields returned by parse
// functions point directly into the JsonDocument's memory. These pointers
// become invalid when the JsonDocument is destroyed or modified.
//
// If you need to keep string values beyond the JsonDocument's lifetime,
// copy them to your own buffers before the document goes out of scope.

#include <ArduinoJson.h>
#include <new>  // for std::nothrow

/**
 * Parse a LedCommand from a JsonObject
 */
inline bool parseLedCommand(JsonObject& obj, LedCommand& cmd) {
    if (!obj.containsKey("position")) return false;
    cmd.position = obj["position"];
    cmd.r = obj["r"] | 0;
    cmd.g = obj["g"] | 0;
    cmd.b = obj["b"] | 0;
    return true;
}

/**
 * Parse a LedUpdate from a JsonObject
 *
 * IMPORTANT: This allocates memory for the commands array.
 * You MUST call freeLedUpdate() when done to avoid memory leaks.
 *
 * String pointers (climbUuid, climbName) point into the JsonDocument
 * and become invalid when the document is destroyed.
 *
 * NOTE: angle defaults to 0 if not present. Since 0 is a valid angle,
 * callers cannot distinguish "no angle" from "angle=0". If this matters,
 * check obj.containsKey("angle") before calling.
 *
 * @return false if memory allocation fails, true otherwise
 */
inline bool parseLedUpdate(JsonObject& obj, LedUpdate& update) {
    JsonArray commands = obj["commands"];
    if (commands.isNull()) {
        update.commands = nullptr;
        update.commandsCount = 0;
    } else {
        update.commandsCount = commands.size();
        update.commands = new (std::nothrow) LedCommand[update.commandsCount];
        if (update.commands == nullptr) {
            update.commandsCount = 0;
            return false;  // Allocation failed
        }
        size_t i = 0;
        for (JsonObject cmd : commands) {
            parseLedCommand(cmd, update.commands[i++]);
        }
    }
    update.climbUuid = obj["climbUuid"] | nullptr;
    update.climbName = obj["climbName"] | nullptr;
    update.angle = obj["angle"] | 0;
    return true;
}

/**
 * Free memory allocated by parseLedUpdate()
 * Safe to call even if commands is nullptr
 */
inline void freeLedUpdate(LedUpdate& update) {
    if (update.commands != nullptr) {
        delete[] update.commands;
        update.commands = nullptr;
        update.commandsCount = 0;
    }
}

/**
 * Parse a ClimbMatchResult from a JsonObject
 *
 * String pointers (climbUuid, climbName) point into the JsonDocument
 * and become invalid when the document is destroyed.
 */
inline bool parseClimbMatchResult(JsonObject& obj, ClimbMatchResult& result) {
    result.matched = obj["matched"] | false;
    result.climbUuid = obj["climbUuid"] | nullptr;
    result.climbName = obj["climbName"] | nullptr;
    return true;
}

/**
 * Serialize a LedCommandInput to a JsonObject
 * Set cmd.role to ROLE_NOT_SET (-1) to omit the role field
 */
inline void serializeLedCommandInput(JsonObject& obj, const LedCommandInput& cmd) {
    obj["position"] = cmd.position;
    obj["r"] = cmd.r;
    obj["g"] = cmd.g;
    obj["b"] = cmd.b;
    if (cmd.role != ROLE_NOT_SET) {
        obj["role"] = cmd.role;
    }
}

/**
 * Serialize a DeviceLogEntry to a JsonObject
 */
inline void serializeDeviceLogEntry(JsonObject& obj, const DeviceLogEntry& entry) {
    obj["ts"] = entry.ts;
    obj["level"] = entry.level;
    obj["component"] = entry.component;
    obj["message"] = entry.message;
    if (entry.metadata) {
        obj["metadata"] = entry.metadata;
    }
}

#endif // GRAPHQL_TYPES_H
`;

  return content;
}

async function main() {
  console.log('GraphQL to C++ Type Generator');
  console.log('==============================\n');

  // Read schema
  console.log(`Reading schema from: ${SCHEMA_PATH}`);
  if (!fs.existsSync(SCHEMA_PATH)) {
    console.error(`Error: Schema file not found at ${SCHEMA_PATH}`);
    process.exit(1);
  }

  const schemaContent = fs.readFileSync(SCHEMA_PATH, 'utf-8');

  // Parse schema
  console.log('Parsing GraphQL schema...');
  const types = parseGraphQLSchema(schemaContent);
  console.log(`Found ${types.size} controller-relevant types`);

  for (const [name, type] of types) {
    console.log(`  - ${name} (${type.kind}, ${type.fields.length} fields)`);
  }

  // Generate header
  console.log('\nGenerating C++ header...');
  const header = generateHeader(types);

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Write output
  fs.writeFileSync(OUTPUT_FILE, header);
  console.log(`Written to: ${OUTPUT_FILE}`);

  // Show stats
  const lineCount = header.split('\n').length;
  console.log(`\nGenerated ${lineCount} lines of C++ code`);
  console.log('\nDone!');
}

main().catch(console.error);
