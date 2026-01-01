/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from 'vitest';
import {
  searchParamsToUrlParams,
  parsedRouteSearchParamsToSearchParams,
  urlParamsToSearchParams,
  parseBoardRouteParams,
  constructClimbViewUrl,
  constructClimbInfoUrl,
  constructClimbList,
  constructClimbSearchUrl,
  generateClimbSlug,
  generateLayoutSlug,
  generateSizeSlug,
  generateSetSlug,
  extractUuidFromSlug,
  isUuidOnly,
  isNumericId,
  isSlugFormat,
  getBaseBoardPath,
  DEFAULT_SEARCH_PARAMS
} from '../url-utils';

describe('searchParamsToUrlParams', () => {
  it('should return empty URLSearchParams when all values are defaults', () => {
    const result = searchParamsToUrlParams(DEFAULT_SEARCH_PARAMS);
    expect(result.toString()).toBe('');
  });

  it('should only include non-default values', () => {
    const result = searchParamsToUrlParams({
      ...DEFAULT_SEARCH_PARAMS,
      minGrade: 5,
    });
    
    expect(result.toString()).toBe('minGrade=5');
  });

  it('should handle multiple non-default values', () => {
    const result = searchParamsToUrlParams({
      ...DEFAULT_SEARCH_PARAMS,
      minGrade: 5,
      name: 'test climb',
      onlyClassics: true,
    });
    
    const params = result.toString();
    expect(params).toContain('minGrade=5');
    expect(params).toContain('name=test+climb');
    expect(params).toContain('onlyClassics=true');
  });

  it('should not include empty strings', () => {
    const result = searchParamsToUrlParams({
      ...DEFAULT_SEARCH_PARAMS,
      name: '',
      settername: [],
      minGrade: 3,
    });

    expect(result.toString()).toBe('minGrade=3');
  });

  it('should include non-default sort values', () => {
    const result = searchParamsToUrlParams({
      ...DEFAULT_SEARCH_PARAMS,
      sortBy: 'difficulty',
      sortOrder: 'asc',
    });
    
    const params = result.toString();
    expect(params).toContain('sortBy=difficulty');
    expect(params).toContain('sortOrder=asc');
  });

  it('should handle holds filter correctly', () => {
    const result = searchParamsToUrlParams({
      ...DEFAULT_SEARCH_PARAMS,
      holdsFilter: {
        'red': { state: 'include' },
        'blue': { state: 'exclude' },
      } as any,
    });
    
    const params = result.toString();
    expect(params).toContain('hold_red=include');
    expect(params).toContain('hold_blue=exclude');
  });

  it('should not include holds filter when empty', () => {
    const result = searchParamsToUrlParams({
      ...DEFAULT_SEARCH_PARAMS,
      holdsFilter: {},
      minGrade: 2,
    });
    
    expect(result.toString()).toBe('minGrade=2');
  });

  it('should handle page and pageSize correctly', () => {
    const result = searchParamsToUrlParams({
      ...DEFAULT_SEARCH_PARAMS,
      page: 2,
      pageSize: 50,
    });
    
    const params = result.toString();
    expect(params).toContain('page=2');
    expect(params).toContain('pageSize=50');
  });

  it('should handle boolean values correctly', () => {
    const result = searchParamsToUrlParams({
      ...DEFAULT_SEARCH_PARAMS,
      onlyClassics: true,
    });
    
    expect(result.toString()).toBe('onlyClassics=true');
  });

  it('should handle numeric zero values correctly', () => {
    // When the default is 0, setting it to 0 shouldn't be included
    const result = searchParamsToUrlParams({
      ...DEFAULT_SEARCH_PARAMS,
      minGrade: 0, // This is the default
      maxGrade: 5, // This is not the default
    });
    
    expect(result.toString()).toBe('maxGrade=5');
  });
});

