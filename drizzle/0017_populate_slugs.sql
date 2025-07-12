-- Populate slug columns with computed values from name fields

-- Update kilter_layouts slugs
UPDATE kilter_layouts 
SET slug = (
  CASE 
    -- Handle Tension board specific cases first
    WHEN LOWER(TRIM(REGEXP_REPLACE(REGEXP_REPLACE(name, '^(kilter|tension|decoy)\s+board\s+', '', 'gi'), '[^\w\s-]', '', 'g'))) = 'original-layout'
      THEN 'original'
    -- Replace numbers with words for better readability  
    WHEN LOWER(TRIM(REGEXP_REPLACE(REGEXP_REPLACE(name, '^(kilter|tension|decoy)\s+board\s+', '', 'gi'), '[^\w\s-]', '', 'g'))) LIKE '2-%'
      THEN REGEXP_REPLACE(LOWER(TRIM(REGEXP_REPLACE(REGEXP_REPLACE(name, '^(kilter|tension|decoy)\s+board\s+', '', 'gi'), '[^\w\s-]', '', 'g'))), '^2-', 'two-', 'g')
    ELSE 
      -- Standard slug generation
      TRIM(REGEXP_REPLACE(
        REGEXP_REPLACE(
          REGEXP_REPLACE(
            REGEXP_REPLACE(
              LOWER(TRIM(REGEXP_REPLACE(name, '^(kilter|tension|decoy)\s+board\s+', '', 'gi'))),
              '[^\w\s-]', '', 'g'
            ),
            '\s+', '-', 'g'
          ),
          '-+', '-', 'g'
        ),
        '^-|-$', '', 'g'
      ))
  END
)
WHERE name IS NOT NULL AND slug IS NULL;

-- Update tension_layouts slugs
UPDATE tension_layouts 
SET slug = (
  CASE 
    -- Handle Tension board specific cases first
    WHEN LOWER(TRIM(REGEXP_REPLACE(REGEXP_REPLACE(name, '^(kilter|tension|decoy)\s+board\s+', '', 'gi'), '[^\w\s-]', '', 'g'))) = 'original-layout'
      THEN 'original'
    -- Replace numbers with words for better readability  
    WHEN LOWER(TRIM(REGEXP_REPLACE(REGEXP_REPLACE(name, '^(kilter|tension|decoy)\s+board\s+', '', 'gi'), '[^\w\s-]', '', 'g'))) LIKE '2-%'
      THEN REGEXP_REPLACE(LOWER(TRIM(REGEXP_REPLACE(REGEXP_REPLACE(name, '^(kilter|tension|decoy)\s+board\s+', '', 'gi'), '[^\w\s-]', '', 'g'))), '^2-', 'two-', 'g')
    ELSE 
      -- Standard slug generation
      TRIM(REGEXP_REPLACE(
        REGEXP_REPLACE(
          REGEXP_REPLACE(
            REGEXP_REPLACE(
              LOWER(TRIM(REGEXP_REPLACE(name, '^(kilter|tension|decoy)\s+board\s+', '', 'gi'))),
              '[^\w\s-]', '', 'g'
            ),
            '\s+', '-', 'g'
          ),
          '-+', '-', 'g'
        ),
        '^-|-$', '', 'g'
      ))
  END
)
WHERE name IS NOT NULL AND slug IS NULL;

-- Update kilter_product_sizes slugs
UPDATE kilter_product_sizes 
SET slug = (
  CASE 
    -- Extract size dimensions (e.g., "12 x 12 Commercial" -> "12x12")
    WHEN name ~ '\d+\s*x\s*\d+'
      THEN REGEXP_REPLACE(name, '.*?(\d+)\s*x\s*(\d+).*', '\1x\2', 'i')
    ELSE 
      -- Fallback to general slug generation
      TRIM(REGEXP_REPLACE(
        REGEXP_REPLACE(
          REGEXP_REPLACE(
            REGEXP_REPLACE(
              LOWER(TRIM(name)),
              '[^\w\s-]', '', 'g'
            ),
            '\s+', '-', 'g'
          ),
          '-+', '-', 'g'
        ),
        '^-|-$', '', 'g'
      ))
  END
)
WHERE name IS NOT NULL AND slug IS NULL;

