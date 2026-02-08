# AI Design Guidelines

A comprehensive, self-contained reference for AI agents redesigning Boardsesh components to match the established design language. All values in this document are sourced from the live codebase and should be treated as the single source of truth alongside `packages/web/app/theme/theme-config.ts`.

---

## Design Philosophy

Boardsesh follows a **modern, mobile-first aesthetic** inspired by apps like Spotify and Airbnb. The core principles:

- **Mobile-first**: Design for touch and small screens first, enhance for desktop
- **Progressive disclosure**: Show summary information by default, reveal detail on interaction (accordion cards, swipeable drawers, expandable panels)
- **Gestural interaction**: Swipe-to-reveal actions, drag-to-dismiss drawers, swipe-to-navigate between items
- **Warm organic palette**: A dusty rose primary with muted sage/brick accents rather than saturated primaries
- **Minimal visual weight**: Subtle shadows, thin borders, and generous whitespace over heavy decoration

---

## Design Tokens Reference

All tokens live in `packages/web/app/theme/theme-config.ts` and are exposed as CSS custom properties in `packages/web/app/components/index.css`.

### Colors

| Token | Value | CSS Variable | Usage |
|-------|-------|-------------|-------|
| `colors.primary` | `#8C4A52` | `--color-primary` | Brand accent, active states, selected borders |
| `colors.primaryHover` | `#7A3F47` | `--color-primary-hover` | Hover state for primary elements |
| `colors.primaryActive` | `#6B353D` | -- | Pressed state for primary elements |
| `colors.secondary` | `#6B7280` | -- | Info/secondary actions |
| `colors.success` | `#6B9080` | `--color-success` | Completions, queue-added confirmation |
| `colors.successHover` | `#5A7A6C` | `--color-success-hover` | Success hover |
| `colors.successBg` | `#EFF5F2` | `--color-success-bg` | Success background tint |
| `colors.warning` | `#C4943C` | `--color-warning` | Warnings, caution states |
| `colors.warningBg` | `#FAF5EC` | `--color-warning-bg` | Warning background tint |
| `colors.error` | `#B8524C` | `--color-error` | Favorites (filled heart), removals, destructive |
| `colors.errorBg` | `#F9EFEE` | `--color-error-bg` | Error background tint |
| `colors.purple` | `#7C3AED` | -- | Mirror button |
| `colors.purpleHover` | `#6D28D9` | -- | Mirror button hover |
| `colors.amber` | `#FBBF24` | -- | Flash/benchmark badges |
| `colors.pink` | `#EC4899` | -- | Finish holds in climb creation |
| `colors.logoGreen` | `#5DBE94` | -- | Logo accent green |
| `colors.logoRose` | `#C75B64` | -- | Logo accent rose |

### Neutral Palette

| Token | Value | CSS Variable | Usage |
|-------|-------|-------------|-------|
| `neutral[50]` | `#F9FAFB` | `--neutral-50` | Pill backgrounds, switch group backgrounds |
| `neutral[100]` | `#F3F4F6` | `--neutral-100` | Hover backgrounds, active press |
| `neutral[200]` | `#E5E7EB` | `--neutral-200` | Borders, dividers, pill borders |
| `neutral[300]` | `#D1D5DB` | `--neutral-300` | Drag handles, logged-out avatars, recent pill borders |
| `neutral[400]` | `#9CA3AF` | `--neutral-400` | Collapsed labels, pill icons, secondary text |
| `neutral[500]` | `#6B7280` | `--neutral-500` | Pill text, meta text, sort toggles |
| `neutral[600]` | `#4B5563` | `--neutral-600` | Menu item icons, recent pill text |
| `neutral[700]` | `#374151` | `--neutral-700` | -- |
| `neutral[800]` | `#1F2937` | `--neutral-800` | Primary text |
| `neutral[900]` | `#111827` | `--neutral-900` | Headlines, accordion active labels, summary values |

### Semantic Colors