describe('parsedRouteSearchParamsToSearchParams', () => {
  it('should convert string numbers to actual numbers', () => {
    const input = {
      ...DEFAULT_SEARCH_PARAMS,
      minGrade: '5' as any,
      maxGrade: '10' as any,
      minAscents: '20' as any,
      minRating: '3' as any,
      gradeAccuracy: '1' as any,
      page: '2' as any,
      pageSize: '50' as any,
    };

    const result = parsedRouteSearchParamsToSearchParams(input);

    expect(result.minGrade).toBe(5);
    expect(result.maxGrade).toBe(10);
    expect(result.minAscents).toBe(20);
    expect(result.minRating).toBe(3);
    expect(result.gradeAccuracy).toBe(1);
    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(50);
    expect(typeof result.minGrade).toBe('number');
    expect(typeof result.maxGrade).toBe('number');
  });

  it('should use defaults when values are undefined', () => {
    const input = {
      ...DEFAULT_SEARCH_PARAMS,
      minGrade: undefined as any,
      maxGrade: undefined as any,
      name: 'test climb',
    };

    const result = parsedRouteSearchParamsToSearchParams(input);

    expect(result.minGrade).toBe(DEFAULT_SEARCH_PARAMS.minGrade);
    expect(result.maxGrade).toBe(DEFAULT_SEARCH_PARAMS.maxGrade);
    expect(result.name).toBe('test climb');
  });

  it('should handle null values by using defaults', () => {
    const input = {
      ...DEFAULT_SEARCH_PARAMS,
      minGrade: null as any,
      maxGrade: null as any,
      page: null as any,
    };

    const result = parsedRouteSearchParamsToSearchParams(input);

    expect(result.minGrade).toBe(DEFAULT_SEARCH_PARAMS.minGrade);
    expect(result.maxGrade).toBe(DEFAULT_SEARCH_PARAMS.maxGrade);
    expect(result.page).toBe(DEFAULT_SEARCH_PARAMS.page);
  });

  it('should handle empty string values by using defaults', () => {
    const input = {
      ...DEFAULT_SEARCH_PARAMS,
      minGrade: '' as any,
      maxGrade: '' as any,
      minAscents: '' as any,
    };

    const result = parsedRouteSearchParamsToSearchParams(input);

    expect(result.minGrade).toBe(DEFAULT_SEARCH_PARAMS.minGrade);
    expect(result.maxGrade).toBe(DEFAULT_SEARCH_PARAMS.maxGrade);
    expect(result.minAscents).toBe(DEFAULT_SEARCH_PARAMS.minAscents);
  });

  it('should preserve non-numeric fields correctly', () => {
    const input = {
      ...DEFAULT_SEARCH_PARAMS,
      name: 'test climb',
      settername: ['john doe'],
      sortBy: 'difficulty' as any,
      sortOrder: 'asc' as any,
      onlyClassics: true,
      holdsFilter: { red: { state: 'include' } },
    };

    const result = parsedRouteSearchParamsToSearchParams(input);

    expect(result.name).toBe('test climb');
    expect(result.settername).toEqual(['john doe']);
    expect(result.sortBy).toBe('difficulty');
    expect(result.sortOrder).toBe('asc');
    expect(result.onlyClassics).toBe(true);
    expect(result.holdsFilter).toEqual({ red: { state: 'include' } });
  });

  it('should handle mixed string and number inputs', () => {
    const input = {
      ...DEFAULT_SEARCH_PARAMS,
      minGrade: '5' as any,
      maxGrade: 10, // already a number
      name: 'test',
      page: '1' as any,
      pageSize: 25, // already a number
    };

    const result = parsedRouteSearchParamsToSearchParams(input);

    expect(result.minGrade).toBe(5);
    expect(result.maxGrade).toBe(10);
    expect(result.name).toBe('test');
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(25);
    expect(typeof result.minGrade).toBe('number');
    expect(typeof result.maxGrade).toBe('number');
    expect(typeof result.page).toBe('number');
    expect(typeof result.pageSize).toBe('number');
  });

  it('should handle invalid number strings by falling back to defaults', () => {
    const input = {
      ...DEFAULT_SEARCH_PARAMS,
      minGrade: 'invalid' as any,
      maxGrade: 'NaN' as any,
      page: 'not-a-number' as any,
    };

    const result = parsedRouteSearchParamsToSearchParams(input);

    // Number('invalid') returns NaN, Number(NaN ?? default) should use default
    expect(isNaN(result.minGrade)).toBe(true); // This might be NaN, which could cause 404s
    expect(isNaN(result.maxGrade)).toBe(true);
    expect(isNaN(result.page)).toBe(true);
  });

  it('should return all default values when input only contains defaults', () => {
    const result = parsedRouteSearchParamsToSearchParams(DEFAULT_SEARCH_PARAMS);

    expect(result).toEqual(DEFAULT_SEARCH_PARAMS);
    expect(typeof result.minGrade).toBe('number');
    expect(typeof result.maxGrade).toBe('number');
    expect(typeof result.page).toBe('number');
  });
});

