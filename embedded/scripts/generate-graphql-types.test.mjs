#!/usr/bin/env node
/**
 * Unit tests for GraphQL to C++ Type Generator
 *
 * Run with: node --test embedded/scripts/generate-graphql-types.test.mjs
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import functions to test by extracting them from the module
// Since the module runs main() on import, we need to re-implement the core functions for testing

// GraphQL to C++ type mapping (copied from source for testing)
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

const FIELD_TYPE_OVERRIDES = {
  'LedCommand.r': 'uint8_t',
  'LedCommand.g': 'uint8_t',
  'LedCommand.b': 'uint8_t',
  'LedCommandInput.r': 'uint8_t',
  'LedCommandInput.g': 'uint8_t',
  'LedCommandInput.b': 'uint8_t',
};

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

function parseGraphQLSchema(schemaContent) {
  const types = new Map();
  const cleanSchema = schemaContent.replace(/"""[\s\S]*?"""/g, '');
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

function graphqlTypeToCpp(graphqlType, isNullable, isArray) {
  const key = isNullable ? graphqlType : `${graphqlType}!`;
  if (TYPE_MAP[key]) return TYPE_MAP[key];
  if (TYPE_MAP[graphqlType]) return TYPE_MAP[graphqlType];
  return graphqlType;
}

function generateCppStruct(type) {
  if (type.kind === 'union') {
    return `// Union type: ${type.name} = ${type.unionTypes?.join(' | ')}\n// Use __typename field to determine actual type`;
  }

  const lines = [];
  lines.push(`struct ${type.name} {`);

  for (const field of type.fields) {
    const overrideKey = `${type.name}.${field.name}`;
    let cppType = FIELD_TYPE_OVERRIDES[overrideKey];

    if (!cppType) {
      cppType = graphqlTypeToCpp(field.type, field.isNullable, field.isArray);
    }

    if (field.isArray) {
      lines.push(`    ${cppType}* ${field.name};`);
      lines.push(`    size_t ${field.name}Count;`);
    } else {
      lines.push(`    ${cppType} ${field.name};`);
    }
  }

  lines.push(`};`);
  return lines.join('\n');
}

// ============================================
// Tests
// ============================================

describe('GraphQL Schema Parser', () => {
  it('should parse a simple type definition', () => {
    const schema = `
      type LedCommand {
        position: Int!
        r: Int!
        g: Int!
        b: Int!
      }
    `;

    const types = parseGraphQLSchema(schema);
    assert.strictEqual(types.size, 1);
    assert.ok(types.has('LedCommand'));

    const ledCommand = types.get('LedCommand');
    assert.strictEqual(ledCommand.kind, 'type');
    assert.strictEqual(ledCommand.fields.length, 4);
    assert.strictEqual(ledCommand.fields[0].name, 'position');
    assert.strictEqual(ledCommand.fields[0].type, 'Int');
    assert.strictEqual(ledCommand.fields[0].isNullable, false);
  });

  it('should parse input type definitions', () => {
    const schema = `
      input LedCommandInput {
        position: Int!
        r: Int!
        g: Int!
        b: Int!
        role: Int
      }
    `;

    const types = parseGraphQLSchema(schema);
    const input = types.get('LedCommandInput');

    assert.strictEqual(input.kind, 'input');
    assert.strictEqual(input.fields.length, 5);

    const roleField = input.fields.find(f => f.name === 'role');
    assert.strictEqual(roleField.isNullable, true);
  });

  it('should parse array fields', () => {
    const schema = `
      type LedUpdate {
        commands: [LedCommand!]!
        climbUuid: String
        climbName: String
        angle: Int!
      }
    `;

    const types = parseGraphQLSchema(schema);
    const update = types.get('LedUpdate');

    const commandsField = update.fields.find(f => f.name === 'commands');
    assert.strictEqual(commandsField.isArray, true);
    assert.strictEqual(commandsField.type, 'LedCommand');
  });

  it('should parse union types', () => {
    const schema = `
      type LedUpdate {
        commands: [LedCommand!]!
      }

      type ControllerPing {
        timestamp: String!
      }

      union ControllerEvent = LedUpdate | ControllerPing
    `;

    const types = parseGraphQLSchema(schema);
    const union = types.get('ControllerEvent');

    assert.strictEqual(union.kind, 'union');
    assert.deepStrictEqual(union.unionTypes, ['LedUpdate', 'ControllerPing']);
  });

  it('should skip non-controller types', () => {
    const schema = `
      type User {
        id: ID!
        name: String!
      }

      type LedCommand {
        position: Int!
      }
    `;

    const types = parseGraphQLSchema(schema);
    assert.strictEqual(types.size, 1);
    assert.ok(types.has('LedCommand'));
    assert.ok(!types.has('User'));
  });

  it('should handle doc comments', () => {
    const schema = `
      """
      This is a doc comment that should be ignored
      """
      type LedCommand {
        """Position of the LED"""
        position: Int!
      }
    `;

    const types = parseGraphQLSchema(schema);
    assert.ok(types.has('LedCommand'));
    assert.strictEqual(types.get('LedCommand').fields.length, 1);
  });
});

describe('GraphQL to C++ Type Mapping', () => {
  it('should map Int to int32_t', () => {
    assert.strictEqual(graphqlTypeToCpp('Int', false, false), 'int32_t');
    assert.strictEqual(graphqlTypeToCpp('Int', true, false), 'int32_t');
  });

  it('should map String to const char*', () => {
    assert.strictEqual(graphqlTypeToCpp('String', false, false), 'const char*');
  });

  it('should map Boolean to bool', () => {
    assert.strictEqual(graphqlTypeToCpp('Boolean', false, false), 'bool');
  });

  it('should map Float to float', () => {
    assert.strictEqual(graphqlTypeToCpp('Float', false, false), 'float');
  });

  it('should map ID to const char*', () => {
    assert.strictEqual(graphqlTypeToCpp('ID', false, false), 'const char*');
  });

  it('should pass through custom types', () => {
    assert.strictEqual(graphqlTypeToCpp('LedCommand', false, false), 'LedCommand');
    assert.strictEqual(graphqlTypeToCpp('CustomType', false, false), 'CustomType');
  });
});

describe('C++ Struct Generation', () => {
  it('should generate a simple struct', () => {
    const type = {
      name: 'ControllerPing',
      kind: 'type',
      fields: [
        { name: 'timestamp', type: 'String', isNullable: false, isArray: false }
      ]
    };

    const output = generateCppStruct(type);
    assert.ok(output.includes('struct ControllerPing {'));
    assert.ok(output.includes('const char* timestamp;'));
    assert.ok(output.includes('};'));
  });

  it('should apply field type overrides for RGB values', () => {
    const type = {
      name: 'LedCommand',
      kind: 'type',
      fields: [
        { name: 'position', type: 'Int', isNullable: false, isArray: false },
        { name: 'r', type: 'Int', isNullable: false, isArray: false },
        { name: 'g', type: 'Int', isNullable: false, isArray: false },
        { name: 'b', type: 'Int', isNullable: false, isArray: false },
      ]
    };

    const output = generateCppStruct(type);
    assert.ok(output.includes('int32_t position;'));
    assert.ok(output.includes('uint8_t r;'));
    assert.ok(output.includes('uint8_t g;'));
    assert.ok(output.includes('uint8_t b;'));
  });

  it('should generate array fields with count', () => {
    const type = {
      name: 'LedUpdate',
      kind: 'type',
      fields: [
        { name: 'commands', type: 'LedCommand', isNullable: false, isArray: true },
      ]
    };

    const output = generateCppStruct(type);
    assert.ok(output.includes('LedCommand* commands;'));
    assert.ok(output.includes('size_t commandsCount;'));
  });

  it('should generate union type comment', () => {
    const type = {
      name: 'ControllerEvent',
      kind: 'union',
      fields: [],
      unionTypes: ['LedUpdate', 'ControllerPing']
    };

    const output = generateCppStruct(type);
    assert.ok(output.includes('Union type: ControllerEvent'));
    assert.ok(output.includes('LedUpdate | ControllerPing'));
    assert.ok(output.includes('__typename'));
  });
});

describe('Integration: Parse and Generate', () => {
  it('should parse real schema and generate valid C++ for LedCommand', () => {
    const schemaPath = path.join(__dirname, '../../packages/shared-schema/src/schema.ts');

    if (!fs.existsSync(schemaPath)) {
      console.log('Skipping integration test: schema file not found');
      return;
    }

    const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
    const types = parseGraphQLSchema(schemaContent);

    // Verify we found the expected types
    assert.ok(types.has('LedCommand'), 'Should have LedCommand');
    assert.ok(types.has('LedUpdate'), 'Should have LedUpdate');
    assert.ok(types.has('ControllerPing'), 'Should have ControllerPing');
    assert.ok(types.has('ControllerEvent'), 'Should have ControllerEvent');

    // Verify LedCommand structure
    const ledCommand = types.get('LedCommand');
    assert.strictEqual(ledCommand.fields.length, 4);

    const posField = ledCommand.fields.find(f => f.name === 'position');
    assert.ok(posField, 'Should have position field');

    // Generate C++ and verify it's syntactically reasonable
    const cppOutput = generateCppStruct(ledCommand);
    assert.ok(cppOutput.includes('struct LedCommand'), 'Should have struct definition');
    assert.ok(cppOutput.includes('uint8_t r;'), 'Should use uint8_t for r');
    assert.ok(cppOutput.includes('};'), 'Should close struct');
  });

  it('should generate valid output file', () => {
    const outputPath = path.join(__dirname, '../libs/graphql-types/src/graphql_types.h');

    if (!fs.existsSync(outputPath)) {
      console.log('Skipping output file test: generated file not found');
      return;
    }

    const content = fs.readFileSync(outputPath, 'utf-8');

    // Verify header guards
    assert.ok(content.includes('#ifndef GRAPHQL_TYPES_H'), 'Should have include guard');
    assert.ok(content.includes('#define GRAPHQL_TYPES_H'), 'Should have define guard');
    assert.ok(content.includes('#endif'), 'Should close include guard');

    // Verify required includes
    assert.ok(content.includes('#include <Arduino.h>'), 'Should include Arduino.h');
    assert.ok(content.includes('#include <ArduinoJson.h>'), 'Should include ArduinoJson.h');

    // Verify structs are generated
    assert.ok(content.includes('struct LedCommand'), 'Should have LedCommand struct');
    assert.ok(content.includes('struct LedUpdate'), 'Should have LedUpdate struct');
    assert.ok(content.includes('struct ControllerPing'), 'Should have ControllerPing struct');

    // Verify operations namespace
    assert.ok(content.includes('namespace GraphQLOps'), 'Should have GraphQLOps namespace');
    assert.ok(content.includes('CONTROLLER_EVENTS_SUBSCRIPTION'), 'Should have subscription');

    // Verify helper functions
    assert.ok(content.includes('inline bool parseLedCommand'), 'Should have parse helper');
    assert.ok(content.includes('inline bool parseLedUpdate'), 'Should have parse helper');

    // Verify uint8_t is used for RGB
    assert.ok(content.includes('uint8_t r;'), 'Should use uint8_t for red');
    assert.ok(content.includes('uint8_t g;'), 'Should use uint8_t for green');
    assert.ok(content.includes('uint8_t b;'), 'Should use uint8_t for blue');
  });
});

describe('Edge Cases', () => {
  it('should handle empty schema', () => {
    const types = parseGraphQLSchema('');
    assert.strictEqual(types.size, 0);
  });

  it('should handle schema with only non-controller types', () => {
    const schema = `
      type User {
        id: ID!
      }
      type Session {
        id: ID!
      }
    `;
    const types = parseGraphQLSchema(schema);
    assert.strictEqual(types.size, 0);
  });

  it('should handle nullable fields correctly', () => {
    const schema = `
      type ClimbMatchResult {
        matched: Boolean!
        climbUuid: String
        climbName: String
      }
    `;

    const types = parseGraphQLSchema(schema);
    const result = types.get('ClimbMatchResult');

    const matched = result.fields.find(f => f.name === 'matched');
    const climbUuid = result.fields.find(f => f.name === 'climbUuid');

    assert.strictEqual(matched.isNullable, false);
    assert.strictEqual(climbUuid.isNullable, true);
  });
});

// Run summary
console.log('\n✅ All tests defined. Run with: node --test embedded/scripts/generate-graphql-types.test.mjs\n');