| Token | Value | CSS Variable | Usage |
|-------|-------|-------------|-------|
| `semantic.selected` | `#F7F2F3` | `--semantic-selected` | Selected item background (rose tint) |
| `semantic.selectedHover` | `#EFE6E8` | `--semantic-selected-hover` | Selected item hover |
| `semantic.selectedLight` | `rgba(140, 74, 82, 0.06)` | `--semantic-selected-light` | Very subtle rose highlight |
| `semantic.selectedBorder` | `#8C4A52` | `--semantic-selected-border` | Matches primary |
| `semantic.background` | `#F9FAFB` | `--semantic-background` | Page background |
| `semantic.surface` | `#FFFFFF` | `--semantic-surface` | Card/surface backgrounds |
| `semantic.surfaceElevated` | `#FFFFFF` | -- | Elevated surfaces |
| `semantic.surfaceOverlay` | `rgba(255, 255, 255, 0.95)` | `--semantic-surface-overlay` | Semi-transparent overlays |

### Spacing Scale

Base unit: **4px**. All spacing uses this scale.

| Token | Value | Common Use |
|-------|-------|-----------|
| `spacing[0]` | `0` | -- |
| `spacing[1]` | `4px` | Tight gaps, icon margins |
| `spacing[2]` | `8px` | Form field gaps, small padding |
| `spacing[3]` | `12px` | List item padding, medium gaps |
| `spacing[4]` | `16px` | Standard padding, panel content gaps |
| `spacing[5]` | `20px` | -- |
| `spacing[6]` | `24px` | Drawer header/body padding, section padding |
| `spacing[8]` | `32px` | Large section spacing |
| `spacing[10]` | `40px` | -- |
| `spacing[12]` | `48px` | Menu item height, button height |
| `spacing[16]` | `64px` | Thumbnail width |

### Typography

**Font Stack:**
```
-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif
```

| Token | Value | Use |
|-------|-------|-----|
| `fontSize.xs` | `12px` | Captions, meta text, section labels, recent pills |
| `fontSize.sm` | `14px` | Body secondary, pill text, collapsed labels, difficulty text |
| `fontSize.base` | `16px` | Body primary, menu items, form inputs |
| `fontSize.lg` | `18px` | User name in profile |
| `fontSize.xl` | `20px` | Climb name in list items, section titles |
| `fontSize['2xl']` | `24px` | Grade display in list items |
| `fontSize['3xl']` | `30px` | Large display text |

| Token | Value | Use |
|-------|-------|-----|
| `fontWeight.normal` | `400` | Body text, collapsed labels |
| `fontWeight.medium` | `500` | Summary values, medium emphasis |
| `fontWeight.semibold` | `600` | Titles, drawer headers, section labels, user names |
| `fontWeight.bold` | `700` | Grade display, active accordion labels |

| Token | Value |
|-------|-------|
| `lineHeight.tight` | `1.25` |
| `lineHeight.normal` | `1.5` |
| `lineHeight.relaxed` | `1.75` |

### Border Radius

| Token | Value | Use |
|-------|-------|-----|
| `borderRadius.none` | `0` | -- |
| `borderRadius.sm` | `4px` | Grade select, small inputs |
| `borderRadius.md` | `8px` | Menu items, switch groups, user drawer |
| `borderRadius.lg` | `12px` | Section cards, switch groups, search buttons |
| `borderRadius.xl` | `16px` | Accordion section cards |
| `borderRadius.full` | `9999px` | Pills (search pills, recent pills, filter pills) |

### Shadows

| Token | Value | Use |
|-------|-------|-----|
| `shadows.xs` | `0 1px 2px 0 rgba(0, 0, 0, 0.05)` | Subtle elevation |
| `shadows.sm` | `0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)` | Default card shadow, pill hover |
| `shadows.md` | `0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)` | Hover-elevated cards |
| `shadows.lg` | `0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)` | Modals, elevated panels |
| `shadows.xl` | `0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)` | Top-level overlays |
| `shadows.inner` | `inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)` | Inset depth |

### Transitions

| Token | Value | Use |
|-------|-------|-----|
| `transitions.fast` | `150ms ease` | Hovers, tab color changes, snap-backs |
| `transitions.normal` | `200ms ease` | Fades, summary opacity, snap-backs |
| `transitions.slow` | `300ms ease` | Drawers, panels, swipe exits |

### Z-Index Scale

| Token | Value |
|-------|-------|
| `zIndex.dropdown` | `1000` |
| `zIndex.sticky` | `1020` |
| `zIndex.fixed` | `1030` |
| `zIndex.modal` | `1040` |
| `zIndex.popover` | `1050` |
| `zIndex.tooltip` | `1060` |

---

## Color Usage Rules

### Primary Rose (`#8C4A52`)

