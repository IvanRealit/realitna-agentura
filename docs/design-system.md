# Design system

The visual identity is original and intentionally provisional. Change the brand in staff settings; replace editorial copy and demo media with approved assets before launch.

## Tokens

| Token      | Value     | Purpose                      |
| ---------- | --------- | ---------------------------- |
| `--ink`    | `#1e302c` | Main text, deep evergreen    |
| `--green`  | `#254f42` | Primary actions and emphasis |
| `--muted`  | `#6b7771` | Secondary copy               |
| `--paper`  | `#faf9f6` | Warm page canvas             |
| `--accent` | `#bb8755` | Restrained warm detail       |
| `--line`   | `#dedfd8` | Dividers and controls        |
| `--radius` | `4px`     | Deliberately subtle corners  |

Editorial headings use a system Georgia serif, paired with Arial/Helvetica for controls and reading text. This keeps fonts local and avoids a third-party font connection. Fluid headings range from 42–78 px; body text is 15 px with generous line height. Use dark text on warm neutral surfaces. Accent text is decorative, never the only state indicator.

## Composition and components

The content width is 1320 px including generous side gutters. Desktop listings use a three-column card grid; tablet uses two columns and mobile one. Navigation collapses at 800 px. Inputs have visible labels, errors use status/alert regions, icon actions have accessible names and buttons have keyboard focus indicators. Filters submit as URL query parameters and remain usable without client JavaScript.

Reusable components: Header/language navigation, PropertyCard, Favorite, Filters, Gallery, consent-gated MapView, LeadForm, Consent, editorial service cards and staff Editor. CSS classes map to these semantic components; Tailwind v4 is configured for utility additions.

Hover movement is limited to small card lifts, gentle image zooms and button feedback. `prefers-reduced-motion` disables transitions and animation. Keep future animations equally restrained. Use the DEMO badge and explanatory text whenever an offer or profile is fictional.

## Asset policy

`public/images/living.png` is an AI-generated fictional interior. `living.webp`, `detail.webp` and `window.webp` are optimized derivatives of that same image. They are not real listing photographs. The seed reuses them intentionally. Real properties require owner-approved images, clear usage rights and accurate descriptions/locations; never silently reuse a demo image as proof of a real offer.
