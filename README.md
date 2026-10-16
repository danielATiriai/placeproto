# placeproto

The PlaceProto landing page, served at https://placeproto.org (slice 3.1, BUILD-007). Until the site opens it is a coming-soon page, and the only page: what PlaceProto is, how a record and its sidecar fit together, the four sections that open with the site (Docs, Sandbox, Blog, Showcase, shown in the nav but not clickable), and what is already usable off-site. No other route is served. This repository will also hold the `org.placeproto` lexicons once governance for the name exists; until then the published schemas are IriaiProto's, from [danielATiriai/iriai-proto](https://github.com/danielATiriai/iriai-proto).

## Design

The page is the "Index" layout with "Handbook" typography, settled on 2026-10-16: one 760px text column, parchment background, EB Garamond 500 for headings and the wordmark, Inter for body and UI, IBM Plex Mono for code, the sprig mark and no other artwork. The three faces are self-hosted from `@fontsource` (Latin and Latin Extended subsets) so every visitor sees the same type. Later pages (Docs, Sandbox, Blog, Showcase) use the Handbook layout with the same type.

## How the page is made

`build.mjs` generates `dist/` from two inputs:

| Input | What it is | Who changes it |
|---|---|---|
| `catalog/<tag>/release-manifest.json` | Copied unchanged from the pinned IriaiProto release; the page takes the tag and the publisher handle from it | Replaced when a new contracts release ships |
| `catalog/readiness.json` | The query endpoint and docs link, and the sample record pair shown under How it works | Edited whenever service status changes |

The **CI** workflow runs daily and fails if any outbound link stops resolving.

## Commands

```bash
npm ci
npm run build        # dist/ from catalog/ and the font packages
npm run check        # Playwright + axe: coming-soon copy, fonts, layout at 390 and 1440, light and dark
npm run check-links  # every https link on the page answers 200
```

## Deploy

Railway service `placeproto-site` in project `placeproto`, built from `Dockerfile` (Node builds the page, Caddy serves it) and deployed from `main`. `placeproto.org` is a Cloudflare CNAME to the service; `www.placeproto.org` redirects to the apex, and `placeproto.com` redirects at Cloudflare. `/healthz` answers `ok`. A PR labelled `staging` is served at https://staging.placeproto.org.