- Brand accent in headers and navigation
- Active tab indicator in bottom tab bar
- Selected item borders (`semantic.selectedBorder`)
- Active indicator dots on pills (6px circle)
- Avatar background for logged-in users
- Queue badge background
- Swipe-to-reveal left action background (favorite)

### Success Green (`#6B9080`)

- Tick badge when user has a successful ascent
- Queue-added confirmation icon (`CheckCircleOutlined`)
- Temporary "recently added" state (5-second cooldown)

### Error Red (`#B8524C`)

- Filled favorite heart icon
- Tick badge when no successful ascent
- Logout menu item text
- Swipe-to-reveal right action background (queue add) in some contexts
- Destructive action confirmation

### Neutrals for Text Hierarchy

- **`neutral[900]`** (`#111827`): Headlines, active accordion labels, summary values
- **`neutral[800]`** (`#1F2937`): Primary body text
- **`neutral[600]`** (`#4B5563`): Menu item icons, recent pill text
- **`neutral[500]`** (`#6B7280`): Pill body text, meta information, sort toggles
- **`neutral[400]`** (`#9CA3AF`): Collapsed accordion labels, pill icons, inactive tab icons, placeholder text
- **`neutral[300]`** (`#D1D5DB`): Drag handles, logged-out avatar background
- **`neutral[200]`** (`#E5E7EB`): All borders and dividers
- **`neutral[100]`** (`#F3F4F6`): Hover backgrounds
- **`neutral[50]`** (`#F9FAFB`): Pill backgrounds, switch group backgrounds

### Grade Colors

Climbing difficulty is represented by a spectrum from yellow through red to purple (sourced from `packages/web/app/lib/grade-colors.ts`):

- **V0-V2**: Yellow to orange (`#FFEB3B` to `#FF9800`)
- **V3-V4**: Deep orange to red-orange (`#FF7043` to `#FF5722`)
- **V5-V6**: Red spectrum (`#F44336` to `#E53935`)
- **V7-V10**: Dark red to red-purple (`#D32F2F` to `#A11B4A`)
- **V11+**: Purple spectrum (`#9C27B0` to `#2A0054`)

**Grade utility functions** (from `packages/web/app/lib/grade-colors.ts`):

| Function | Returns | Use |
|----------|---------|-----|
| `getGradeColor(difficulty)` | Hex color string | Direct grade color for text/badges |
| `getGradeTintColor(difficulty, 'default')` | Light HSL: `hsl(hue, 30%, 88%)` | Queue bar backgrounds, card tints |
| `getGradeTintColor(difficulty, 'light')` | Lighter HSL: `hsl(hue, 20%, 94%)` | List item selected backgrounds |
| `getSoftGradeColor(difficulty)` | Muted HSL: `hsl(hue, 72%, 44%)` | Large/bold grade text in list views |
| `getGradeTextColor(gradeColor)` | `#000000` or `#FFFFFF` | Contrast text over grade-colored backgrounds |

### Semantic Selected Tints

- **`semantic.selected`** (`#F7F2F3`): Selected list item background (subtle rose)
- **`semantic.selectedHover`** (`#EFE6E8`): Selected item hover state
- **`semantic.selectedLight`** (`rgba(140, 74, 82, 0.06)`): Ultra-subtle highlight
- Grade-tinted backgrounds override `semantic.selected` when a climb is selected (uses `getGradeTintColor(difficulty, 'light')`)

---

## Typography Hierarchy

### Display Grade
```css
font-size: 24px;       /* fontSize['2xl'] */
font-weight: 700;      /* fontWeight.bold */
color: <grade-color>;  /* from getGradeColor() or getSoftGradeColor() */
```

### Section Title
```css
font-size: 20px;       /* fontSize.xl */
font-weight: 600;      /* fontWeight.semibold */
color: var(--neutral-900);
```

### Active Accordion Label
```css
font-size: 22px;       /* custom, transitions from 14px */
font-weight: 700;      /* fontWeight.bold */
color: var(--neutral-900);
line-height: 1.2;
transition: font-size 250ms ease, color 250ms ease;
```

### Body Primary
```css
font-size: 16px;       /* fontSize.base */
font-weight: 400;      /* fontWeight.normal */
color: var(--neutral-800);
```

### Body Secondary
```css
font-size: 14px;       /* fontSize.sm */
font-weight: 400;      /* fontWeight.normal */
color: var(--neutral-500);
```

### Meta / Caption
```css
font-size: 12px;       /* fontSize.xs */
font-weight: 400;      /* fontWeight.normal */
color: var(--neutral-500);
```

