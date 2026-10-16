import { mkdir, readFile, rm, writeFile, copyFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('.', import.meta.url))
const out = join(root, 'dist')
const readJson = async (path) => JSON.parse(await readFile(join(root, path), 'utf8'))

const readiness = await readJson('catalog/readiness.json')
const manifest = await readJson(`catalog/${readiness.release}/release-manifest.json`)
const lexicons = Object.fromEntries(
  await Promise.all(
    manifest.records.map(async ({ nsid }) => [nsid, await readJson(`catalog/${readiness.release}/lexicons/${nsid.split('.').join('/')}.json`)]),
  ),
)

const escape = (value) => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const releaseUrl = `https://github.com/danielATiriai/iriai-proto/releases/tag/${manifest.tag}`
const repoUrl = 'https://github.com/danielATiriai/placeproto'

// Self-hosted fonts (design settled Oct 16): EB Garamond 500 for headings and the wordmark,
// Inter 400/500/600 for body and UI, IBM Plex Mono 400 for code. Latin and Latin Extended only.
const fonts = [
  ['EB Garamond', 'eb-garamond', 500, 'normal'],
  ['EB Garamond', 'eb-garamond', 400, 'italic'],
  ['Inter', 'inter', 400, 'normal'],
  ['Inter', 'inter', 500, 'normal'],
  ['Inter', 'inter', 600, 'normal'],
  ['IBM Plex Mono', 'ibm-plex-mono', 400, 'normal'],
]
const subsets = { latin: 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD', 'latin-ext': 'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF' }
const fontFiles = []
const fontCss = fonts
  .flatMap(([family, pkg, weight, style]) =>
    Object.entries(subsets).flatMap(([subset, range]) => {
      const file = `${pkg}-${subset}-${weight}-${style}.woff2`
      if (subset === 'latin-ext' && style === 'italic') return [] // not shipped by @fontsource for every face
      fontFiles.push([join(root, 'node_modules', '@fontsource', pkg, 'files', file), file])
      return [`@font-face{font-family:"${family}";font-style:${style};font-weight:${weight};font-display:swap;src:url(fonts/${file}) format("woff2");unicode-range:${range}}`]
    }),
  )
  .join('\n')

// JSON with the design's syntax colours: keys, strings, numbers, comments.
const highlight = (value, indent = 0) => {
  const pad = '  '.repeat(indent)
  if (Array.isArray(value)) return `[${value.map((item) => `\n${pad}  ${highlight(item, indent + 1)}`).join(',')}\n${pad}]`
  if (value && typeof value === 'object') {
    const entries = Object.entries(value).map(([key, item]) => `\n${pad}  <span class="tk">"${escape(key)}"</span>: ${highlight(item, indent + 1)}`)
    return `{${entries.join(',')}\n${pad}}`
  }
  if (typeof value === 'string') return `<span class="ts">"${escape(value)}"</span>`
  return `<span class="tn">${escape(value)}</span>`
}
const comment = (text) => `<span class="tc">// ${escape(text)}</span>`

const sprig = '<svg class="sprig" viewBox="0 0 26 26" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true"><path d="M13 24V9"/><path d="M13 14C8 13 5 9 5 4c5 0 8 4 8 10z"/><path d="M13 11c3-1 6-4 7-8-5 0-7 3-7 8z"/><path d="M8 24h10"/></svg>'
const github = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.3-3.4-1.3-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.3 1.1 2.9.8.1-.6.3-1.1.6-1.3-2.2-.3-4.6-1.1-4.6-5a3.9 3.9 0 0 1 1-2.7c-.1-.3-.5-1.3.1-2.7 0 0 .8-.3 2.8 1a9.6 9.6 0 0 1 5 0c1.9-1.3 2.8-1 2.8-1 .5 1.4.2 2.4.1 2.7a3.9 3.9 0 0 1 1 2.7c0 3.9-2.3 4.7-4.6 5 .4.3.7.9.7 1.9V21c0 .3.2.6.7.5A10 10 0 0 0 12 2z"/></svg>'

const sections = [
  ['Docs', 'Guides, concepts and the lexicon reference.'],
  ['Sandbox', 'Write a record and query the live index in your browser.'],
  ['Blog', 'Releases, field notes and how the index grows.'],
  ['Showcase', 'Apps that find things by place.'],
]

const sample = readiness.sample
const queryExample = `${readiness.query.endpoint}/xrpc/app.iriai.proto.queryEvents?latitude=37.785054&longitude=-122.429827&radiusMeters=1000`
const sentence = 'PlaceProto is an open lexicon built on AT Protocol that connects what happens online to where it happens in real life.'

const page = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>PlaceProto — an open lexicon for places on AT Protocol</title>
  <meta name="description" content="${escape(sentence)}">
  <meta property="og:title" content="PlaceProto">
  <meta property="og:description" content="${escape(sentence)}">
  <meta property="og:url" content="https://placeproto.org/">
  <link rel="canonical" href="https://placeproto.org/">
  <link rel="icon" href="favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="fonts.css">
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <a class="skip-link" href="#main">Skip to main content</a>
  <header class="top">
    <div class="wrap top-in">
      <a class="logo" href="#main">${sprig}PlaceProto</a>
      <nav class="main-nav" aria-label="Sections coming with the site">${sections.map(([name]) => `<a href="#coming">${name}</a>`).join('')}</nav>
      <div class="top-right">
        <span class="soon-badge">Coming soon</span>
        <a class="gh" href="${repoUrl}" aria-label="PlaceProto on GitHub">${github}</a>
      </div>
    </div>
  </header>
  <main id="main" class="wrap">
    <div class="ix">
      <p class="notice"><strong>Coming soon.</strong> The site is not open yet. The ${escape(manifest.tag)} lexicons and a live index are already usable.</p>
      <h1>PlaceProto</h1>
      <p class="big">${escape(sentence)}</p>
      <p class="form-label">Get one email when the site opens:</p>
      <p class="actions"><a class="btn primary" href="https://useiriai.com/#waitlist">Notify me</a></p>
      <p class="form-note">The sign-up is the Iriai waitlist. One email, no newsletter.</p>

      <h2 id="how">How it works</h2>
      <p>Any app writes an ordinary calendar event and a small sidecar that says where. Any other app can then find it by place and time.</p>
      <pre class="code"><code>${comment('event · in the author’s own repository')}
${highlight(sample.event)}

${comment('sidecar · the place, written beside it')}
${highlight(sample.sidecar)}</code></pre>

      <h2 id="coming">Coming with the site</h2>
      <ul>${sections.map(([name, line]) => `<li><strong>${name}</strong>: ${escape(line)} <span class="soon">Coming soon</span></li>`).join('')}</ul>

      <h2 id="now">Available now</h2>
      <ul>
        <li><a href="${releaseUrl}">Lexicons ${escape(manifest.tag)}</a> on GitHub: ${manifest.records.map(({ nsid }) => `<code>${escape(nsid)}</code>`).join(' and ')}, published from <code>${escape(manifest.publisher.handle)}</code>. Raw JSON: ${manifest.records.map(({ nsid }) => `<a href="lexicons/${escape(nsid)}.json">${escape(nsid.split('.').pop())}</a>`).join(', ')}.</li>
        <li><a href="${escape(readiness.query.docs)}">Live index</a> at <code>${escape(readiness.query.endpoint.replace('https://', ''))}</code> (interim, Japantown). Open with no key and per-caller rate limits; search by distance from a point, a radius or a box, a time window or author.</li>
        <li><a href="${escape(readiness.example)}">Twenty-line example</a>: install the pinned release, query the index near Peace Plaza and check every result against the schemas.</li>
      </ul>
      <pre class="code"><code>curl '${escape(queryExample)}'</code></pre>
      <p class="verified">Last verified ${escape(readiness.checkedAt)}: ${readiness.query.evidence.map((item) => `<a href="${escape(item.url)}">${escape(item.label)}</a>`).join(' · ')}.</p>
    </div>
  </main>
  <footer class="site-foot">
    <div class="wrap foot-in">
      <span>© 2026 PlaceProto. An open lexicon, maintained by <a href="https://useiriai.com/">Iriai</a>.</span>
      <span class="links"><a href="${repoUrl}">GitHub</a><a href="https://atproto.com/">AT Protocol</a><a href="https://bsky.app/profile/${escape(manifest.publisher.handle)}">Bluesky</a></span>
    </div>
  </footer>
</body>
</html>
`

await rm(out, { recursive: true, force: true })
await mkdir(join(out, 'lexicons'), { recursive: true })
await mkdir(join(out, 'fonts'), { recursive: true })
await writeFile(join(out, 'index.html'), page)
await writeFile(join(out, 'fonts.css'), fontCss + '\n')
for (const [from, file] of fontFiles) await copyFile(from, join(out, 'fonts', file))
for (const file of ['style.css', 'favicon.svg', 'robots.txt']) await copyFile(join(root, 'site', file), join(out, file))
for (const [nsid, lexicon] of Object.entries(lexicons)) await writeFile(join(out, 'lexicons', `${nsid}.json`), JSON.stringify(lexicon, null, 2) + '\n')
await writeFile(join(out, 'release-manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
console.log(`✓ built dist/ from ${manifest.tag}: ${manifest.records.length} published schemas, ${fontFiles.length} font files`)
