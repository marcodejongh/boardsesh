import { DocumentNode, Kind, type DefinitionNode, type SelectionSetNode } from 'graphql';

const MAX_QUERY_DEPTH = 10;

/**
 * Calculate the maximum depth of a GraphQL document.
 * Used for both HTTP (via graphql-armor plugin) and WebSocket (via onSubscribe) paths.
 */
function calculateDepth(selectionSet: SelectionSetNode, currentDepth: number): number {
  let maxDepth = currentDepth;

  for (const selection of selectionSet.selections) {
    if (selection.kind === Kind.FIELD && selection.selectionSet) {
      const fieldDepth = calculateDepth(selection.selectionSet, currentDepth + 1);
      if (fieldDepth > maxDepth) {
        maxDepth = fieldDepth;
      }
    } else if (
      (selection.kind === Kind.INLINE_FRAGMENT || selection.kind === Kind.FRAGMENT_SPREAD) &&
      'selectionSet' in selection &&
      selection.selectionSet
    ) {
      const fragmentDepth = calculateDepth(selection.selectionSet, currentDepth);
      if (fragmentDepth > maxDepth) {
        maxDepth = fragmentDepth;
      }
    }
  }

  return maxDepth;
}

/**
 * Validate that a GraphQL document does not exceed the maximum allowed depth.
 * Returns an error message if the depth is exceeded, or null if valid.
 */
export function validateQueryDepth(document: DocumentNode): string | null {
  for (const definition of document.definitions) {
    if (
      definition.kind === Kind.OPERATION_DEFINITION &&
      definition.selectionSet
    ) {
      const depth = calculateDepth(definition.selectionSet, 0);
      if (depth > MAX_QUERY_DEPTH) {
        return `Query depth ${depth} exceeds maximum allowed depth of ${MAX_QUERY_DEPTH}`;
      }
    }
  }
  return null;
}