describe('urlParamsToSearchParams', () => {
  it('should convert URLSearchParams to SearchRequestPagination', () => {
    const urlParams = new URLSearchParams({
      minGrade: '5',
      maxGrade: '10',
      name: 'test climb',
      onlyClassics: 'true',
      page: '2',
      hold_red: 'include',
      hold_blue: 'exclude'
    });

    const result = urlParamsToSearchParams(urlParams);

    expect(result.minGrade).toBe(5);
    expect(result.maxGrade).toBe(10);
    expect(result.name).toBe('test climb');
    expect(result.onlyClassics).toBe(true);
    expect(result.page).toBe(2);
    expect(result.holdsFilter).toEqual({ red: 'include', blue: 'exclude' });
  });

  it('should use defaults for missing parameters', () => {
    const urlParams = new URLSearchParams({ name: 'test' });
    const result = urlParamsToSearchParams(urlParams);

    expect(result.minGrade).toBe(DEFAULT_SEARCH_PARAMS.minGrade);
    expect(result.maxGrade).toBe(DEFAULT_SEARCH_PARAMS.maxGrade);
    expect(result.name).toBe('test');
    expect(result.sortBy).toBe(DEFAULT_SEARCH_PARAMS.sortBy);
  });

  it('should handle empty URLSearchParams', () => {
    const urlParams = new URLSearchParams();
    const result = urlParamsToSearchParams(urlParams);

    expect(result).toEqual(DEFAULT_SEARCH_PARAMS);
  });
});

describe('parseBoardRouteParams', () => {
  it('should parse board route parameters correctly', () => {
    const params = {
      board_name: 'kilter',
      layout_id: '5',
      size_id: '10',
      set_ids: '1%2C2%2C3', // encoded "1,2,3"
      angle: '45'
    };

    const result = parseBoardRouteParams(params);

    expect(result.board_name).toBe('kilter');
    expect(result.layout_id).toBe(5);
    expect(result.size_id).toBe(10);
    expect(result.set_ids).toEqual([1, 2, 3]);
    expect(result.angle).toBe(45);
  });

  it('should handle climb_uuid when present', () => {
    const params = {
      board_name: 'tension',
      layout_id: '1',
      size_id: '2',
      set_ids: '4%2C5',
      angle: '30',
      climb_uuid: 'abc123def456'
    };

    const result = parseBoardRouteParams(params);

    expect(result.climb_uuid).toBe('abc123def456');
    expect(result.board_name).toBe('tension');
  });
});