### Section Label (Uppercase)
```css
font-size: 12px;       /* fontSize.xs */
font-weight: 600;      /* fontWeight.semibold */
text-transform: uppercase;
letter-spacing: 0.5px;
color: var(--neutral-500);
```

### Menu Item
```css
font-size: 15px;       /* between sm and base */
font-weight: 400;
color: inherit;
```

### Tab Label
```css
font-size: 10px;
line-height: 1;
margin-top: 2px;
```

---

## Core UX Patterns

### 1. Swipeable Drawers

Bottom-sheet drawers are the primary container for detail views and forms.

**Structure:**
```
SwipeableDrawer (MUI)
├── Drag Handle Zone (mobile only)
│   └── Horizontal bar: 36px x 4px, border-radius 2px, neutral-300
├── Header
│   ├── Title (h6, semibold, base size)
│   ├── Extra controls (right-aligned)
│   └── Close button (desktop only)
├── Body (padding: 24px)
└── Footer (optional, border-top: 1px solid neutral-200)
```

**Responsive behavior:**
- **Mobile (<768px)**: Drag handle visible, close button hidden, swipe-to-dismiss enabled
- **Desktop (>=768px)**: Drag handle hidden, close button visible, no swipe-to-dismiss

**Props pattern:**
- `height`: Default `70vh`, use `auto` for forms
- `keepMounted`: Use for performance when drawer has heavy content
- `disablePortal`: Use for nested drawers
- `placement`: `'bottom'` (default), `'left'`, `'right'`, `'top'`

**Header padding:** `16px 24px` with `border-bottom: 1px solid var(--neutral-200)`.

### 2. Swipe-to-Reveal List Items

List items support horizontal swiping to reveal action panels behind them.

**Configuration:**
- Maximum swipe distance: `120px`
- Action trigger threshold: `100px`
- Direction detection: First `10px` of touch movement determines horizontal vs. vertical
- DOM-direct manipulation during drag (no React state updates for 60fps performance)
- Snap-back animation: `150ms ease`

**Action panels:**
- Left panel (swipe right to reveal): Primary rose background (`#8C4A52`), white icon
- Right panel (swipe left to reveal): Error red background (`#B8524C`), white icon
- Icon size: `20px`
- Container: `overflow: hidden` to constrain animation

**Item layout:**
```
[Thumbnail 64px] [Text Column: name (20px semibold) + subtitle (12px)] [Grade (24px bold, colored)] [Actions ...]
```
- Padding: `8px 12px`
- Gap: `12px`
- Border-bottom: `1px solid var(--neutral-200)`
- Selected background: grade-tinted via `getGradeTintColor(difficulty, 'light')` or `semantic.selected`

### 3. Playful Summary Pills

Used in the search drawer to show active filter state.

**Search pills (`.pill`):**
```css
border-radius: 9999px;
padding: 6px 14px;
background: var(--neutral-50);
border: 1px solid var(--neutral-200);
font-size: 14px;
color: var(--neutral-500);
transition: box-shadow 200ms ease;
gap: 8px;
```
- Hover: `box-shadow: var(--shadow-sm)`
- Active: `background: var(--neutral-100)`
- Active indicator: 6px circle, `border-radius: 50%`, `background: var(--color-primary)`
- Icon: `14px`, `color: var(--neutral-400)`

**Recent search pills (`.pill` in recent-search-pills):**
```css
padding: 2px 10px;
border-radius: 9999px;
border: 1px solid var(--neutral-300);
background: var(--semantic-surface);
font-size: 12px;
color: var(--neutral-600);
gap: 4px;
transition: background-color 150ms ease, border-color 150ms ease;
```
- Container: Horizontally scrollable, hidden scrollbar (`scrollbar-width: none`)
- Hover: `background: var(--neutral-100)`, `border-color: var(--neutral-400)`
- Active: `border-color: var(--color-primary)`, `background: var(--semantic-selected)`, `color: var(--color-primary-hover)`
- Icon: `10px`, primary-colored when active

### 4. Accordion Stepped Cards

Filter sections that expand one at a time, with animated label scaling.

**Card container:**
```css
background: var(--semantic-surface);
border-radius: 16px;
box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.08);
overflow: hidden;
transition: box-shadow 200ms ease;
```
- Hover (inactive): Shadow increases to `0 2px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08)`
- Active: Shadow elevated to `0 3px 10px rgba(0, 0, 0, 0.1), 0 1px 4px rgba(0, 0, 0, 0.06)`

