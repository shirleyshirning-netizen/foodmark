# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server (localhost:3000)
npm run build     # Production build
npm run lint      # ESLint
```

No test suite is configured.

## Environment Variables

Required in `.env.local`:
```
GOOGLE_PLACES_API_KEY=...
SCRAPINGBEE_API_KEY=...   # optional fallback
```

The API key must have **no HTTP referrer restrictions** in Google Cloud Console — server-side calls have no referrer header, causing REQUEST_DENIED otherwise.

## Architecture

**Single-page app** (`app/page.tsx`) — fully client-side state. All restaurant data is persisted in `localStorage` via `lib/storage.ts` (key: `malaysia-food-list-v2`). There is no database.

**URL ingestion flow** (`components/AddRestaurantForm.tsx`):
1. User pastes a Google Maps or share.google link
2. If `share.google` hostname → calls `/api/resolve-share-google` (redirect resolution + Places lookup in one shot)
3. Otherwise → calls `/api/place` (direct Places API lookup)
4. Returned `Restaurant` object is saved to localStorage

**`/api/place` route** (`app/api/place/route.ts`):
- Parses the URL via `lib/parsePlaceUrl.ts` into one of: `place_id`, `cid`, `query`, `coords`, or `short_url`
- Calls Google Places API (Details, Text Search, Nearby Search, or CID lookup) based on parse result
- Returns a normalized `Restaurant`-shaped JSON

**`/api/resolve-share-google` route** (`app/api/resolve-share-google/route.ts`):
- Step 1: `trySimpleFetch()` — follows HTTP redirects via fetch
- Step 1b: If redirect lands on a `google.com/search?q=NAME` URL, extracts the name and calls Places Text Search directly (most common happy path)
- Step 2: Falls back to ScrapingBee if simple fetch doesn't yield a Maps or `/sorry` URL
- Step 3: Falls back to Puppeteer if ScrapingBee also fails
- If a `/sorry` URL is reached, `parseContinueParam()` extracts the restaurant name from the `continue` query param
- Final step: Places Text Search → Places Details → return normalized JSON

**`lib/malaysia.ts`** — detects Malaysian state and city from a formatted address string.

**`lib/analytics.ts`** — thin wrapper around `window.gtag`. GA4 is loaded via `<GoogleAnalytics gaId="G-DWR0ZMERMS" />` in `app/layout.tsx` using `@next/third-parties/google`. Custom events: `add_restaurant`, `favourite`, `click_google_maps`, `click_waze`.

## Key Design Decisions

- **iOS input zoom prevention**: The URL input uses `style={{ fontSize: '16px' }}` — inputs below 16px trigger iOS auto-zoom. Do not replace this with a Tailwind `text-sm` class.
- **Duplicate prevention**: `addRestaurant()` checks `placeId` for deduplication before inserting.
- **Photo URLs**: Google Places photo URLs are constructed server-side and returned directly (not proxied). They work as `<img src>` but not with Next.js `<Image>` unless the hostname is in `next.config.js` `remotePatterns`.
- **`suppressHydrationWarning`** on `<body>` — prevents hydration mismatch from browser extensions modifying the DOM.
