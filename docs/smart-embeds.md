# Smart Embeds (Open Graph & Twitter Cards)

This document describes how smart embeds work in Boardsesh. Smart embeds allow rich previews when links are shared on social media platforms like Twitter, Facebook, iMessage, Slack, Discord, and others.

## Table of Contents

1. [Overview](#overview)
2. [Implementation Architecture](#implementation-architecture)
3. [Route-Specific Embeds](#route-specific-embeds)
4. [Dynamic OG Image Generation](#dynamic-og-image-generation)
5. [Adding Smart Embeds to New Routes](#adding-smart-embeds-to-new-routes)
6. [Testing Embeds](#testing-embeds)

---

## Overview

Smart embeds use two metadata standards:

- **Open Graph (OG)**: Used by Facebook, iMessage, Slack, Discord, and most platforms
- **Twitter Cards**: Used by Twitter/X for enhanced previews

When a URL is shared, the platform fetches the page and extracts metadata from `<meta>` tags to display a rich preview including title, description, and optionally an image.

### What Users See

When sharing a climb link:
- **Title**: "Climb Name - V5 | Boardsesh"
- **Description**: "Climb Name - V5 by SetterName. Quality: 4.5/5. Ascents: 123"
- **Image**: A dynamically generated image showing the board with lit-up holds

---

## Implementation Architecture

### Next.js Metadata API

Boardsesh uses Next.js 15's metadata API for generating embed metadata. There are two patterns:

#### Static Metadata (for pages with fixed content)

```typescript
// Export a constant metadata object
export const metadata: Metadata = {
  title: 'About | Boardsesh',
  description: 'Why we built Boardsesh...',
  openGraph: {
    title: 'About Boardsesh',
    description: 'Why we built Boardsesh...',
    type: 'website',
    url: 'https://boardsesh.com/about',
  },
  twitter: {
    card: 'summary',
    title: 'About Boardsesh',
    description: 'Why we built Boardsesh...',
  },
};
```

#### Dynamic Metadata (for pages with dynamic content)

```typescript
// Export an async function that returns metadata
export async function generateMetadata(props: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const params = await props.params;

  // Fetch data needed for metadata
  const data = await fetchData(params);

  return {
    title: `${data.name} | Boardsesh`,
    description: data.description,
    openGraph: { ... },
    twitter: { ... },
  };
}
```

### Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Social Platform Request                        │
│                (Twitter, Facebook, Slack, etc.)                   │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Next.js Server                              │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ generateMetadata() or static metadata export                 │ │
│  │  - Parse route params (slugs → numeric IDs)                  │ │
│  │  - Fetch board details, climb info, user data                │ │
│  │  - Construct OG image URL with query params                  │ │
│  │  - Return Metadata object                                    │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                               │                                   │
│                               ▼                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Next.js renders <meta> tags in <head>                       │ │
│  │  - <meta property="og:title" content="..." />               │ │
│  │  - <meta property="og:description" content="..." />         │ │
│  │  - <meta property="og:image" content="..." />               │ │
│  │  - <meta name="twitter:card" content="summary_large_image"/>│ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│              Social Platform Fetches OG Image                     │
│              (only if og:image URL is present)                    │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    /api/og/climb Endpoint                         │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Edge Runtime (Vercel @vercel/og)                            │ │
│  │  - Extract params from query string                          │ │
│  │  - Fetch climb data and board details                        │ │
│  │  - Render board with lit-up holds                            │ │
│  │  - Return 1200x630px PNG image                               │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Route-Specific Embeds

### Pages with Dynamic OG Images

| Route | Title Format | OG Image |
|-------|--------------|----------|
| `/[board]/[layout]/[size]/[sets]/[angle]/view/[climb]` | "Climb Name - V5 \| Boardsesh" | Dynamic board visualization |
| `/[board]/[layout]/[size]/[sets]/[angle]/play/[climb]` | "Climb Name - V5 \| Play Mode \| Boardsesh" | Dynamic board visualization |

### Pages with Dynamic Metadata (No Custom Image)

| Route | Title Format | Description |
|-------|--------------|-------------|
| `/[board]/[layout]/[size]/[sets]/[angle]/list` | "Kilter Original 12x12 Climbs \| Boardsesh" | Browse climbs on board at angle |
| `/[board]/[layout]/[size]/[sets]/[angle]/create` | "Create Climb on Kilter Original 12x12 \| Boardsesh" | Create a new climb on board |
| `/crusher/[user_id]` | "Username's Profile \| Boardsesh" | View climbing stats and progress |

### Pages with Static Metadata

| Route | Title | Description |
|-------|-------|-------------|
| `/` (home) | "Boardsesh - LED Climbing Board Control" | Control your Kilter or Tension LED climbing board |
| `/about` | "About \| Boardsesh" | Why we built Boardsesh - open source alternative |

---

## Dynamic OG Image Generation

### Endpoint: `/api/og/climb`

The climb OG image endpoint generates a 1200x630px image showing:
- The board background with all image layers
- Lit-up holds matching the climb
- Climb metadata (name, grade, setter, angle)

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `board_name` | string | Yes | "kilter" or "tension" |
| `layout_id` | number | Yes | Layout ID |
| `size_id` | number | Yes | Size ID |
| `set_ids` | string | Yes | Comma-separated set IDs |
| `angle` | number | Yes | Board angle in degrees |
| `climb_uuid` | string | Yes | Climb UUID |

#### Example URL

```
https://boardsesh.com/api/og/climb?board_name=kilter&layout_id=1&size_id=10&set_ids=1,2&angle=40&climb_uuid=abc-123
```

#### Implementation Details

```typescript
// packages/web/app/api/og/climb/route.tsx

export const runtime = 'edge'; // Uses Edge Runtime for global low-latency

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // Extract parameters
  const board_name = searchParams.get('board_name');
  // ... other params

  // Parse and fetch data
  const parsedParams = await parseBoardRouteParamsWithSlugs({...});
  const [boardDetails, currentClimb] = await Promise.all([
    getBoardDetails(parsedParams),
    getClimb(parsedParams),
  ]);

  // Render image with @vercel/og
  return new ImageResponse(
    (
      <div style={{ /* container styles */ }}>
        {/* Board with lit holds */}
        {/* Climb info text */}
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
```

### Image Rendering

The OG image renders:
1. **Board background**: All image layers from `boardDetails.images_to_holds`
2. **SVG overlay**: Circles for lit-up holds with correct colors
3. **Text panel**: Climb name, grade, setter, and angle

Hold colors match the climb's frame data, and mirrored climbs are handled correctly.

---

## Adding Smart Embeds to New Routes

### Step 1: Determine Metadata Type

- **Static**: Use `export const metadata` for pages without dynamic content
- **Dynamic**: Use `export async function generateMetadata()` for pages with route-specific data

### Step 2: Implement Metadata

```typescript
import { Metadata } from 'next';

// For dynamic routes
export async function generateMetadata(props: {
  params: Promise<YourRouteParams>;
}): Promise<Metadata> {
  const params = await props.params;

  try {
    // Parse slug params to numeric IDs if needed
    const parsedParams = await parseBoardRouteParamsWithSlugs(params);

    // Fetch data
    const data = await fetchYourData(parsedParams);

    // Construct metadata
    const title = `${data.name} | Boardsesh`;
    const description = `Your description with ${data.details}`;

    return {
      title,
      description,
      openGraph: {
        title: data.name,
        description,
        type: 'website',
        url: `https://boardsesh.com/your-path`,
        // Optional: Add custom OG image
        images: [
          {
            url: ogImageUrl.toString(),
            width: 1200,
            height: 630,
            alt: 'Image description',
          },
        ],
      },
      twitter: {
        card: 'summary_large_image', // or 'summary' for smaller image
        title: data.name,
        description,
        images: [ogImageUrl.toString()],
      },
    };
  } catch {
    // Fallback metadata if data fetching fails
    return {
      title: 'Fallback Title | Boardsesh',
      description: 'Fallback description',
    };
  }
}
```

### Step 3: Add OG Image (Optional)

For routes that need custom OG images:

1. Create a new endpoint in `packages/web/app/api/og/your-route/route.tsx`
2. Use `@vercel/og` ImageResponse
3. Use `export const runtime = 'edge'` for best performance

### Common Patterns

#### Parsing Slug Parameters

Many routes use slug-based URLs that need conversion to numeric IDs:

```typescript
const hasNumericParams = [params.layout_id, params.size_id, params.set_ids].some((param) =>
  param.includes(',') ? param.split(',').every((id) => /^\d+$/.test(id.trim())) : /^\d+$/.test(param),
);

let parsedParams;
if (hasNumericParams) {
  parsedParams = parseBoardRouteParams(params);
} else {
  parsedParams = await parseBoardRouteParamsWithSlugs(params);
}
```

#### Generating Board Titles

```typescript
function generateBoardTitle(boardDetails: BoardDetails): string {
  const parts: string[] = [];

  const boardName = boardDetails.board_name.charAt(0).toUpperCase() + boardDetails.board_name.slice(1);
  parts.push(boardName);

  if (boardDetails.layout_name) {
    const layoutName = boardDetails.layout_name
      .replace(new RegExp(`^${boardDetails.board_name}\\s*(board)?\\s*`, 'i'), '')
      .trim();
    if (layoutName) parts.push(layoutName);
  }

  if (boardDetails.size_name) {
    const sizeMatch = boardDetails.size_name.match(/(\d+)\s*x\s*(\d+)/i);
    if (sizeMatch) {
      parts.push(`${sizeMatch[1]}x${sizeMatch[2]}`);
    } else {
      parts.push(boardDetails.size_name);
    }
  }

  return parts.join(' ');
}
```

---

## Testing Embeds

### Local Testing

1. Use browser dev tools to inspect `<meta>` tags in page source
2. Check that `og:title`, `og:description`, `og:image` are present

### Production Testing Tools

- **Twitter Card Validator**: https://cards-dev.twitter.com/validator
- **Facebook Sharing Debugger**: https://developers.facebook.com/tools/debug/
- **LinkedIn Post Inspector**: https://www.linkedin.com/post-inspector/
- **OpenGraph.xyz**: https://www.opengraph.xyz/

### Debugging OG Images

Test the OG image endpoint directly:

```bash
# Test climb OG image
curl "https://boardsesh.com/api/og/climb?board_name=kilter&layout_id=1&size_id=10&set_ids=1,2&angle=40&climb_uuid=YOUR_UUID"
```

Common issues:
- Missing parameters return 400 error
- Invalid climb UUID returns error message in image
- Large images may timeout (keep under 10s generation time)

---

## Related Files

### Metadata Implementation

- `packages/web/app/page.tsx` - Home page static metadata
- `packages/web/app/about/page.tsx` - About page static metadata
- `packages/web/app/crusher/[user_id]/page.tsx` - Profile dynamic metadata
- `packages/web/app/[board_name]/[layout_id]/[size_id]/[set_ids]/[angle]/view/[climb_uuid]/page.tsx` - Climb view dynamic metadata
- `packages/web/app/[board_name]/[layout_id]/[size_id]/[set_ids]/[angle]/play/[climb_uuid]/page.tsx` - Play mode dynamic metadata
- `packages/web/app/[board_name]/[layout_id]/[size_id]/[set_ids]/[angle]/list/page.tsx` - List page dynamic metadata
- `packages/web/app/[board_name]/[layout_id]/[size_id]/[set_ids]/[angle]/create/page.tsx` - Create page dynamic metadata

### OG Image Generation

- `packages/web/app/api/og/climb/route.tsx` - Climb OG image endpoint

### Utilities

- `packages/web/app/lib/url-utils.ts` - URL construction helpers
- `packages/web/app/lib/url-utils.server.ts` - Server-side slug parsing
- `packages/web/app/lib/__generated__/product-sizes-data.ts` - Board details fetching
- `packages/web/app/lib/data/queries.ts` - Climb data fetching