**Collapsed row:**
- Padding: `18px 24px` (active: `24px 24px 4px 24px`)
- Label: `14px`, `fontWeight: 400`, `color: var(--neutral-400)`
- Summary value: `14px`, `fontWeight: 500`, `color: var(--neutral-900)`, right-aligned, max-width 65%

**Active state transition (250ms ease):**
- Label scales: `14px` -> `22px`, weight `400` -> `700`, color `neutral-400` -> `neutral-900`
- Summary fades out: `opacity: 1` -> `opacity: 0`
- Content expands via `grid-template-rows: 0fr` -> `1fr` (250ms ease)

**Switch groups inside expanded cards:**
```css
background: var(--semantic-background);  /* neutral-50 */
border-radius: 12px;
padding: 4px 0;
```
- Switch rows: `padding: 12px 16px`, hover `background: var(--neutral-100)`, transition `150ms ease`

**Mobile adjustments (<768px):**
- Container gap: `10px` (vs `12px`)
- Collapsed padding: `16px 20px`
- Active label: `20px` (vs `22px`)
- Panel padding: `12px 20px 20px`

### 5. Queue Control "Now Playing" Bar

Persistent footer bar showing the current climb with swipe navigation.

**Bar structure:**
```
MuiCard (outlined)
└── CardContent
    └── swipeWrapper (overflow: hidden)
        └── swipeContainer
            ├── Left: [Thumbnail 36px] [Text with swipe clip]
            └── Right: [Mirror] [Play] [Prev/Next] [Party] [Tick]
```

**Styling:**
- Desktop: `border-top: 1px solid var(--neutral-200)`, no border-radius
- Mobile: `border-radius: 4px`, `box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12)`
- Background: `var(--semantic-surface)`, optionally grade-tinted

**Swipe text animation:**
- Current text slides off-screen: `transform: translateX(exitOffset)`, `300ms ease-out`
- Peek text (next/previous) positioned off-screen, moves with swipe offset
- Snap-back: `200ms ease`
- Clip exit (text leaves visible area): `100ms`

**Thumbnail crossfade:**
```css
@keyframes thumbnailFadeIn {
  from { opacity: 0; transform: scale(0.85); }
  to { opacity: 1; transform: scale(1); }
}
animation: thumbnailFadeIn 120ms ease-out;
```

**Swipe thresholds:**
- Trigger threshold: `80px`
- Exit duration: `300ms`
- Enter animation duration: `170ms`

**Desktop shadow (pseudo-element):**
```css
.queue-bar-shadow::before {
  background: linear-gradient(to top, rgba(0, 0, 0, 0.06), transparent);
  height: 4px;
  top: -4px;
}
```
Hidden on mobile.

### 6. Scroll-Based Drawer Expansion

The queue drawer dynamically expands from partial to full height based on scroll position.

- Start height: `60%` of viewport
- End height: `100%` of viewport
- Easing: Quadratic ease-out: `1 - (1 - progress)^2`
- Uses passive scroll listener for performance
- Height transition: `300ms cubic-bezier(0.4, 0, 0.2, 1)`
- Scroll container: `-webkit-overflow-scrolling: touch`, `overscroll-behavior-y: contain`

### 7. Bottom Tab Bar

Mobile-only navigation bar with glassmorphism effect.

**Styling:**
```css
background: rgba(255, 255, 255, 0.5);
-webkit-backdrop-filter: blur(10px);
backdrop-filter: blur(10px);
padding-top: 4px;
padding-bottom: env(safe-area-inset-bottom, 0px);
```

**Tab items:**
- Layout: Flex column, centered
- Padding: `6px 0 4px`
- Icon size: `20px`
- Label: `10px`, `margin-top: 2px`, `line-height: 1`
- Active color: `var(--color-primary)` (`#8C4A52`)
- Inactive color: `var(--neutral-400)` (`#9CA3AF`)
- Transition: `color 150ms ease`
- Touch handling: `-webkit-tap-highlight-color: transparent`, `touch-action: manipulation`

**Responsive:**
- Hidden at `min-width: 768px` (desktop uses sidebar/header navigation)
- Safe area insets for notched devices

---

## Interactive States

