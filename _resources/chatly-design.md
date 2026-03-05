# Phân tích sơ lược về style Chatly Platform — theo Apple-Style Website

---

## Styles

| Style             | Mô tả                                                 | Match              |
| ----------------- | ----------------------------------------------------- | ------------------ |
| **Bento Grids**   | Off-white `#F5F5F7`, cards, Apple aesthetic chính xác | Apple-style exact  |
| **Motion-Driven** | Scroll animations, parallax, entrance effects         | Apple dùng nhiều   |
| **Glassmorphism** | Backdrop blur, translucent nav                        | Cho Navigation bar |

> **Combo khuyến nghị**: Bento Grid (layout) + Motion-Driven (animations) + Glassmorphism (nav)

---

## Color Palette

### Apple Classic (RECOMMENDED)

```
Background:   #F5F5F7  (Apple silver-white)
Text:         #1D1D1F  (Apple near-black)
Card BG:      #FFFFFF
CTA Blue:     #0071E3  (Apple blue)
Accent White: #FBFBFD
Border:       #D2D2D7
```

---

## Typography (Font Pairing)

| #       | Font                   | Style            | Ghi chú             |
| ------- | ---------------------- | ---------------- | ------------------- |
| **#5**  | **Inter (all)**        | Minimal Swiss    | Gần nhất với SF Pro |
| **#13** | **Plus Jakarta Sans**  | Friendly SaaS    | Modern, clean       |
| **#20** | **DM Sans**            | Premium Sans     | Sophisticated       |
| **#11** | **Outfit + Work Sans** | Geometric Modern | Cân bằng            |

---

## COMBO CUỐI CÙNG

```
Layout:       Bento Grid (No.53) — CSS Grid, varied card sizes
Animations:   Motion-Driven (No.15) — scroll reveal, parallax hero
Navigation:   Glassmorphism (No.3) — backdrop-filter: blur(20px)

Colors:
  --bg:         #F5F5F7
  --bg-card:    #FFFFFF
  --text:       #1D1D1F
  --text-muted: #6E6E73
  --cta:        #0071E3
  --border:     #D2D2D7

Typography:
  font-family: 'Inter', -apple-system, sans-serif;
  weights: 300, 400, 500, 600, 700

Effects:
  - Scroll reveal (Intersection Observer)
  - Parallax hero section
  - Hover scale: 1.02 (cards)
  - Transitions: 300ms ease
  - Border radius: 18-24px (cards), 12px (buttons)
  - Box shadow: 0 4px 20px rgba(0,0,0,0.08)
```

---

## CSS Design Tokens

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