-- Update tension_product_sizes slugs
UPDATE tension_product_sizes 
SET slug = (
  CASE 
    -- Extract size dimensions (e.g., "12 x 12 Commercial" -> "12x12")
    WHEN name ~ '\d+\s*x\s*\d+'
      THEN REGEXP_REPLACE(name, '.*?(\d+)\s*x\s*(\d+).*', '\1x\2', 'i')
    ELSE 
      -- Fallback to general slug generation
      TRIM(REGEXP_REPLACE(
        REGEXP_REPLACE(
          REGEXP_REPLACE(
            REGEXP_REPLACE(
              LOWER(TRIM(name)),
              '[^\w\s-]', '', 'g'
            ),
            '\s+', '-', 'g'
          ),
          '-+', '-', 'g'
        ),
        '^-|-$', '', 'g'
      ))
  END
)
WHERE name IS NOT NULL AND slug IS NULL;

-- Update kilter_sets slugs
UPDATE kilter_sets 
SET slug = (
  CASE 
    -- Handle homewall-specific set names
    WHEN LOWER(TRIM(name)) LIKE '%auxiliary%' AND LOWER(TRIM(name)) LIKE '%kickboard%'
      THEN 'aux-kicker'
    WHEN LOWER(TRIM(name)) LIKE '%mainline%' AND LOWER(TRIM(name)) LIKE '%kickboard%'
      THEN 'main-kicker'
    WHEN LOWER(TRIM(name)) LIKE '%auxiliary%'
      THEN 'aux'
    WHEN LOWER(TRIM(name)) LIKE '%mainline%'
      THEN 'main'
    -- Handle original kilter/tension set names  
    WHEN LOWER(TRIM(name)) LIKE 'bolt%'
      THEN 'bolt'
    WHEN LOWER(TRIM(name)) LIKE 'screw%'
      THEN 'screw'
    ELSE 
      -- Standard processing: remove "on"/"ons" suffix and replace spaces
      TRIM(REGEXP_REPLACE(
        REGEXP_REPLACE(
          LOWER(TRIM(name)),
          '\s+ons?$', '', 'gi'
        ),
        '\s+', '-', 'g'
      ))
  END
)
WHERE name IS NOT NULL AND slug IS NULL;

-- Update tension_sets slugs
UPDATE tension_sets 
SET slug = (
  CASE 
    -- Handle homewall-specific set names
    WHEN LOWER(TRIM(name)) LIKE '%auxiliary%' AND LOWER(TRIM(name)) LIKE '%kickboard%'
      THEN 'aux-kicker'
    WHEN LOWER(TRIM(name)) LIKE '%mainline%' AND LOWER(TRIM(name)) LIKE '%kickboard%'
      THEN 'main-kicker'
    WHEN LOWER(TRIM(name)) LIKE '%auxiliary%'
      THEN 'aux'
    WHEN LOWER(TRIM(name)) LIKE '%mainline%'
      THEN 'main'
    -- Handle original kilter/tension set names  
    WHEN LOWER(TRIM(name)) LIKE 'bolt%'
      THEN 'bolt'
    WHEN LOWER(TRIM(name)) LIKE 'screw%'
      THEN 'screw'
    ELSE 
      -- Standard processing: remove "on"/"ons" suffix and replace spaces
      TRIM(REGEXP_REPLACE(
        REGEXP_REPLACE(
          LOWER(TRIM(name)),
          '\s+ons?$', '', 'gi'
        ),
        '\s+', '-', 'g'
      ))
  END
)
WHERE name IS NOT NULL AND slug IS NULL;