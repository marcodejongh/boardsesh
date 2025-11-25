/**
 * Pure function to check if a set name matches a given slug.
 * This is extracted for testability - the matching logic is complex and needs thorough testing.
 *
 * @param setName - The name of the set from the database
 * @param slugParts - Array of slug parts (e.g., ['main-kicker', 'main', 'aux-kicker', 'aux'])
 * @returns true if the set name matches any of the slug parts
 */
export const matchSetNameToSlugParts = (setName: string, slugParts: string[]): boolean => {
  const lowercaseName = setName.toLowerCase().trim();

  // Handle homewall-specific set names (supports both "Auxiliary/Mainline" and "Aux/Main" variants)
  const hasAux = lowercaseName.includes('auxiliary') || lowercaseName.includes('aux');
  const hasMain = lowercaseName.includes('mainline') || lowercaseName.includes('main');
  const hasKickboard = lowercaseName.includes('kickboard');

  // Match aux-kicker: sets with aux/auxiliary AND kickboard
  if (hasAux && hasKickboard && slugParts.includes('aux-kicker')) {
    return true;
  }
  // Match main-kicker: sets with main/mainline AND kickboard
  if (hasMain && hasKickboard && slugParts.includes('main-kicker')) {
    return true;
  }
  // Match aux: sets with aux/auxiliary but NOT kickboard
  if (hasAux && !hasKickboard && slugParts.includes('aux')) {
    return true;
  }
  // Match main: sets with main/mainline but NOT kickboard
  if (hasMain && !hasKickboard && slugParts.includes('main')) {
    return true;
  }

  // Handle original kilter/tension set names
  const setSlug = lowercaseName
    .replace(/\s+ons?$/i, '') // Remove "on" or "ons" suffix
    .replace(/^(bolt|screw).*/, '$1') // Extract just "bolt" or "screw"
    .replace(/\s+/g, '-'); // Replace spaces with hyphens
  return slugParts.includes(setSlug);
};