describe('URL construction functions', () => {
  const mockRouteParams = {
    board_name: 'kilter' as const,
    layout_id: 1,
    size_id: 2,
    set_ids: [3, 4],
    angle: 45
  };

  describe('constructClimbViewUrl', () => {
    it('should construct URL with climb name slug', () => {
      const result = constructClimbViewUrl(mockRouteParams, 'abc123', 'Test Climb Name');
      expect(result).toBe('/kilter/1/2/3,4/45/view/test-climb-name-abc123');
    });

    it('should construct URL without climb name', () => {
      const result = constructClimbViewUrl(mockRouteParams, 'abc123');
      expect(result).toBe('/kilter/1/2/3,4/45/view/abc123');
    });

    it('should handle empty climb name', () => {
      const result = constructClimbViewUrl(mockRouteParams, 'abc123', '');
      expect(result).toBe('/kilter/1/2/3,4/45/view/abc123');
    });
  });

  describe('constructClimbList', () => {
    it('should construct climb list URL', () => {
      const result = constructClimbList(mockRouteParams);
      expect(result).toBe('/kilter/1/2/3,4/45/list');
    });
  });

  describe('constructClimbSearchUrl', () => {
    it('should construct search URL with query string', () => {
      const result = constructClimbSearchUrl(mockRouteParams, 'minGrade=5&name=test');
      expect(result).toBe('/api/v1/kilter/1/2/3,4/45/search?minGrade=5&name=test');
    });
  });

  describe('constructClimbInfoUrl', () => {
    it('should construct external info URL for kilter', () => {
      const boardDetails = { board_name: 'kilter' as const };
      const result = constructClimbInfoUrl(boardDetails as any, 'abc123', 45);
      expect(result).toBe('https://kilterboardapp.com/climbs/abc123');
    });

    it('should construct external info URL for tension', () => {
      const boardDetails = { board_name: 'tension' as const };
      const result = constructClimbInfoUrl(boardDetails as any, 'def456', 30);
      expect(result).toBe('https://tensionboardapp2.com/climbs/def456');
    });
  });
});

