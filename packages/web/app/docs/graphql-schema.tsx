'use client';

/**
 * GraphQL Schema Viewer Component
 *
 * Displays the GraphQL schema documentation with syntax highlighting.
 * The schema is loaded from the shared-schema package.
 *
 * Uses a tokenizer-based approach for syntax highlighting to avoid XSS
 * vulnerabilities from dangerouslySetInnerHTML.
 */

import { useState, type ReactNode } from 'react';
import { Tabs, Typography, Card, Input, Collapse, Tag, Space } from 'antd';
import { typeDefs } from '@boardsesh/shared-schema/schema';
import { themeTokens } from '@/app/theme/theme-config';

const { Text, Paragraph } = Typography;
const { Search } = Input;

// Syntax highlighting colors (VS Code dark theme inspired)
const syntaxColors = {
  keyword: '#569cd6',
  type: '#4ec9b0',
  string: '#ce9178',
  comment: '#6a9955',
  parameter: '#9cdcfe',
  default: '#d4d4d4',
} as const;

type SchemaSection = {
  name: string;
  content: string;
  type: 'type' | 'input' | 'enum' | 'query' | 'mutation' | 'subscription' | 'union' | 'scalar';
};

type TokenType = 'keyword' | 'type' | 'string' | 'comment' | 'parameter' | 'default';

type Token = {
  text: string;
  type: TokenType;
};

/**
 * Tokenizes a line of GraphQL code for syntax highlighting.
 * Returns an array of tokens with their types - no HTML injection.
 */
