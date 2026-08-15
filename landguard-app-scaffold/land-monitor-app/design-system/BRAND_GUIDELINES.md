# EarthGlobal Brand Guidelines

**Tagline:** See it. Check it. Secure it.

EarthGlobal is a professional-enterprise land monitoring platform. The brand should
read as trustworthy, precise, and technologically advanced — closer to a satellite
operations console than a consumer app. Every visual decision should reinforce
*surveillance-grade precision delivered through a calm, premium interface.*

## 1. Logo

- Source files: `frontend-owner/src/assets/logo-icon.svg` (mark only) and
  `logo-lockup.svg` (mark + wordmark). Treat these as canonical; other apps
  should reference/copy from here rather than forking the design.
- The mark is a globe with a magnifying lens fixed on a surveyed parcel grid —
  it should always read as "watching over land," not just "a globe."
- **Clear space:** maintain padding around the mark equal to at least the radius
  of the lens circle (34 units in the 240x240 viewBox) on all sides.
- **Minimum size:** do not render the icon below 24px — the parcel grid detail
  will disappear below that.
- **Don't:**
  - Don't recolor the mark to anything outside the palette below.
  - Don't place the mark on a light/white background without an outlined variant
    (not yet produced — flag if a light-mode surface is needed).
  - Don't stretch or skew; the globe must remain a perfect circle.

## 2. Color Palette

| Token | Hex | Usage |
|---|---|---|
| `background` | `#080F24` | App background (deep navy) |
| `backgroundSecondary` | `#0D1733` | Sidebars, top bars |
| `surface` | `#111D3A` | Cards, panels |
| `surfaceLight` | `#172647` | Hover/active surfaces |
| `primary` | `#1677FF` | Primary actions, active nav, links |
| `primaryBright` | `#3BA7FF` | Hover states, secondary emphasis |
| `cyan` | `#5CE1FF` | Highlights, focus rings, data accents |
| `text` | `#FFFFFF` | Primary text |
| `textMuted` | `#AAB7D4` | Secondary text, captions |
| `orange` | `#FF6048` | Sparingly — CTA emphasis, destructive-adjacent alerts |
| `success` / `error` / `warning` | `#22C55E` / `#EF4444` / `#F59E0B` | Status only |

**Rule of restraint:** most of the UI should stay dark and quiet. Reserve the
glow effect (see below) for primary buttons, active states, key data points, and
hero/brand moments — not for every card or every border. Overusing it makes the
product look neon instead of premium.

## 3. Glow Effect

The signature visual motif is a soft electric-blue glow, used for:
- Primary button hover states
- Active navigation items
- The parcel boundary polygon on the map when a parcel has an active alert
- Focus-visible rings (accessibility — see `design-system/src/theme/GlobalStyles.js`)

Implementation lives in `design-system/src/theme/spacing.js` (`shadows.glow`,
`shadows.glowSoft`, `shadows.glowCard`) — always reuse these tokens rather than
hand-writing new box-shadow values, to keep the glow consistent across apps.

## 4. Typography

- Font family: **Inter** (system-ui fallback stack defined in `theme/typography.js`).
- Headings: semibold (600), tight letter-spacing (`-0.02em`), tight line-height.
- Body: normal weight (400), 1.5 line-height for readability on dark backgrounds.
- Avoid more than 2 weights on a single screen (e.g. semibold headings + normal body).

## 5. Iconography

- Icon library: [Lucide](https://lucide.dev) (`lucide-react`), stroke-based,
  2px stroke weight by default — matches the mark's line-art style.
  Do not mix in filled/solid icon sets.
- Standard sizes: 14px (inline meta text), 16-18px (nav/buttons), 20-24px (feature/empty states).
- Icons should always have `aria-hidden="true"` when paired with visible text,
  and a proper `aria-label` when used alone (see `Button`/`BottomNavItem` usage
  in the codebase for the pattern).

## 6. Voice & Tone

- Direct, precise, unembellished — this is a monitoring/security tool, not a
  lifestyle brand. Prefer "Request a visit" over "Get eyes on your land today!"
- Status and alert language should be factual and calm even when the news is
  bad (e.g. "Unverified clearing detected" rather than "Warning! Land theft risk!").
- Use the tagline "See it. Check it. Secure it." as the three-step mental model
  in onboarding/marketing copy — it maps directly to the product flow
  (map view → visit/verify → alerts & subscription).

## 7. Motion

- Durations and easings are centralized in `design-system/src/theme/animations.js`.
- Default interaction feedback: 0.2-0.3s, `easeOut`.
- Page/section entrances: subtle fade + 8-20px slide, staggered by ~50ms per item
  for lists (see `Dashboard.jsx` parcel grid for the reference implementation).
- Always respect `prefers-reduced-motion` — this is handled globally in
  `GlobalStyles.js` and should not be overridden per-component.

## 8. Open Items (not yet produced)

- Light-mode / outlined logo variant for light backgrounds (marketing site, print).
- Full icon set beyond Lucide defaults (e.g. a custom "parcel alert" glyph).
- Marketing site hero and landing page component library.
- Formal accessibility (WCAG AA) audit sign-off — current implementation follows
  AA-oriented patterns (focus-visible, aria attributes, reduced-motion, semantic
  table/fieldset markup) but has not been run through an automated/manual audit.
