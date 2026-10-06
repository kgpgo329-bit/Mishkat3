---
name: Mishkat Design System
colors:
  surface: '#fbf9f6'
  surface-dim: '#dbdad7'
  surface-bright: '#fbf9f6'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f3f0'
  surface-container: '#efeeeb'
  surface-container-high: '#eae8e5'
  surface-container-highest: '#e4e2df'
  on-surface: '#1b1c1a'
  on-surface-variant: '#404944'
  inverse-surface: '#30312f'
  inverse-on-surface: '#f2f0ed'
  outline: '#707973'
  outline-variant: '#c0c9c2'
  surface-tint: '#336852'
  primary: '#002f20'
  on-primary: '#ffffff'
  primary-container: '#0d4733'
  on-primary-container: '#7eb59b'
  inverse-primary: '#9bd2b7'
  secondary: '#006c4b'
  on-secondary: '#ffffff'
  secondary-container: '#98f5c8'
  on-secondary-container: '#00734f'
  tertiary: '#372508'
  on-tertiary: '#ffffff'
  tertiary-container: '#4f3b1c'
  on-tertiary-container: '#c2a57d'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#b6efd3'
  primary-fixed-dim: '#9bd2b7'
  on-primary-fixed: '#002115'
  on-primary-fixed-variant: '#19503b'
  secondary-fixed: '#98f5c8'
  secondary-fixed-dim: '#7cd8ad'
  on-secondary-fixed: '#002114'
  on-secondary-fixed-variant: '#005137'
  tertiary-fixed: '#fedeb2'
  tertiary-fixed-dim: '#e0c298'
  on-tertiary-fixed: '#281800'
  on-tertiary-fixed-variant: '#584323'
  background: '#fbf9f6'
  on-background: '#1b1c1a'
  surface-variant: '#e4e2df'
typography:
  display-hero:
    fontFamily: Noto Serif
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 68px
  display-hero-mobile:
    fontFamily: Noto Serif
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 48px
  headline-lg:
    fontFamily: Noto Serif
    fontSize: 36px
    fontWeight: '600'
    lineHeight: 54px
  headline-lg-mobile:
    fontFamily: Noto Serif
    fontSize: 26px
    fontWeight: '600'
    lineHeight: 40px
  headline-md:
    fontFamily: Noto Serif
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 44px
  headline-md-mobile:
    fontFamily: Noto Serif
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 36px
  headline-sm:
    fontFamily: Noto Serif
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 32px
  title-md:
    fontFamily: Be Vietnam Pro
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 28px
  body-quranic:
    fontFamily: Noto Serif
    fontSize: 24px
    fontWeight: '500'
    lineHeight: 50px
  body-quranic-mobile:
    fontFamily: Noto Serif
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 42px
  body-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 17px
    fontWeight: '400'
    lineHeight: 30px
  body-md:
    fontFamily: Be Vietnam Pro
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 26px
  body-sm:
    fontFamily: Be Vietnam Pro
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 22px
  label-md:
    fontFamily: Be Vietnam Pro
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  label-sm:
    fontFamily: Be Vietnam Pro
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  margin: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.75rem
  space-xl: 2.5rem
---

## Brand & Style

This design system embodies an authentic Arabic-first, reverent, and intellectually grounded digital atmosphere. Built for an intelligent Islamic knowledge platform, the visual tone avoids generic Silicon Valley SaaS clichés, hyper-glossy glassmorphism, and loud neon accents. Instead, it draws from classical Islamic scholarly manuscripts (المخطوطات) and contemplative architectural harmony—characterized by deliberate pacing, generous margins, restrained ornamentation, and organic calm.

