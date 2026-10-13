# placeproto

The PlaceProto landing page and catalog, served at https://placeproto.org (slice 3.1, BUILD-007). This repository will also hold the `org.placeproto` lexicons once governance for the name exists (D-30); until then the published schemas are IriaiProto's, from [danielATiriai/iriai-proto](https://github.com/danielATiriai/iriai-proto).

## How the page is made

`build.mjs` generates `dist/` from two inputs, following PlaceProto spec §7:

| Input | What it is | Who changes it |
|---|---|---|
| `catalog/<tag>/release-manifest.json` and `catalog/<tag>/lexicons/` | Copied unchanged from the pinned IriaiProto release: record URIs, CIDs, publisher, bundle SHA-256, and our lexicon JSON | Replaced when a new contracts release ships |
| `catalog/readiness.json` | Runtime support, kept apart from schema publication: query and stream status, evidence links with dates, per-record notes, and what is coming soon | Edited whenever service status changes |

Schema states (published, draft, deprecated) and service states (available, degraded, unavailable, planned) are shown separately. A record is labelled query-ready only with its release, its ingestion path and live evidence linked. The **CI** workflow runs daily and fails if any outbound link stops resolving.

## Commands

```bash
npm ci
npm run build        # dist/ from catalog/
npm run check        # Playwright + axe: catalog, labels, layout at 390 and 1440, light and dark
npm run check-links  # every https link on the page answers 200
```

## Deploy

Railway service `placeproto-site` in project `placeproto`, built from `Dockerfile` (Node builds the page, Caddy serves it) and deployed from `main`. `placeproto.org` is a Cloudflare CNAME to the service; `www.placeproto.org` redirects to the apex, and `placeproto.com` redirects at Cloudflare. `/healthz` answers `ok`. Lexicon JSON and the release manifest are served with `Access-Control-Allow-Origin: *`.