### Hover
```css
transition: <property> 150ms ease;
```
- Background change: `transparent` -> `var(--neutral-100)` (menu items, switch rows)
- Shadow lift: `shadow-sm` -> `shadow-md` (cards)
- Pill: Add `box-shadow: var(--shadow-sm)`

### Active / Pressed
```css
background: var(--neutral-200);
```
Or for interactive surfaces:
```css
background: var(--neutral-100);  /* lighter press on already-hovered */
```

### Selected
- Grade-tinted background via `getGradeTintColor(difficulty, 'light')`
- Or `semantic.selected` (`#F7F2F3`) for non-grade items
- Active recent pill: `border-color: var(--color-primary)`, `background: var(--semantic-selected)`

### Disabled
```css
opacity: 0.5;
cursor: not-allowed;
pointer-events: none;  /* optional, depends on context */
```

### Loading
- Inline: `<CircularProgress size={16} />` next to or replacing the action element
- Do not block the entire UI; show loading state on the specific action

---

## Animation & Motion

| Category | Duration | Easing | Use Cases |
|----------|----------|--------|-----------|
| Fast | `150ms` | `ease` | Hover states, color transitions, snap-backs, tab switches |
| Normal | `200ms` | `ease` | Fades, summary opacity, snap-back after swipe, shadow transitions |
| Slow | `300ms` | `cubic-bezier(0.4, 0, 0.2, 1)` | Drawer open/close, panel expand, swipe exit |
| Accordion | `250ms` | `ease` | Label scale, grid-template-rows expand, padding shift |
| Thumbnail enter | `120ms` | `ease-out` | `scale(0.85)` -> `scale(1)` + opacity `0` -> `1` |
| Swipe exit | `300ms` | `ease-out` | Text sliding off-screen |
| Swipe snap-back | `200ms` | `ease` | Returning to origin after incomplete swipe |

**Hover lift pattern:**
```css
transform: translateY(-1px);
transition: transform 150ms ease;
```

**Accordion expand (CSS Grid animation):**
```css
.expandableContent {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 250ms ease;
}
.expandableContent.open {
  grid-template-rows: 1fr;
}
.expandableInner {
  overflow: hidden;
  min-height: 0;
}
```

---

## Responsive Patterns

### Breakpoint

The single primary breakpoint is **768px**.

| Aspect | Mobile (<768px) | Desktop (>=768px) |
|--------|-----------------|-------------------|
| Navigation | Bottom tab bar | Hidden tab bar (sidebar/header) |
| Drawers | Drag handle, full-width, swipe-to-dismiss | Close button, constrained width |
| Swipe gestures | Primary interaction model | Hidden (show prev/next buttons) |
| Queue bar | Rounded with shadow, swipe navigation | Full-width, border-top, button navigation |
| Accordion padding | `16px 20px` | `18px 24px` |

### Implementation Rules

- **CSS media queries only**: Never use JavaScript breakpoint detection
- **CSS modules**: Co-located `.module.css` files, not inline styles
- **Safe area insets**: Use `env(safe-area-inset-bottom)` for bottom-anchored elements on notched devices
- **Touch handling**: Use `-webkit-tap-highlight-color: transparent` and `touch-action: manipulation` on interactive elements

---

## Surface & Card Patterns

### Default Card
```css
background: var(--semantic-surface);  /* white */
border: 1px solid var(--neutral-200);
border-radius: 12px;  /* or 16px for larger cards */
box-shadow: var(--shadow-sm);
```

### Elevated Card (hover)
```css
box-shadow: var(--shadow-md);
transition: box-shadow 200ms ease;
```

### Section Card (accordion)
```css
border-radius: 16px;
box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.08);
```

### Dividers
```css
height: 1px;
background: var(--neutral-200);
margin: 8px 0;
```

Or as border:
```css
border-bottom: 1px solid var(--neutral-200);
```

### Rules
- No heavy gradients or strong box-shadows
- White backgrounds for surfaces (`semantic.surface`)
- Selected items use grade-tinted backgrounds, not colored borders
- Borders are always `1px solid var(--neutral-200)` unless selected

---

## Button & Action Patterns

### Icon Buttons
- Use MUI `<IconButton size="small">`
- Default icon size: `20px` (action bar), `16px` (inline), `14px` (compact)
- Transition: `color 0.2s ease`
- Hover: `opacity: 0.8`

### Icon Color States

