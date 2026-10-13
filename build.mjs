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
const sourceUrl = (nsid) => `https://github.com/danielATiriai/iriai-proto/blob/${manifest.sourceCommit}/lexicons/${nsid.split('.').join('/')}.json`
const label = (state) => `<span class="state state-${escape(state)}">${escape({ published: 'Published', available: 'Available, interim', planned: 'Coming soon', draft: 'Draft' }[state] ?? state)}</span>`

const recordEntry = (record) => {
  const meta = readiness.records[record.nsid]
  const lexicon = lexicons[record.nsid]
  return `
        <article class="entry" id="${escape(record.nsid)}">
          <header class="entry-head">
            <p class="kind">${escape(meta.kind)}</p>
            <h3><code>${escape(record.nsid)}</code></h3>
            <p class="entry-title">${escape(meta.title)}</p>
          </header>
          <p>${escape(lexicon.description)}</p>
          <dl class="facts">
            <div><dt>Schema</dt><dd>${label(meta.schema)} in <a href="${releaseUrl}">${escape(manifest.tag)}</a> from <code>${escape(manifest.publisher.handle)}</code></dd></div>
            <div><dt>Query support</dt><dd>${label(meta.query)} through ${meta.methods.map((m) => `<code>${escape(m)}</code>`).join(' and ')}</dd></div>
            <div><dt>Indexing</dt><dd>${escape(meta.ingestion)}</dd></div>
            <div><dt>Compatibility</dt><dd>${escape(meta.compatibility)}</dd></div>
            <div><dt>Record</dt><dd><code class="wrap">${escape(record.uri)}</code><br>CID <code class="wrap">${escape(record.cid)}</code></dd></div>
            <div><dt>Owner</dt><dd>Iriai, published from <code>${escape(manifest.publisher.handle)}</code> (<code>${escape(manifest.publisher.did)}</code>), authority <code>${escape(manifest.publisher.authorityRecord)}</code></dd></div>
          </dl>
          <p class="links"><a href="lexicons/${escape(record.nsid)}.json">Raw JSON</a><a href="${sourceUrl(record.nsid)}">Source at ${escape(manifest.sourceCommit.slice(0, 7))}</a><a href="${releaseUrl}">Release ${escape(manifest.tag)}</a></p>${
            meta.example
              ? `
          <details class="example"><summary>Example record</summary><pre><code>${escape(JSON.stringify(meta.example, null, 2))}</code></pre><p><a href="${escape(meta.exampleSource)}">The same record, live</a></p></details>`
              : ''
          }
        </article>`
}

const vendored = Object.entries(manifest.vendoredLexicons)
  .map(([nsid, { cid }]) => `<li><code>${escape(nsid)}</code> <span class="cid">${escape(cid.slice(0, 16))}…</span></li>`)
  .join('')

const evidence = readiness.query.evidence.map((item) => `<li><a href="${escape(item.url)}">${escape(item.label)}</a> <span class="date">${escape(item.date)}</span></li>`).join('')

const queryExample = `${readiness.query.endpoint}/xrpc/app.iriai.proto.queryEvents?latitude=37.785054&longitude=-122.429827&radiusMeters=1000`

