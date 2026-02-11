# Coordinate Distance Calculator (Next.js)

A modern coordinate visualizer and distance calculator with:

- Globe + map visualization
- Flat coordinate plane mode
- Multiple distance algorithms (Haversine, Vincenty, Equirectangular, Euclidean, Manhattan)
- Google Maps and DMS coordinate parsing
- Radius visualization around a point
- Unit conversion (m, km, mi, nmi, ft, blocks)
- Midpoint + initial bearing outputs
- i18n for top 20 languages
- SEO metadata, JSON-LD, robots, sitemap

## Getting started

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

## Before release

1. **Production URL**  
   Canonical URLs, sitemap, and Open Graph use `https://coordinatedistance.lukasdzenk.com` by default. Override with `NEXT_PUBLIC_SITE_URL` in `.env` if needed.

2. **Environment**  
   For Plausible analytics, set `NEXT_PUBLIC_APP_ENV=production` in your production environment.

3. **Icons**  
   The app includes `app/icon.svg`, `app/apple-icon.tsx`, and `app/opengraph-image.tsx`. For legacy favicon support, add `app/favicon.ico` (e.g. convert from `icon.svg` via a favicon generator).