| State | Style | Example |
|-------|-------|---------|
| Default | Inherited / neutral | Outlined icon |
| Active (favorited) | `color: var(--color-error)` | Filled heart |
| Active (queued) | `color: var(--color-success)` | Filled check circle |
| Active (mirror) | Primary bg + white icon | Toggle button |
| Disabled | `opacity: 0.5`, `cursor: not-allowed` | -- |

### Action Bars
```css
display: flex;
justify-content: space-around;
align-items: center;
padding: 8px 16px 12px;
```

### Badges
```css
.MuiBadge-badge {
  backgroundColor: <semantic-color>;  /* success or error */
  color: white;
}
```
- Max value: `99` (displays as "99+")

### Action Tooltips
- Disabled on touch devices (uses `@media (hover: none)` detection)
- Ensures immediate tap-to-action on mobile without tooltip delay

### Menu Items (Drawer Lists)
```css
height: 48px;
padding: 0 16px;
gap: 12px;
font-size: 15px;
border-radius: 8px;
transition: background 150ms ease;
```
- Icon container: `24px` width, `18px` font-size, `color: var(--neutral-600)`
- Hover: `background: var(--neutral-100)`
- Active: `background: var(--neutral-200)`
- Danger items: `color: var(--color-error)`

### Search Footer Button
```css
variant: "contained";
size: "large";
border-radius: 12px;
height: 48px;
padding: 0 24px;
```
- Shows result count inline: "Search . 123"

---

## Anti-Patterns

These are explicitly prohibited in the Boardsesh codebase:

| Don't | Do Instead |
|-------|-----------|
| Hardcoded color values (`#8C4A52`) | Use `themeTokens.colors.primary` or `var(--color-primary)` |
| `localStorage` / `sessionStorage` | IndexedDB via `idb` package (see `packages/web/app/lib/user-preferences-db.ts`) |
| `style` prop on components | CSS modules (`.module.css`) or MUI `sx` prop |
| Hover-only interactions | Ensure all interactions work on touch; use swipe/tap as primary |
| Heavy shadows or gradients | Subtle `shadow-sm` / `shadow-md` only; no decorative gradients |
| JavaScript breakpoint detection | CSS `@media` queries only |
| `Grid.useBreakpoint()` | CSS `@media (min-width: 768px)` |
| Emoji in UI text | Use Material UI icons |
| Creating new files unnecessarily | Edit existing files; prefer CSS modules co-located with components |
| Adding unused code | Remove dead code immediately |
| Over-engineering | Minimum complexity for current task |

---

## File & Import Conventions

### Theme Tokens (TypeScript)
```typescript
import { themeTokens } from '@/app/theme/theme-config';

// Usage
themeTokens.colors.primary        // '#8C4A52'
themeTokens.neutral[200]          // '#E5E7EB'
themeTokens.spacing[4]            // 16
themeTokens.typography.fontSize.sm // 14
themeTokens.shadows.sm            // shadow string
themeTokens.transitions.fast      // '150ms ease'
themeTokens.borderRadius.lg       // 12
```

### CSS Variables (CSS Modules)
```css
/* Available globally from packages/web/app/components/index.css */
var(--color-primary)
var(--neutral-200)
var(--semantic-surface)
var(--shadow-sm)
var(--color-error)
var(--semantic-selected)
/* etc. */
```

### Grade Utilities
```typescript
import {
  getGradeColor,
  getGradeTintColor,
  getSoftGradeColor,
  getGradeTextColor,
} from '@/app/lib/grade-colors';
```

### CSS Module Co-location
```
packages/web/app/components/
  my-component/
    my-component.tsx           # Component code
    my-component.module.css    # Styles (co-located)
```

### MUI Imports
```typescript
import {
  IconButton,
  Button as MuiButton,
  Badge as MuiBadge,
  CircularProgress,
} from '@mui/material';
import { FavoriteBorderOutlined, CheckOutlined } from '@mui/icons-material';
```

### Typical Component File Structure

```typescript
'use client';  // Only if needed for interactivity

import { themeTokens } from '@/app/theme/theme-config';
import { getGradeColor, getGradeTintColor } from '@/app/lib/grade-colors';
import styles from './my-component.module.css';

// MUI imports
import { IconButton, Button as MuiButton } from '@mui/material';

export function MyComponent() {
  return (
    <div className={styles.container}>
      {/* Use CSS module classes */}
      {/* Use themeTokens in sx prop when dynamic values needed */}
      {/* Use CSS variables in .module.css for static values */}
    </div>
  );
}
```