const page = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>PlaceProto — an open vocabulary for places on the AT Protocol</title>
  <meta name="description" content="PlaceProto adds a required location to everyday AT Protocol records, so any app can find what is happening at a place. IriaiProto is its first published namespace.">
  <meta property="og:title" content="PlaceProto">
  <meta property="og:description" content="An open vocabulary for places on the AT Protocol.">
  <meta property="og:url" content="https://placeproto.org/">
  <link rel="canonical" href="https://placeproto.org/">
  <link rel="icon" href="favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <a class="skip-link" href="#main">Skip to main content</a>
  <header class="site-header">
    <div class="container header-inner">
      <a class="brand" href="#main">place<span>proto</span></a>
      <nav aria-label="Sections"><a href="#catalog">Catalog</a><a href="#query">Query</a><a href="#stream">Stream</a><a href="#try">Try it</a></nav>
    </div>
  </header>
  <main id="main">
    <section class="hero">
      <div class="container">
        <p class="eyebrow">In progress · first release ${escape(manifest.tag)}</p>
        <h1>An open vocabulary for places on the AT Protocol</h1>
        <p class="lede">PlaceProto adds a required location to the records people already write, starting with calendar events. Records stay in their authors' own repositories. Any app can write them, and a shared index finds them by place and time, whoever wrote them.</p>
        <div class="actions"><a class="button" href="#try">Try it in twenty lines</a><a class="text-link" href="#catalog">Browse the catalog</a></div>
      </div>
    </section>

    <section class="section" id="catalog" aria-labelledby="catalog-title">
      <div class="container">
        <h2 id="catalog-title">Catalog</h2>
        <div class="notice"><p><strong>The PlaceProto catalog is coming soon.</strong> The <code>org.placeproto</code> namespace is reserved and holds no schemas yet. Today's schemas are published under <code>app.iriai.proto</code> as IriaiProto, PlaceProto's first namespace, and move only when governance for the PlaceProto name exists.</p></div>
        <p class="legend">Schema status and service status are separate. <strong>Published</strong> means the schema record is live and resolves through DNS. <strong>Available, interim</strong> means a public service answers it today under interim access terms. <strong>Coming soon</strong> means planned, with nothing live.</p>

        <h3 class="group-title" id="iriaiproto">IriaiProto <code>app.iriai.proto</code></h3>
        <p class="group-lede">Release <a href="${releaseUrl}">${escape(manifest.tag)}</a>, verified ${escape(manifest.verifiedAt.slice(0, 10))}. Install from the pinned bundle (SHA-256 <code class="wrap">${escape(manifest.bundle.sha256)}</code>) with <code>@atproto/lex</code> ${escape(manifest.testedTools['@atproto/lex'])}; never a floating latest.</p>
        <div class="entries">${[...manifest.records].sort((a, b) => (readiness.records[a.nsid].kind === 'Record' ? 0 : 1) - (readiness.records[b.nsid].kind === 'Record' ? 0 : 1)).map(recordEntry).join('')}
        </div>

        <h3 class="group-title">Coming soon</h3>
        <ul class="coming">${readiness.coming.map((item) => `<li><p class="coming-title">${escape(item.title)} ${label('planned')}</p><p><code>${escape(item.nsid)}</code>. ${escape(item.summary)}</p></li>`).join('')}</ul>

        <h3 class="group-title">Reused community schemas</h3>
        <p class="group-lede">Vendored unchanged from Lexicon Community and Bluesky, pinned by URI and CID in the release, never republished as ours.</p>
        <ul class="vendored">${vendored}</ul>
      </div>
    </section>

    <section class="section alt" id="query" aria-labelledby="query-title">
      <div class="container two-col">
        <div>
          <h2 id="query-title">Query</h2>
          <p>${label(readiness.query.status)} <code>${escape(readiness.query.endpoint)}</code></p>
          <p>${escape(readiness.query.access)}</p>
          <p>Search by distance from a point, a radius or a box, a time window, author or community event, ordered by distance or start time, with cursors over a stable snapshot. <a href="${escape(readiness.query.docs)}">Parameters and errors</a>.</p>
          <p class="checked">Last verified</p>
          <ul class="evidence">${evidence}</ul>
        </div>
        <div><pre class="snippet"><code>curl '${escape(queryExample)}'</code></pre></div>
      </div>
    </section>

    <section class="section" id="stream" aria-labelledby="stream-title">
      <div class="container two-col">
        <div>
          <h2 id="stream-title">Change stream</h2>
          <p>${label(readiness.stream.recipe.status)} ${escape(readiness.stream.recipe.summary)}</p>
          <p>${label(readiness.stream.hosted.status)} ${escape(readiness.stream.hosted.summary)}</p>
        </div>
        <div><pre class="snippet"><code>wss://jetstream2.us-east.bsky.network/subscribe
  ?wantedCollections=community.lexicon.calendar.event
  &amp;wantedCollections=app.iriai.proto.event</code></pre></div>
      </div>
    </section>

    <section class="section alt" id="try" aria-labelledby="try-title">
      <div class="container two-col">
        <div>
          <h2 id="try-title">Try it</h2>
          <p>Twenty lines of TypeScript build the ${escape(manifest.tag)} contracts from the pinned release, ask the live index for events near Japantown Peace Plaza and check every result against the schemas.</p>
          <div class="actions"><a class="button" href="https://github.com/danielATiriai/iriai-proto/tree/main/examples/try-it">Open the example</a></div>
        </div>
        <div><pre class="snippet"><code>git clone https://github.com/danielATiriai/iriai-proto
cd iriai-proto/examples/try-it
npm ci
npm run release
npm run build
npm start</code></pre></div>
      </div>
    </section>

    <section class="section" id="build" aria-labelledby="build-title">
      <div class="container">
        <h2 id="build-title">Built with PlaceProto</h2>
        <ul class="apps">
          <li><h3>Corgo</h3><p>A Japantown quest game that publishes its quests as PlaceProto events. Testing on iPhone from October 20.</p></li>
          <li><h3>Smoke Signal</h3><p>An independent ATProto events app. It lists Iriai's steward events because PlaceProto rides on the community calendar event. <a href="https://smokesignal.events/did:plc:kd5s7zyp7nje43ievnqhgzrr/3mxrq3w4c2k2y">See one there</a>.</p></li>
          <li><h3>Iriai</h3><p>Bespoke apps for neighborhoods, built on PlaceProto. <a href="https://useiriai.com/#waitlist">Join the waitlist</a> to build with it or try Corgo.</p></li>
        </ul>
      </div>
    </section>
  </main>
  <footer class="site-footer">
    <div class="container">
      <p>PlaceProto is in progress and maintained by <a href="https://useiriai.com/">Iriai</a>. Catalog generated from the ${escape(manifest.tag)} release manifest; service status checked ${escape(readiness.checkedAt)}. Source on <a href="https://github.com/danielATiriai/placeproto">GitHub</a>.</p>
    </div>
  </footer>
</body>
</html>
`

await rm(out, { recursive: true, force: true })
await mkdir(join(out, 'lexicons'), { recursive: true })
await writeFile(join(out, 'index.html'), page)
for (const file of ['style.css', 'favicon.svg', 'robots.txt']) await copyFile(join(root, 'site', file), join(out, file))
for (const [nsid, lexicon] of Object.entries(lexicons)) await writeFile(join(out, 'lexicons', `${nsid}.json`), JSON.stringify(lexicon, null, 2) + '\n')
await writeFile(join(out, 'release-manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
console.log(`✓ built dist/ from ${manifest.tag}: ${manifest.records.length} published schemas`)
