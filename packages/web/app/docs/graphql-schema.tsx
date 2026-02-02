'use client';

/**
 * GraphQL Schema Viewer Component
 *
 * Displays the GraphQL schema documentation with syntax highlighting.
 * The schema is loaded from the shared-schema package.
 */

import { useState } from 'react';
import { Tabs, Typography, Card, Input, Collapse, Tag, Space } from 'antd';
import { typeDefs } from '@boardsesh/shared-schema/schema';

const { Text, Paragraph } = Typography;
const { Search } = Input;

type SchemaSection = {
  name: string;
  content: string;
  type: 'type' | 'input' | 'enum' | 'query' | 'mutation' | 'subscription' | 'union' | 'scalar';
};

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
        background: '#1e1e1e',
        color: '#d4d4d4',
        padding: '16px',
        borderRadius: '8px',
        overflow: 'auto',
        fontSize: '13px',
        lineHeight: '1.5',
        fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
      }}
    >
      <code>{highlightGraphQL(content)}</code>
    </pre>
  );
}

function highlightGraphQL(code: string): React.ReactNode[] {
  // Simple syntax highlighting for GraphQL
  const lines = code.split('\n');
  return lines.map((line, i) => {
    let highlighted = line
      // Comments
      .replace(/(#.*)$/g, '<span style="color:#6a9955">$1</span>')
      // Strings (descriptions)
      .replace(/("(?:[^"\\]|\\.)*")/g, '<span style="color:#ce9178">$1</span>')
      // Keywords
      .replace(
        /\b(type|input|enum|union|scalar|query|mutation|subscription|fragment|on|implements|interface|extend|schema|directive)\b/gi,
        '<span style="color:#569cd6">$1</span>'
      )
      // Types (capitalized words after colon or brackets)
      .replace(/:\s*(\[?)([A-Z]\w+)(!?)(\]?)(!?)/g, ': $1<span style="color:#4ec9b0">$2</span>$3$4$5')
      // Arguments
      .replace(/(\w+):/g, '<span style="color:#9cdcfe">$1</span>:')
      // Booleans and null
      .replace(/\b(true|false|null)\b/g, '<span style="color:#569cd6">$1</span>');

    return (
      <span key={i}>
        <span dangerouslySetInnerHTML={{ __html: highlighted }} />
        {i < lines.length - 1 && '\n'}
      </span>
    );
  });
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
      <div style={{ marginBottom: 16 }}>
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
                <Paragraph type="secondary" style={{ marginBottom: 16 }}>
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
