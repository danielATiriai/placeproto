# placeproto

The PlaceProto landing page, served at https://placeproto.org (slice 3.1, BUILD-007). It is one page, the "Letter" layout Daniel chose on Oct 16 with the copy he wrote on Oct 19: the headline, the three principles (Simple, Grounded, Affordant), the call for collaborators, and one button, "Get in touch", that opens a short contact form. The footer names Iriai as sponsor and links to useiriai.com. Nothing else is served. This repository will also hold the `org.placeproto` lexicons once governance for the name exists.

## Design

Option F of the Oct 19 style round, "Cream and Cormorant": a light cream page in the ginger emoji's palette, Cormorant Garamond 600 for the headline, the wordmark and the italic principle names, Inter 400/600 for body and UI, a dark-brown button, and no artwork beyond the 🫚 mark. The two faces are self-hosted from `@fontsource` (Latin and Latin Extended subsets, OFL licenses shipped in `dist/fonts/`) so every visitor sees the same type. The mark is also the tab icon, as an SVG plus PNGs for Safari and the iPhone home screen (the page's own emoji needs Emoji 15.0, so Windows 10 and older phones show an empty box there).

The contact form opens as a popover with a tan header strip, name and email side by side on desktop, the five roles as a grid of tiles, example placeholders, and a "We only use this to reply to you" line beside Cancel and Send. Nothing in it changes height as you fill it in: required fields are starred, an empty one is outlined in the accent color (with a visually hidden message for screen readers), and a failed send replaces the privacy line with "Not sent. Please try again."

## The contact form

`site/index.html` holds the form and `site/site.js` the submit flow, the same as the useiriai.com waitlist (`landing-page/landing.js`): it posts to the Iriai Apps Script with `form=placeproto`, `ajax=1`, a time-to-submit field `t` and a hidden `website` honeypot, then shows a thanks state. Fields: `name` and `email` (required), `segment` (one of `company`, `developer`, `community-organization`, `neighborhood-organization`, `other`; required), `organization` and `message` (optional). The Apps Script needs a `placeproto` branch that writes a `PlaceProto` tab before it accepts these submissions; until Daniel redeploys it, the script rejects them and the form shows its error state.

## How the page is made

`build.mjs` copies `site/` into `dist/` and adds `fonts.css` plus the font files from the `@fontsource` packages. Nothing is templated.

## Commands

```bash
npm ci
npm run build        # dist/ from site/ and the font packages
npm run check        # Playwright + axe: the copy, type, icon, the contact form (open, validate, submit, close), layout at 390 and 1440, light and dark
npm run check-links  # every https link on the page answers 200
```

## Deploy

Railway service `placeproto-site` in project `placeproto`, built from `Dockerfile` (Node builds the page, Caddy serves it) and deployed from `main`. `placeproto.org` is a Cloudflare CNAME to the service; `www.placeproto.org` redirects to the apex, and `placeproto.com` redirects at Cloudflare. `/healthz` answers `ok`. A PR labelled `staging` is served at https://staging.placeproto.org. The **CI** workflow runs daily and fails if any outbound link stops resolving.