function tokenizeLine(line: string): Token[] {
  const tokens: Token[] = [];
  let remaining = line;

  const patterns: Array<{ regex: RegExp; type: TokenType }> = [
    // Comments (must be first to capture entire comment)
    { regex: /^(#.*)/, type: 'comment' },
    // Triple-quoted strings (descriptions)
    { regex: /^("""[\s\S]*?""")/, type: 'string' },
    // Double-quoted strings
    { regex: /^("[^"\\]*(?:\\.[^"\\]*)*")/, type: 'string' },
    // Keywords
    {
      regex: /^(type|input|enum|union|scalar|query|mutation|subscription|fragment|on|implements|interface|extend|schema|directive)\b/i,
      type: 'keyword',
    },
    // Types (capitalized words)
    { regex: /^([A-Z][a-zA-Z0-9]*)/, type: 'type' },
    // Booleans and null
    { regex: /^(true|false|null)\b/, type: 'keyword' },
    // Parameter names (word followed by colon)
    { regex: /^(\w+)(?=:)/, type: 'parameter' },
    // Whitespace and punctuation
    { regex: /^(\s+|[{}[\]()!:,=@])/, type: 'default' },
    // Other identifiers
    { regex: /^(\w+)/, type: 'default' },
    // Any other character
    { regex: /^(.)/, type: 'default' },
  ];

  while (remaining.length > 0) {
    let matched = false;

    for (const { regex, type } of patterns) {
      const match = remaining.match(regex);
      if (match) {
        tokens.push({ text: match[1], type });
        remaining = remaining.slice(match[1].length);
        matched = true;
        break;
      }
    }

    if (!matched) {
      // Safety fallback - should never happen with the catch-all pattern
      tokens.push({ text: remaining[0], type: 'default' });
      remaining = remaining.slice(1);
    }
  }

  return tokens;
}

/**
 * Renders syntax-highlighted GraphQL code using React elements.
 * Safe from XSS as it doesn't use dangerouslySetInnerHTML.
 */
function highlightGraphQL(code: string): ReactNode[] {
  const lines = code.split('\n');

  return lines.map((line, lineIndex) => {
    const tokens = tokenizeLine(line);

    return (
      <span key={lineIndex}>
        {tokens.map((token, tokenIndex) => (
          <span key={tokenIndex} style={{ color: syntaxColors[token.type] }}>
            {token.text}
          </span>
        ))}
        {lineIndex < lines.length - 1 && '\n'}
      </span>
    );
  });
}

function parseSchema(schema: string): SchemaSection[] {
  const sections: SchemaSection[] = [];
  const lines = schema.split('\n');
  let currentSection: SchemaSection | null = null;
  let braceCount = 0;

  for (const line of lines) {
    // Detect start of a new type definition
    const typeMatch = line.match(/^\s*("""[\s\S]*?"""\s*)?(type|input|enum|union|scalar)\s+(\w+)/);
    const queryMatch = line.match(/^\s*("""[\s\S]*?""")?\s*type\s+(Query|Mutation|Subscription)\s*\{/);

    if (queryMatch) {
      if (currentSection && braceCount === 0) {
        sections.push(currentSection);
      }
      const typeName = queryMatch[2].toLowerCase() as 'query' | 'mutation' | 'subscription';
      currentSection = {
        name: queryMatch[2],
        content: line,
        type: typeName,
      };
      braceCount = (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
    } else if (typeMatch && !queryMatch) {
      if (currentSection && braceCount === 0) {
        sections.push(currentSection);
      }
      currentSection = {
        name: typeMatch[3],
        content: line,
        type: typeMatch[2] as SchemaSection['type'],
      };
      braceCount = (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
    } else if (currentSection) {
      currentSection.content += '\n' + line;
      braceCount += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;

      if (braceCount === 0 && line.trim() === '}') {
        sections.push(currentSection);
        currentSection = null;
      }
    }
  }

  if (currentSection) {
    sections.push(currentSection);
  }

  return sections;
}

function TypeBadge({ type }: { type: SchemaSection['type'] }) {
  const colors: Record<SchemaSection['type'], string> = {
    type: 'blue',
    input: 'green',
    enum: 'purple',
    query: 'cyan',
    mutation: 'orange',
    subscription: 'magenta',
    union: 'gold',
    scalar: 'default',
  };

  return <Tag color={colors[type]}>{type.toUpperCase()}</Tag>;
}

function SchemaBlock({ content }: { content: string }) {
  return (
    <pre
      style={{
        background: themeTokens.neutral[900],
        color: syntaxColors.default,
        padding: themeTokens.spacing[4],
        borderRadius: themeTokens.borderRadius.md,
        overflow: 'auto',
        fontSize: themeTokens.typography.fontSize.sm - 1,
        lineHeight: themeTokens.typography.lineHeight.normal,
        fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
      }}
    >
      <code>{highlightGraphQL(content)}</code>
    </pre>
  );
}

export default function GraphQLSchemaViewer() {
  const [searchQuery, setSearchQuery] = useState('');
  const sections = parseSchema(typeDefs);

  const filteredSections = searchQuery
    ? sections.filter(
        (s) =>
          s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : sections;

  const groupedSections = {
    operations: filteredSections.filter((s) => ['query', 'mutation', 'subscription'].includes(s.type)),
    types: filteredSections.filter((s) => s.type === 'type' && !['query', 'mutation', 'subscription'].includes(s.name.toLowerCase())),
    inputs: filteredSections.filter((s) => s.type === 'input'),
    enums: filteredSections.filter((s) => s.type === 'enum'),
    others: filteredSections.filter((s) => ['union', 'scalar'].includes(s.type)),
  };

  const renderSectionList = (sectionList: SchemaSection[]) => (
    <Collapse
      items={sectionList.map((section) => ({
        key: section.name,
        label: (
          <Space>
            <TypeBadge type={section.type} />
            <Text strong>{section.name}</Text>
          </Space>
        ),
        children: <SchemaBlock content={section.content} />,
      }))}
    />
  );

  return (
    <div>
      <div style={{ marginBottom: themeTokens.spacing[4] }}>
        <Search
          placeholder="Search types, fields, descriptions..."
          allowClear
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ maxWidth: 400 }}
        />
      </div>

      <Tabs
        defaultActiveKey="operations"
        items={[
          {
            key: 'operations',
            label: `Operations (${groupedSections.operations.length})`,
            children: (
              <div>
                <Paragraph type="secondary" style={{ marginBottom: themeTokens.spacing[4] }}>
                  Queries, Mutations, and Subscriptions available via the WebSocket GraphQL API.
                </Paragraph>
                {renderSectionList(groupedSections.operations)}
              </div>
            ),
          },
          {
            key: 'types',
            label: `Types (${groupedSections.types.length})`,
            children: renderSectionList(groupedSections.types),
          },
          {
            key: 'inputs',
            label: `Inputs (${groupedSections.inputs.length})`,
            children: renderSectionList(groupedSections.inputs),
          },
          {
            key: 'enums',
            label: `Enums (${groupedSections.enums.length})`,
            children: renderSectionList(groupedSections.enums),
          },
          {
            key: 'others',
            label: `Others (${groupedSections.others.length})`,
            children: renderSectionList(groupedSections.others),
          },
          {
            key: 'full',
            label: 'Full Schema',
            children: (
              <Card>
                <SchemaBlock content={typeDefs} />
              </Card>
            ),
          },
        ]}
      />
    </div>
  );
}