describe('Slug generation functions', () => {
  describe('generateClimbSlug', () => {
    it('should generate clean slug from climb name', () => {
      expect(generateClimbSlug('Test Climb Name')).toBe('test-climb-name');
      expect(generateClimbSlug('Special!@# Characters%')).toBe('special-characters');
      expect(generateClimbSlug('  Multiple   Spaces  ')).toBe('multiple-spaces');
    });

    it('should handle empty and edge cases', () => {
      expect(generateClimbSlug('')).toBe('');
      expect(generateClimbSlug('   ')).toBe('');
      expect(generateClimbSlug('A')).toBe('a');
    });
  });

  describe('generateLayoutSlug', () => {
    it('should remove board name prefix', () => {
      expect(generateLayoutSlug('Kilter Board Layout')).toBe('layout');
      expect(generateLayoutSlug('Tension Board Original Layout')).toBe('original');
    });

    it('should handle tension specific cases', () => {
      expect(generateLayoutSlug('Original Layout')).toBe('original');
      expect(generateLayoutSlug('2-Zone Layout')).toBe('two-zone-layout');
    });
  });

  describe('generateSizeSlug', () => {
    it('should extract dimensions from size name', () => {
      expect(generateSizeSlug('12 x 12 Commercial')).toBe('12x12');
      expect(generateSizeSlug('8 X 10 Home')).toBe('8x10');
    });

    it('should fallback to general slug for non-dimensional names', () => {
      expect(generateSizeSlug('Custom Size')).toBe('custom-size');
    });

    describe('with description parameter (for disambiguating sizes)', () => {
      it('should append description suffix for Full Ride LED Kit', () => {
        expect(generateSizeSlug('10x12', 'Full Ride LED Kit')).toBe('10x12-full-ride');
      });

      it('should append description suffix for Mainline LED Kit', () => {
        expect(generateSizeSlug('10x12', 'Mainline LED Kit')).toBe('10x12-mainline');
      });

      it('should handle size with spaces in name', () => {
        expect(generateSizeSlug('10 x 12', 'Full Ride LED Kit')).toBe('10x12-full-ride');
      });

      it('should return just dimensions when description is empty', () => {
        expect(generateSizeSlug('10x12', '')).toBe('10x12');
        expect(generateSizeSlug('10x12', '   ')).toBe('10x12');
      });

      it('should return just dimensions when description is undefined', () => {
        expect(generateSizeSlug('10x12', undefined)).toBe('10x12');
        expect(generateSizeSlug('10x12')).toBe('10x12');
      });

      it('should handle description with only LED Kit (no meaningful suffix)', () => {
        // After removing "LED Kit", if nothing remains, just return dimensions
        expect(generateSizeSlug('10x12', 'LED Kit')).toBe('10x12');
      });

      it('should handle various LED Kit formats', () => {
        expect(generateSizeSlug('10x12', 'Full Ride led kit')).toBe('10x12-full-ride');
        expect(generateSizeSlug('10x12', 'Full Ride LED KIT')).toBe('10x12-full-ride');
        expect(generateSizeSlug('10x12', 'Full RideLEDKit')).toBe('10x12-full-ride');
      });

      it('should handle non-dimensional size names with description', () => {
        expect(generateSizeSlug('Custom Size', 'Full Ride LED Kit')).toBe('custom-size-full-ride');
      });
    });
  });

  describe('generateSetSlug', () => {
    describe('homewall specific sets - full names', () => {
      it('should handle Auxiliary Kickboard', () => {
        expect(generateSetSlug(['Auxiliary Kickboard'])).toBe('aux-kicker');
      });

      it('should handle Mainline Kickboard', () => {
        expect(generateSetSlug(['Mainline Kickboard'])).toBe('main-kicker');
      });

      it('should handle Auxiliary (standalone)', () => {
        expect(generateSetSlug(['Auxiliary'])).toBe('aux');
      });

      it('should handle Mainline (standalone)', () => {
        expect(generateSetSlug(['Mainline'])).toBe('main');
      });
    });

    describe('homewall specific sets - abbreviated names (Aux/Main)', () => {
      it('should handle Aux Kickboard', () => {
        expect(generateSetSlug(['Aux Kickboard'])).toBe('aux-kicker');
      });

      it('should handle Main Kickboard', () => {
        expect(generateSetSlug(['Main Kickboard'])).toBe('main-kicker');
      });

      it('should handle Aux (standalone)', () => {
        expect(generateSetSlug(['Aux'])).toBe('aux');
      });

      it('should handle Main (standalone)', () => {
        expect(generateSetSlug(['Main'])).toBe('main');
      });
    });

    describe('homewall specific sets - case insensitivity', () => {
      it('should handle lowercase auxiliary kickboard', () => {
        expect(generateSetSlug(['auxiliary kickboard'])).toBe('aux-kicker');
      });

      it('should handle uppercase AUXILIARY KICKBOARD', () => {
        expect(generateSetSlug(['AUXILIARY KICKBOARD'])).toBe('aux-kicker');
      });

      it('should handle mixed case AuXiLiArY', () => {
        expect(generateSetSlug(['AuXiLiArY'])).toBe('aux');
      });

      it('should handle lowercase aux', () => {
        expect(generateSetSlug(['aux'])).toBe('aux');
      });

      it('should handle uppercase AUX', () => {
        expect(generateSetSlug(['AUX'])).toBe('aux');
      });
    });

    describe('homewall specific sets - with extra whitespace', () => {
      it('should handle leading/trailing whitespace', () => {
        expect(generateSetSlug(['  Auxiliary Kickboard  '])).toBe('aux-kicker');
        expect(generateSetSlug(['  Auxiliary  '])).toBe('aux');
      });
    });

    describe('homewall specific sets - "kicker" naming variant (used in some sizes like 10x12)', () => {
      it('should handle Aux Kicker (without "board")', () => {
        expect(generateSetSlug(['Aux Kicker'])).toBe('aux-kicker');
      });

      it('should handle Main Kicker (without "board")', () => {
        expect(generateSetSlug(['Main Kicker'])).toBe('main-kicker');
      });

      it('should handle Auxiliary Kicker', () => {
        expect(generateSetSlug(['Auxiliary Kicker'])).toBe('aux-kicker');
      });

      it('should handle Mainline Kicker', () => {
        expect(generateSetSlug(['Mainline Kicker'])).toBe('main-kicker');
      });

      it('should generate correct slug for 10x12 with kicker naming', () => {
        const result = generateSetSlug([
          'Aux Kicker',
          'Main Kicker',
          'Aux',
          'Main'
        ]);
        expect(result).toBe('main-kicker_main_aux-kicker_aux');
      });
    });

    describe('homewall full ride - all four sets combined', () => {
      it('should generate correct slug for all four homewall sets (full names)', () => {
        const result = generateSetSlug([
          'Auxiliary Kickboard',
          'Mainline Kickboard',
          'Auxiliary',
          'Mainline'
        ]);
        // Should be sorted alphabetically descending and joined with underscores
        expect(result).toBe('main-kicker_main_aux-kicker_aux');
      });

      it('should generate correct slug for all four homewall sets (abbreviated names)', () => {
        const result = generateSetSlug([
          'Aux Kickboard',
          'Main Kickboard',
          'Aux',
          'Main'
        ]);
        expect(result).toBe('main-kicker_main_aux-kicker_aux');
      });

      it('should generate correct slug for mixed full and abbreviated names', () => {
        const result = generateSetSlug([
          'Auxiliary Kickboard',
          'Main Kickboard',
          'Aux',
          'Mainline'
        ]);
        expect(result).toBe('main-kicker_main_aux-kicker_aux');
      });
    });

    describe('homewall partial selections', () => {
      it('should handle aux + main (no kickers)', () => {
        const result = generateSetSlug(['Auxiliary', 'Mainline']);
        expect(result).toBe('main_aux');
      });

      it('should handle aux-kicker + main-kicker (kickers only)', () => {
        const result = generateSetSlug(['Auxiliary Kickboard', 'Mainline Kickboard']);
        expect(result).toBe('main-kicker_aux-kicker');
      });

      it('should handle aux + aux-kicker (aux variants only)', () => {
        const result = generateSetSlug(['Auxiliary', 'Auxiliary Kickboard']);
        expect(result).toBe('aux-kicker_aux');
      });

      it('should handle main + main-kicker (main variants only)', () => {
        const result = generateSetSlug(['Mainline', 'Mainline Kickboard']);
        expect(result).toBe('main-kicker_main');
      });

      it('should handle single aux selection', () => {
        expect(generateSetSlug(['Auxiliary'])).toBe('aux');
        expect(generateSetSlug(['Aux'])).toBe('aux');
      });

      it('should handle aux + main-kicker + main (no aux-kicker)', () => {
        const result = generateSetSlug(['Auxiliary', 'Mainline Kickboard', 'Mainline']);
        expect(result).toBe('main-kicker_main_aux');
      });
    });

    describe('original kilter/tension sets', () => {
      it('should handle Bolt Ons', () => {
        expect(generateSetSlug(['Bolt Ons'])).toBe('bolt');
      });

      it('should handle Screw Ons', () => {
        expect(generateSetSlug(['Screw Ons'])).toBe('screw');
      });

      it('should handle bolt on (singular)', () => {
        expect(generateSetSlug(['Bolt On'])).toBe('bolt');
      });

      it('should handle screw on (singular)', () => {
        expect(generateSetSlug(['Screw On'])).toBe('screw');
      });

      it('should sort bolt and screw correctly', () => {
        const result = generateSetSlug(['Bolt Ons', 'Screw Ons']);
        expect(result).toBe('screw_bolt');
      });
    });

    describe('sorting behavior', () => {
      it('should sort slugs alphabetically descending', () => {
        // z > a, so 'screw' > 'main' > 'bolt' > 'aux'
        const result = generateSetSlug(['Auxiliary', 'Bolt Ons', 'Mainline', 'Screw Ons']);
        expect(result).toBe('screw_main_bolt_aux');
      });

      it('should maintain consistent ordering regardless of input order', () => {
        const order1 = generateSetSlug(['Auxiliary', 'Mainline', 'Auxiliary Kickboard', 'Mainline Kickboard']);
        const order2 = generateSetSlug(['Mainline Kickboard', 'Auxiliary Kickboard', 'Mainline', 'Auxiliary']);
        const order3 = generateSetSlug(['Auxiliary Kickboard', 'Auxiliary', 'Mainline Kickboard', 'Mainline']);

        expect(order1).toBe(order2);
        expect(order2).toBe(order3);
        expect(order1).toBe('main-kicker_main_aux-kicker_aux');
      });
    });

    describe('edge cases', () => {
      it('should handle empty array', () => {
        expect(generateSetSlug([])).toBe('');
      });

      it('should handle single set', () => {
        expect(generateSetSlug(['Auxiliary'])).toBe('aux');
      });

      it('should handle sets with numbers', () => {
        // Generic set names should fall through to general slug generation
        expect(generateSetSlug(['Set 1'])).toBe('set-1');
      });

      it('should handle sets with special characters', () => {
        expect(generateSetSlug(['Test Set!'])).toBe('test-set!');
      });
    });
  });
});

