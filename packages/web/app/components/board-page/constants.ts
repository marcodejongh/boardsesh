export const PAGE_LIMIT = 10;
export const MAX_PAGE_SIZE = 100; // Maximum page size to prevent excessive database queries

// Threshold for proactive fetching of suggestions
// When suggestedClimbs falls below this, we fetch more automatically
// Set to 3 to fetch when ~70% of PAGE_LIMIT consumed for smooth UX
export const SUGGESTIONS_THRESHOLD = 3;
