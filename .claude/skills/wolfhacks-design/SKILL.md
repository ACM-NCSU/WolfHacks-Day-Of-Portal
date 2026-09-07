---
name: wolfhacks-design
description: WolfHacks portal design system — color tokens, typography, spacing, and component conventions (buttons, forms, dropdowns, cards, motion, dark/light theming) as actually defined in src/index.css and used in the existing components. Load before building or styling any new page/component in this repo (team dashboard, check-in, schedule, announcements, login) so new UI matches the existing site instead of inventing new colors or patterns.
---

# WolfHacks design system

Source of truth: `src/index.css`. This repo has no live custom domain
(`CNAME` is empty) and no separate marketing site — the Vite build in this
repo *is* the WolfHacks site, so there is nothing external to cross-check
colors against. If these values and the deployed site ever disagree, the
deployed site is stale; `src/index.css` wins.

Every rule below exists to make new pages (team dashboard, check-in, live
schedule, announcements, login) look like they belong to the same site,
without re-deriving the palette or re-inventing form patterns each time.

## Color tokens

Defined once in `:root`, overridden for light mode in `:root[data-theme='light']`.
**Always reference the variable, never the hex** — that's what makes light
mode work for free.

| Token | Dark (default) | Light | Use |
|---|---|---|---|
| `--ink` | `#14181C` | `#F7F3EA` | page background |
| `--ink-raised` | `#1B2027` | `#EFE9DB` | raised surfaces: inputs, dropdowns, toggle button |
| `--line` | `#2A3038` | `#DCD4C0` | borders, dividers |
| `--paper` | `#F5F1E8` | `#1B2027` | primary text |
| `--paper-line` | `#DCD4C0` | `#2A3038` | (rarely used directly) |
| `--red` | `#CC0000` | unchanged | the **one** accent color — Wolfpack Red, sampled from the real ACM NCSU logo. Links, active states, focus rings, primary buttons, required-field markers. Used sparingly — don't reach for it as a general highlight color. |
| `--steel` | `#7C8591` | `#6B7280` | tertiary text (labels, timestamps) |
| `--steel-dark` | `#9AA2AC` | `#454C57` | secondary text (ledes, body copy that isn't primary) |
| `--cream` | `#EFE9DB` | `#FFFFFF` | text on top of `--red` (e.g. primary button label) |
| `--card` | `rgba(27,32,39,0.5)` | `rgba(255,255,255,0.6)` | translucent panel background (form cards, countdown units) |
| `--moon-disc` / `--moon-dark` | decorative (hero art) | — | not needed outside the hero |

Error/danger text in new code should use `var(--red)`. (The apply form's
`.application-form__field-error` hardcodes `#ff8b8b` instead — that's a
pre-existing wart tuned for dark mode only; don't copy it into new CSS.)

## Typography

Three font tokens, each with a distinct job — don't mix them up:

- `--font-display`: `'Fraunces', Georgia, serif` — headings, the wordmark,
  anything that should feel editorial/branded. `.section__heading` uses this.
- `--font-body`: `'Inter Tight', -apple-system, ...` — prose, form input text,
  general copy. This is the `body` default.
- `--font-mono`: `'IBM Plex Mono', 'Courier New', monospace` — eyebrows
  (`.eyebrow`), buttons (`.btn`), form question labels, anything that should
  read as UI chrome rather than content.

Both fonts are loaded from Google Fonts in `index.html`; nothing to add for
new components.

## Layout tokens

- `--container: 1260px` — the site-wide max width via `.container`.
- Fluid spacing clamps (`--space-section`, `--hero-pad-top/bottom`,
  `--space-cta-top/bottom`, `--space-faq-top`) — grow smoothly with viewport
  instead of jumping at fixed breakpoints. Reuse an existing clamp rather than
  hardcoding new padding when a new section needs "section-sized" spacing.
- Form/content panels cap at **760px** (`.application-form`,
  `.apply-page__container` is 860px including its back-link and intro).

## Theming mechanism

Dark/light is a `data-theme` attribute on `<html>`, **not** a media query and
**not** React context:
- An inline script in `index.html` sets `data-theme` from
  `localStorage.getItem('theme')` before paint (default `'dark'`), avoiding a
  flash.
- `src/components/ThemeToggle.jsx` is the only thing that writes it, and it's
  rendered independently on every page (`Hero`'s page, `ApplyPage`,
  `ThankYouPage`) — there is no shared theme context. **Any new top-level page
  needs its own `<ThemeToggle />` and `<Starfield />`**, copying the pattern
  in `ApplyPage.jsx`'s return statement, not a layout wrapper (none exists).
- CSS overrides light mode with `:root[data-theme='light'] { ... }` for
  tokens, and `[data-theme='light'] .some-class { ... }` for one-off
  component overrides (see `.hero__logo--dark`/`--light`, `.hero__moon`).

## Naming convention

BEM-ish: `.block__element--modifier`. Examples already in the codebase:
`.apply-page__container`, `.application-form__field-error`,
`.faq__summary`, `.btn--primary`. New components should follow the same
`.component-name__part` shape (the plan for the team dashboard uses
`.team-dashboard__*`).

## Reusable primitives (use these, don't re-declare)

- `.container` — centers content at `--container` width with 24px side padding.
- `.section` — vertical rhythm via `--space-section`, plus the decorative
  seam (`::before`/`::after`) that separates page sections with a faint line
  and a small rotated diamond echoing the ACM badge/hero aura motif.
- `.eyebrow` — small mono-font label above a heading (e.g. "QUESTIONS", "ACM AT NC STATE").
- `.btn` / `.btn--primary` — primary action button (red bg, cream text, mono
  font). `.btn:disabled` gets `cursor: wait; opacity: 0.65`.
- `.acm-mention` — inline red link style with underline-on-hover.
- `.section__heading` / `.section__lede` — page/section heading + supporting copy.

## Form conventions (see `ApplyPage.jsx` as the reference implementation)

- Wrap the form in a card: `border: 1px solid var(--line); background: var(--card);`
  matching `.application-form`.
- Every field is a `<label>` containing a `.application-form__question` span
  (mono font, 13px) plus the input, with `<sup class="required-marker">*</sup>`
  for required fields.
- Inputs/selects/textareas share one rule: `border: 1px solid var(--line);
  border-radius: 2px; padding: 12px 13px; background: var(--ink-raised);
  color: var(--paper); font: 16px var(--font-body);`, with a `var(--red)`
  focus outline.
- Custom dropdown/select: use `src/components/SelectField.jsx` (a
  click-outside/Escape-closing dropdown) rather than a native `<select>` or a
  new implementation — its styles live in `index.css` under "Select field"
  and are shared with any future dropdown (e.g. the team dashboard's track
  picker).
- Status is a **string enum**, not booleans: `'idle' | 'submitting' |
  'submitted' | 'error'` (see `ApplyPage`'s `status` state). Disable the
  submit button on `'submitting'` and swap its label (e.g. "Sending...").
- Two separate error channels: a form-level `error` string
  (`.application-form__error`, `role="alert"`) for whole-submission failures,
  and per-field `fieldErrors` (`.application-form__field-error`) for
  validation. Never surface raw backend error detail to the user — log it via
  `console.error` and show a fixed, friendly message instead.
- `noValidate` on the `<form>` — validation is hand-rolled in JS, not native
  HTML5 validation.

## Motion

`framer-motion`, with the same variant shape duplicated in `Register.jsx` and
`Faq.jsx` — reuse this shape rather than inventing new easing/timing:

```js
const container = { hidden: {}, show: { transition: { staggerChildren: 0.09 } } };
const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55 } },
};
```

Every animated component calls `useReducedMotion()` and conditionally passes
`initial={prefersReducedMotion ? 'show' : 'hidden'}` (and omits hover/tap
animation props) so motion fully respects the OS-level reduced-motion setting.
`index.css` also has a global `@media (prefers-reduced-motion: reduce)` block
that collapses all CSS animation/transition durations — don't fight it with
`!important` timings in new component CSS.

## Accessibility baseline already in place

- `a:focus-visible, button:focus-visible, summary:focus-visible` get a
  `var(--red)` outline, 3px offset — don't override this per-component.
- Honeypot fields use the `.application-form__honeypot` visually-hidden
  pattern (clip-based, not `display:none`) if a new form ever needs a spam trap.

## When building a new top-level page

1. Add the route branch in `src/App.jsx` (hand-rolled path matching on
   `window.location.pathname` — no router library in this repo).
2. Render `<Starfield />` + `<ThemeToggle />` yourself; there's no shared layout.
3. Cap content width with `.container` or a page-specific `__container` class
   at 760–860px, matching the apply page.
4. Build every visual choice from the tokens/primitives above before adding a
   single new hex value or one-off style.