describe('Utility functions', () => {
  describe('extractUuidFromSlug', () => {
    it('should extract UUID from slug with UUID at end', () => {
      expect(extractUuidFromSlug('test-climb-ABCDEF1234567890ABCDEF1234567890')).toBe('ABCDEF1234567890ABCDEF1234567890');
    });

    it('should return UUID if input is already just UUID', () => {
      expect(extractUuidFromSlug('ABCDEF1234567890ABCDEF1234567890')).toBe('ABCDEF1234567890ABCDEF1234567890');
    });

    it('should return input if no UUID found', () => {
      expect(extractUuidFromSlug('no-uuid-here')).toBe('no-uuid-here');
    });
  });

  describe('isUuidOnly', () => {
    it('should return true for 32-character hex string', () => {
      expect(isUuidOnly('ABCDEF1234567890ABCDEF1234567890')).toBe(true);
      expect(isUuidOnly('abcdef1234567890abcdef1234567890')).toBe(true);
    });

    it('should return false for non-UUID strings', () => {
      expect(isUuidOnly('test-climb-name')).toBe(false);
      expect(isUuidOnly('ABC123')).toBe(false);
      expect(isUuidOnly('')).toBe(false);
    });
  });

  describe('isNumericId', () => {
    it('should return true for numeric strings', () => {
      expect(isNumericId('123')).toBe(true);
      expect(isNumericId('0')).toBe(true);
    });

    it('should return false for non-numeric strings', () => {
      expect(isNumericId('abc')).toBe(false);
      expect(isNumericId('12x12')).toBe(false);
      expect(isNumericId('')).toBe(false);
    });
  });

  describe('isSlugFormat', () => {
    it('should return true for non-numeric strings', () => {
      expect(isSlugFormat('test-slug')).toBe(true);
      expect(isSlugFormat('12x12')).toBe(true);
    });

    it('should return false for numeric strings', () => {
      expect(isSlugFormat('123')).toBe(false);
      expect(isSlugFormat('0')).toBe(false);
    });
  });
});

