# WolfHacks

The WolfHacks landing page. Built with React + Vite, hosted by ACM at NC State.

## Run locally

1. Install dependencies: `npm install`
2. Start the dev server: `npm run dev`
3. Head over to the URL it prints (usually `http://localhost:5173/`)

## Build for production

`npm run build` outputs a static site to `dist/`. Preview that build locally with `npm run preview`.

## Project structure

- `src/data/siteConfig.js`: all event copy and settings (dates, FAQ, links, the pre-register URL). Edit this file to update page content without touching components.
- `src/components/`: React components (Hero, Faq, Footer, Countdown, TrustBadge, WolfMark, Starfield).
- `src/index.css`: all styles.
- `public/images/`: the ACM NCSU Chapter logo and favicon.

## Things to update before launch

- `src/data/siteConfig.js` → `event.hero.preRegisterUrl`: replace with your real pre-registration form URL.
- `src/data/siteConfig.js` → `event.trustBadge`: swap in your real MLH season year/region/color once generated from MLH's organizer dashboard.
- Add real event dates, location details, and FAQ answers as they're finalized.
- Replace the "YOUR WOLFHACKS LOGO HERE" placeholder in the hero with an actual WolfHacks logo image once you have one.

## Deploying

This repo has no CI/CD configured. Build with `npm run build` and deploy the `dist/` folder to whichever host you choose (GitHub Pages, Vercel, Netlify, etc.).