### Core Tenets
- **Scholarly Serenity:** The interface recedes to allow profound content—Quranic verses, Hadith, commentary, and scholarly synthesis—to take center stage.
- **RTL-Native Architecture:** Conceived natively from right to left; optical balances, directional cues, hierarchy, and micro-interactions honor Arabic orthography and visual flow.
- **Organic Warmth:** Pure digital white (#FFFFFF) is banished in favor of tactile ivory, warm alabaster, and vellum paper tones that reduce eye strain during prolonged contemplative reading.
- **Quiet Modernity:** Traditional spirit interpreted through pristine contemporary layouts, rhythmic spacing, and architectural curves reminiscent of historical alcoves (*Mihrab* and soft horseshoe arches).

## Colors

The palette draws directly from heritage inks, natural emerald pigments, crushed malachite, aged parchment, and subtle gold-leaf gilding.

### Palette Architecture
- **Primary Emerald Dark (`#0D4733`):** The signature ink. Conveys permanence, intellectual authority, and deep calm. Used for primary interactive triggers, key section headers, active navigation anchors, and prominent framing.
- **Secondary Mid-Green (`#1E825D`):** A vital foliage green used for supportive active states, highlighted terms, status indicators, and secondary calls-to-action.
- **Tertiary Warm Brass (`#C5A880`):** An understated metallic accent reminiscent of gilded manuscript margins and brass astrolabes. Used sparingly for badge embellishments, chapter dividers, citation markers, and delicate active tabs.
- **Warm Canvas & Neutrals (`#FAF8F5` base):**
  - **Surface 0 (Base Canvas):** `#FAF8F5` (Rich Alabaster/Cream).
  - **Surface 1 (Card/Container):** `#FFFFFF` with an imperceptible warm tint, layered softly over `#FAF8F5`.
  - **Surface 2 (Elevated Panels):** `#F3EFEA` (Warm Parchment).
  - **Surface Accent (Subtle Wash):** `#E2EFE9` (Tincture of soft emerald wash for quote blocks, callouts, and highlighted Ayahs).
- **Text & Contrast Hierarchy:**
  - **Ink Primary (`#1A2E26`):** Deep charcoal-pine tone, replacing harsh black with organic optical softness.
  - **Ink Secondary (`#3D5248`):** Muted slate-forest for secondary descriptions, metadata, and timestamps.
  - **Ink Muted (`#72867D`):** For placeholders, inactive icons, and structural divider lines.
  - **Border Subtle (`#E6DFD5`):** Warm hairline rules reminiscent of manuscript grid bounding lines (*Mastarah*).

## Typography

The typographic scale pairs the dignified, calligraphic cadence of high-contrast classic Arabic type forms (represented globally by `Noto Serif` for titles, citations, and sacred text representations) with the hyper-legible, balanced clarity of modern geometric/humanist text (`Be Vietnam Pro`) for navigational structures, dense commentary, and UI controls.

### Typographic Principles
- **Elevated Quranic Line Height:** Sacred text citations and Hadith excerpts (`body-quranic`) use an expansive line-height (1.8x–2.1x) to honor diacritical marks (Tashkeel) without visual collision or cramped accents.
- **RTL Baseline Alignment:** All typography balances against an open baseline grid. Text margins on the right are fortified to maintain crisp alignment along the eye's entry edge in right-to-left layout.
- **Subdued Letter Tracking:** Arabic letter connections must never be tracked or spaced artificially; spacing rules apply exclusively to non-cursive numeral sets and metadata labels.

## Layout & Spacing

Layouts in this design system follow an authentic editorial cadence, drawing inspiration from classical manuscript proportions (*Golden Ratio* within folios).

### Layout Geometry
- **Grid Architecture:** Desktop utilizes a 12-column adaptive grid centered with a generous maximum width of `1280px` for knowledge dashboards and `840px` for focused reading and study modes.
- **Columns & Breakpoints:**
  - **Desktop (≥ 1024px):** 12 columns, `gutter: 1.5rem`, `margin: 2.5rem`.
  - **Tablet (768px – 1023px):** 8 columns, `gutter: 1.25rem`, `margin: 1.5rem`.
  - **Mobile (< 768px):** 4 columns, `gutter: 1rem`, `margin: 1rem`.
- **Rhythmic Margins:** Generous vertical breathing space (`space-xl`) between distinct thematic sections prevents cognitive exhaustion and induces contemplative focus.
- **Reading Enclosures:** Long-form theological texts and discourse summaries are strictly bound between 60 to 75 characters per line to guarantee optimal saccadic eye return.

## Elevation & Depth

This system avoids layered dropshadows, synthetic 3D bevels, and frosted glass blurs. Depth is expressed through natural architectural layering and paper-over-paper tactile planes.

### Depth Hierarchy
- **Level 0 (Foundation):** The warm alabaster canvas (`#FAF8F5`). Completely matte.
- **Level 1 (Card & Content Blocks):** Pure off-white containers (`#FFFFFF`) sitting over `#FAF8F5`, delineated not by heavy drop shadows, but by a precise warm hairline border (`1px solid #E6DFD5`) and a tender, diffuse botanical shadow: `0 2px 8px -2px rgba(13, 71, 51, 0.04)`.
- **Level 2 (Popovers, Tooltips & Dropdowns):** Elevated panels utilize a tinted ambient glow: `0 8px 24px -4px rgba(26, 46, 38, 0.08)` coupled with an intentional border (`1px solid #D9D2C5`).
- **Level 3 (Modal Dialogs & Deep Focus):** Crisp backdrop dimming with warm emerald-tinted charcoal (`rgba(10, 58, 42, 0.45)`) that pulls focus into the core scholarly dialogue without clinical desaturation.

## Shapes

The geometric vocabulary honors the organic arches and quiet alcoves (*Mihrab*) of classic Islamic architecture—expressed through balanced, gentle curvatures rather than stark sharp edges or hyper-curved jelly pills.

### Corner Treatment
- **Standard Controls & Cards:** `0.5rem` (8px) provides a natural, smooth, tactile corner.
- **Editorial Callouts & Study Containers:** `1rem` (16px) creates an inviting, receptive container for study prompts and daily reflections.
- **Arch Accent Panels (Top Arch / Al-Mihrab Modifiers):** Specialty containers (e.g., featured Surah summaries, daily wisdom cards) employ asymmetric rounding: `1.5rem 1.5rem 0.5rem 0.5rem` (top-right and top-left softened intensely) to subtly mirror architectural arches without kitsch or literal ornamentation.

## Components

### Buttons & Interactive Triggers
- **Primary Action:** Solid Emerald Dark (`#0D4733`) background, `#FAF8F5` text, corner radius `0.5rem`. Hover state introduces a smooth shift to `#156B4D` accompanied by a micro-translation upward of 1px. Active state transitions to `#0A3A2A`.
- **Secondary Action:** Transparent base framed with `1.5px solid #0D4733`, filled with `#0D4733` text. Hover yields an ultra-light emerald tint (`#E2EFE9`).
- **Subtle / Ghost Action:** No border, `#1A2E26` text, subtle brass or sage hover wash (`#F3EFEA`).

### Inputs & Search Fields
- **Background & Border:** Soft parchment (`#FAF8F5`) resting in `#FFFFFF` cards, framed by `1px solid #E6DFD5`.
- **Focus State:** Hairline transition to `1.5px solid #1E825D` with an ambient glow of `0 0 0 3px rgba(30, 130, 93, 0.12)`. Avoid high-contrast browser-default blue rings.
- **Icon Alignment:** Affiliated icons (magnifying glass, filter icon) strictly anchor to the right (RTL start), accompanied by clean Arabic placeholder typography in `#72867D`.

### Cards & Reading Panes
- **Wisdom & Knowledge Cards:** Built on `#FFFFFF` surfaces with subtle `1px solid #E6DFD5` margins. Internal padding follows `1.5rem`.
- **Ayah / Hadith Callout Cards:** Grounded in a soft emerald tint (`#E2EFE9`). Accented by an understated vertical marker on the **right border** (RTL start) composed of `3px solid #1E825D`.

### Chips & Topic Tags (تصنيفات المعرفة)
- **Default State:** `#FAF8F5` background, `1px solid #E6DFD5`, `#3D5248` typography, rounded `0.5rem`.
- **Active State:** `#0D4733` background, `#FFFFFF` text, zero border.

### Checkboxes, Radios & Switches
- **Checkboxes & Radios:** Curved containers (`4px` for checks, fully circular for radios) utilizing `#E6DFD5` stroke; upon selection, filled with `#0D4733` presenting a crisp off-white checkmark.
- **RTL Toggles:** Switches maintain proper logical flow: active switches slide smoothly towards the left in RTL mode.

### Specialized Component: The Verse Recitation & Annotation Bar (شريط التلاوة والتأمل)
- A docked bottom panel with a rich `#FAF8F5` substrate, bordered with a top edge in `#E6DFD5`, housing audio controls, translation toggles, font size regulators, and bookmarking instruments styled with warm brass (`#C5A880`) and emerald icons.