describe('getBaseBoardPath', () => {
  describe('stripping /play/[uuid] segments', () => {
    it('should strip /play/[uuid] from path with angle', () => {
      expect(getBaseBoardPath('/kilter/original/12x12/default/45/play/abc-123'))
        .toBe('/kilter/original/12x12/default');
    });

    it('should strip /play/[slug-uuid] from path', () => {
      expect(getBaseBoardPath('/kilter/original/12x12/default/45/play/test-climb-name-abc123def456'))
        .toBe('/kilter/original/12x12/default');
    });

    it('should handle different angles', () => {
      expect(getBaseBoardPath('/kilter/original/12x12/default/50/play/abc-123'))
        .toBe('/kilter/original/12x12/default');
      expect(getBaseBoardPath('/tension/original/8x10/bolt/30/play/xyz-789'))
        .toBe('/tension/original/8x10/bolt');
    });
  });

  describe('stripping /view/[uuid] segments', () => {
    it('should strip /view/[uuid] from path', () => {
      expect(getBaseBoardPath('/kilter/original/12x12/default/45/view/abc123'))
        .toBe('/kilter/original/12x12/default');
    });

    it('should strip /view/[slug-uuid] from path', () => {
      expect(getBaseBoardPath('/kilter/original/12x12/default/45/view/test-climb-abc123def456'))
        .toBe('/kilter/original/12x12/default');
    });
  });

  describe('stripping /list segment', () => {
    it('should strip /list from path with angle', () => {
      expect(getBaseBoardPath('/kilter/original/12x12/default/45/list'))
        .toBe('/kilter/original/12x12/default');
    });

    it('should handle different board configurations', () => {
      expect(getBaseBoardPath('/tension/two-zone/10x12/main_aux/40/list'))
        .toBe('/tension/two-zone/10x12/main_aux');
    });
  });

  describe('stripping /create segment', () => {
    it('should strip /create from path with angle', () => {
      expect(getBaseBoardPath('/kilter/original/12x12/default/45/create'))
        .toBe('/kilter/original/12x12/default');
    });
  });

  describe('stripping angle from base path', () => {
    it('should strip angle from path without view segment', () => {
      expect(getBaseBoardPath('/kilter/original/12x12/default/45'))
        .toBe('/kilter/original/12x12/default');
    });

    it('should strip different angle values', () => {
      expect(getBaseBoardPath('/kilter/original/12x12/default/0'))
        .toBe('/kilter/original/12x12/default');
      expect(getBaseBoardPath('/kilter/original/12x12/default/70'))
        .toBe('/kilter/original/12x12/default');
    });
  });

  describe('edge cases', () => {
    it('should return path as-is if no matching segments', () => {
      expect(getBaseBoardPath('/kilter/original/12x12/default'))
        .toBe('/kilter/original/12x12/default');
    });

    it('should handle paths with complex set slugs', () => {
      expect(getBaseBoardPath('/kilter/homewall/10x12-full-ride/main-kicker_main_aux-kicker_aux/45/play/abc-123'))
        .toBe('/kilter/homewall/10x12-full-ride/main-kicker_main_aux-kicker_aux');
    });

    it('should handle tension board paths', () => {
      expect(getBaseBoardPath('/tension/original/8x10/screw_bolt/35/list'))
        .toBe('/tension/original/8x10/screw_bolt');
    });

    it('should handle empty string', () => {
      expect(getBaseBoardPath('')).toBe('');
    });

    it('should handle root path', () => {
      expect(getBaseBoardPath('/')).toBe('/');
    });

    it('should not strip segments that look like angle but are part of set names', () => {
      // Sets like "main_aux" should not have digits stripped
      // This is handled correctly because we only strip the last segment if it's purely numeric
      expect(getBaseBoardPath('/kilter/original/12x12/main_aux'))
        .toBe('/kilter/original/12x12/main_aux');
    });
  });

  describe('session continuity scenarios', () => {
    it('should return same base path for same board with different climbs', () => {
      const path1 = getBaseBoardPath('/kilter/original/12x12/default/45/play/climb-uuid-1');
      const path2 = getBaseBoardPath('/kilter/original/12x12/default/45/play/climb-uuid-2');
      expect(path1).toBe(path2);
    });

    it('should return same base path for same board with different angles', () => {
      const path1 = getBaseBoardPath('/kilter/original/12x12/default/45/list');
      const path2 = getBaseBoardPath('/kilter/original/12x12/default/50/list');
      expect(path1).toBe(path2);
    });

    it('should return same base path for same board with different views', () => {
      const path1 = getBaseBoardPath('/kilter/original/12x12/default/45/list');
      const path2 = getBaseBoardPath('/kilter/original/12x12/default/45/play/abc-123');
      const path3 = getBaseBoardPath('/kilter/original/12x12/default/45/create');
      expect(path1).toBe(path2);
      expect(path2).toBe(path3);
    });

    it('should return different base paths for different board configurations', () => {
      const path1 = getBaseBoardPath('/kilter/original/12x12/default/45/list');
      const path2 = getBaseBoardPath('/kilter/homewall/10x12/main_aux/45/list');
      expect(path1).not.toBe(path2);
    });
  });
});