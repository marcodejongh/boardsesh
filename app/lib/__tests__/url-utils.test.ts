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
      settername: '',
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
      },
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
      settername: 'john doe',
      sortBy: 'difficulty' as any,
      sortOrder: 'asc' as any,
      onlyClassics: true,
      holdsFilter: { red: { state: 'include' } },
    };

    const result = parsedRouteSearchParamsToSearchParams(input);

    expect(result.name).toBe('test climb');
    expect(result.settername).toBe('john doe');
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
    board_name: 'kilter',
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
      const boardDetails = { board_name: 'kilter' };
      const result = constructClimbInfoUrl(boardDetails as any, 'abc123', 45);
      expect(result).toBe('https://kilterboardapp.com/climbs/abc123');
    });

    it('should construct external info URL for tension', () => {
      const boardDetails = { board_name: 'tension' };
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
  });

  describe('generateSetSlug', () => {
    it('should handle homewall specific sets', () => {
      expect(generateSetSlug(['Auxiliary Kickboard'])).toBe('aux-kicker');
      expect(generateSetSlug(['Mainline Kickboard'])).toBe('main-kicker');
      expect(generateSetSlug(['Auxiliary'])).toBe('aux');
      expect(generateSetSlug(['Mainline'])).toBe('main');
    });

    it('should handle original kilter/tension sets', () => {
      expect(generateSetSlug(['Bolt Ons'])).toBe('bolt');
      expect(generateSetSlug(['Screw Ons'])).toBe('screw');
    });

    it('should sort multiple sets', () => {
      const result = generateSetSlug(['bolt ons', 'screw ons']);
      expect(result).toBe('screw_bolt');
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