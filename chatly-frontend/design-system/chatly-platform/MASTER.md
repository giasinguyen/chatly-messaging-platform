# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** Chatly platform
**Generated:** 2026-03-06 00:38:00
**Category:** Apple-Style Website (Bento Grid + Motion-Driven + Glassmorphism)

---

## Global Rules

### Color Palette — Apple Classic

| Role         | Hex       | CSS Variable           |
| ------------ | --------- | ---------------------- |
| Background   | `#F5F5F7` | `--color-bg`           |
| Card BG      | `#FFFFFF` | `--color-bg-card`      |
| Dark BG      | `#1D1D1F` | `--color-bg-dark`      |
| Text         | `#1D1D1F` | `--color-text`         |
| Text Muted   | `#6E6E73` | `--color-text-muted`   |
| CTA/Accent   | `#0071E3` | `--color-cta`          |
| CTA Hover    | `#0077ED` | `--color-cta-hover`    |
| Border       | `#D2D2D7` | `--color-border`       |
| Accent White | `#FBFBFD` | `--color-accent-white` |

**Color Notes:** Apple silver-white background · near-black text · Apple blue CTA

---

### Typography

- **Font:** Inter (all weights) — closest match to SF Pro
- **Fallback:** `-apple-system, BlinkMacSystemFont, sans-serif`
- **Weights:** 300, 400, 500, 600, 700
- **Mood:** minimal, clean, premium, Swiss, Apple-adjacent
- **Google Fonts:** [Inter](https://fonts.google.com/share?selection.family=Inter:wght@300;400;500;600;700)

**CSS Import:**

```css
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap");
```

---

### CSS Design Tokens

```css
:root {
    /* Colors */
    --color-bg: #f5f5f7;
    --color-bg-card: #ffffff;
    --color-bg-dark: #1d1d1f;
    --color-text: #1d1d1f;
    --color-text-muted: #6e6e73;
    --color-cta: #0071e3;
    --color-cta-hover: #0077ed;
    --color-border: #d2d2d7;
    --color-accent-white: #fbfbfd;

    /* Typography */
    --font-family: "Inter", -apple-system, BlinkMacSystemFont, sans-serif;

    /* Spacing (8px base) */
    --spacing-xs: 8px;
    --spacing-sm: 16px;
    --spacing-md: 24px;
    --spacing-lg: 48px;
    --spacing-xl: 80px;

    /* Layout */
    --max-width: 1200px;
    --grid-gap: 20px;
    --card-radius: 20px;
    --btn-radius: 980px; /* Apple pill button */

    /* Shadows */
    --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.06);
    --shadow-md: 0 4px 20px rgba(0, 0, 0, 0.08);
    --shadow-lg: 0 8px 40px rgba(0, 0, 0, 0.12);

    /* Glassmorphism (nav) */
    --glass-bg: rgba(255, 255, 255, 0.72);
    --glass-blur: saturate(180%) blur(20px);
    --glass-border: rgba(0, 0, 0, 0.1);

    /* Transitions */
    --transition: 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
    --hover-scale: scale(1.02);
}
```

---

### Spacing Variables

| Token          | Value  | Usage                 |
| -------------- | ------ | --------------------- |
| `--spacing-xs` | `8px`  | Tight gaps            |
| `--spacing-sm` | `16px` | Icon gaps, inline     |
| `--spacing-md` | `24px` | Standard padding      |
| `--spacing-lg` | `48px` | Section padding       |
| `--spacing-xl` | `80px` | Hero / large sections |

### Shadow Depths

| Level         | Value                         | Usage                  |
| ------------- | ----------------------------- | ---------------------- |
| `--shadow-sm` | `0 2px 8px rgba(0,0,0,0.06)`  | Subtle lift            |
| `--shadow-md` | `0 4px 20px rgba(0,0,0,0.08)` | Cards, containers      |
| `--shadow-lg` | `0 8px 40px rgba(0,0,0,0.12)` | Modals, featured cards |

---

## Component Specs

### Navigation Bar — Glassmorphism

```css
.navbar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: var(--glass-bg);
    backdrop-filter: var(--glass-blur);
    -webkit-backdrop-filter: var(--glass-blur);
    border-bottom: 1px solid var(--glass-border);
    z-index: 900;
    transition: var(--transition);
}
```

### Buttons — Apple Pill Style

```css
/* Primary Button */
.btn-primary {
    background: var(--color-cta);
    color: white;
    padding: 12px 28px;
    border-radius: var(--btn-radius);
    font-family: var(--font-family);
    font-weight: 500;
    font-size: 15px;
    cursor: pointer;
    transition: var(--transition);
    border: none;
}

.btn-primary:hover {
    background: var(--color-cta-hover);
    transform: scale(1.02);
}

/* Secondary Button */
.btn-secondary {
    background: transparent;
    color: var(--color-cta);
    border: 1.5px solid var(--color-border);
    padding: 12px 28px;
    border-radius: var(--btn-radius);
    font-family: var(--font-family);
    font-weight: 500;
    font-size: 15px;
    cursor: pointer;
    transition: var(--transition);
}

.btn-secondary:hover {
    border-color: var(--color-cta);
    transform: scale(1.02);
}
```

### Cards — Bento Grid Style

```css
.card {
    background: var(--color-bg-card);
    border-radius: var(--card-radius);
    padding: 32px;
    box-shadow: var(--shadow-md);
    border: 1px solid var(--color-border);
    transition: var(--transition);
    cursor: pointer;
}

.card:hover {
    box-shadow: var(--shadow-lg);
    transform: scale(1.02);
}
```

### Inputs

```css
.input {
    padding: 12px 16px;
    border: 1px solid var(--color-border);
    border-radius: 12px;
    font-family: var(--font-family);
    font-size: 16px;
    color: var(--color-text);
    background: var(--color-bg-card);
    transition: border-color 300ms ease;
}

.input:focus {
    border-color: var(--color-cta);
    outline: none;
    box-shadow: 0 0 0 3px rgba(0, 113, 227, 0.15);
}
```

### Modals

```css
.modal-overlay {
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(8px);
}

.modal {
    background: var(--color-bg-card);
    border-radius: 24px;
    padding: 40px;
    box-shadow: var(--shadow-lg);
    max-width: 520px;
    width: 90%;
}
```

---

## Style Guidelines

**Style Combo:**

- **Layout:** Bento Grid — CSS Grid với varied card sizes, Apple-style modular
- **Animations:** Motion-Driven — scroll reveal (Intersection Observer), parallax hero
- **Navigation:** Glassmorphism — `backdrop-filter: blur(20px)`, translucent nav

**Keywords:** minimal, clean, premium, Apple-adjacent, section-based, high information density, scannable

**Best For:** SaaS platforms, messaging apps, tech products, consumer apps

**Key Effects:**

- Scroll reveal với Intersection Observer API
- Parallax hero section
- Hover scale: `1.02` trên cards (không layout-shifting)
- Transitions: `300ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`
- Border radius: `20px` (cards), `980px` (buttons — Apple pill)
- Box shadow: `0 4px 20px rgba(0,0,0,0.08)`

### Page Pattern

**Pattern Name:** Bento Grid Showcase

- **Section Order:** 1. Hero (parallax), 2. Bento Grid (Key Features), 3. Detail Cards, 4. Tech Specs / Social Proof, 5. CTA
- **CTA Placement:** Floating sticky bar hoặc cuối Bento Grid
- **Card Strategy:** Card backgrounds `#FFFFFF` hoặc Glass. Icons SVG vibrant colors. Text dark.
- **Conversion Strategy:** Scannable value props. High information density không clutter. Mobile stack.

---

## Anti-Patterns (Do NOT Use)

- ❌ Flat design without depth
- ❌ Text-heavy pages without visual hierarchy
- ❌ Bright/saturated backgrounds (tránh xa #F5F5F7)
- ❌ Layout-shifting hover (dùng `scale` không gây reflow)
- ❌ **Emojis as icons** — Use SVG icons (Heroicons, Lucide, Simple Icons)
- ❌ **Missing cursor:pointer** — All clickable elements must have `cursor: pointer`
- ❌ **Low contrast text** — Maintain 4.5:1 minimum contrast ratio
- ❌ **Instant state changes** — Always use transitions (150–300ms)
- ❌ **Invisible focus states** — Focus states must be visible for a11y
- ❌ **Navbar stuck at top-0** — Use floating navbar spacing (`top: 0` ok but use glassmorphism)

---

## Pre-Delivery Checklist

Before delivering any UI code, verify:

- [ ] Font: Inter loaded từ Google Fonts
- [ ] Background: `#F5F5F7` (không phải trắng thuần)
- [ ] Cards: `border-radius: 20px`, `box-shadow: var(--shadow-md)`
- [ ] Navbar: glassmorphism `backdrop-filter: blur(20px)` + `rgba(255,255,255,0.72)`
- [ ] Buttons: pill shape `border-radius: 980px`, CTA `#0071E3`
- [ ] Scroll reveal: Intersection Observer trên các sections
- [ ] No emojis used as icons (use SVG instead)
- [ ] All icons from consistent icon set (Heroicons/Lucide)
- [ ] `cursor: pointer` on all clickable elements
- [ ] Hover states with smooth transitions (300ms)
- [ ] Light mode: text contrast 4.5:1 minimum
- [ ] Focus states visible for keyboard navigation
- [ ] `prefers-reduced-motion` respected
- [ ] Responsive: 375px, 768px, 1024px, 1440px
- [ ] No content hidden behind fixed navbars
- [ ] No horizontal scroll on mobile
