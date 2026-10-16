import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'
import axe from 'axe-core'

const dist = fileURLToPath(new URL('../dist/', import.meta.url))
const types = { '.html': 'text/html', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.txt': 'text/plain', '.woff2': 'font/woff2' }
const server = createServer(async (request, response) => {
  const path = normalize(decodeURIComponent(new URL(request.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '')
  const file = join(dist, path.endsWith('/') ? `${path}index.html` : path)
  try {
    response.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' }).end(await readFile(file))
  } catch {
    response.writeHead(404).end()
  }
}).listen(0)
const base = `http://localhost:${server.address().port}/`

const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {})
try {
  for (const [width, scheme] of [[390, 'light'], [1440, 'light'], [390, 'dark'], [1440, 'dark']]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, colorScheme: scheme })
    const failed = []
    page.on('requestfailed', (request) => failed.push(request.url()))
    page.on('response', (response) => response.status() >= 400 && failed.push(`${response.status()} ${response.url()}`))
    await page.goto(base)
    assert.deepEqual(failed, [], 'Every local asset loads')
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `No horizontal scroll at ${width}px`)
    assert.match(await page.locator('.notice').innerText(), /coming soon/i, 'The page is marked coming soon')
    assert.equal(await page.locator('#coming + ul li').count(), 4, 'Docs, Sandbox, Blog and Showcase are listed as coming')
    assert.equal(await page.locator('#coming + ul .soon').count(), 4, 'Each coming section is labelled coming soon')
    assert.equal(await page.locator('#now + ul li').count(), 3, 'Lexicons, the live index and the example are listed as available')
    assert.equal(await page.locator('form').count(), 0, 'No dead form ships: the sign-up is a link')
    for (const [family, selector] of [['EB Garamond', 'h1'], ['Inter', 'p.big'], ['IBM Plex Mono', 'pre.code']]) {
      const used = await page.evaluate(async (sel) => { await document.fonts.ready; return getComputedStyle(document.querySelector(sel)).fontFamily }, selector)
      assert.match(used, new RegExp(family), `${selector} uses ${family}`)
      assert.ok(await page.evaluate((f) => document.fonts.check(`16px "${f}"`), family), `${family} is loaded from the self-hosted files`)
    }
    for (const href of ['lexicons/app.iriai.proto.event.json', 'lexicons/app.iriai.proto.defs.json', 'release-manifest.json', 'fonts.css']) {
      const response = await page.request.get(base + href)
      assert.equal(response.status(), 200, `${href} is served`)
    }
    for (const target of await page.locator('nav a, .btn, .logo, .gh, .foot-in a').all()) {
      const box = await target.boundingBox()
      if (box) assert.ok(box.height >= 44, `Target under 44px: ${await target.innerText()}`)
    }
    await page.evaluate(axe.source)
    const result = await page.evaluate(() => axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } }))
    assert.deepEqual(result.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })), [], `Accessibility at ${width}px ${scheme}`)
    await page.close()
  }
  console.log('PASS placeproto.org: coming-soon landing, fonts, layout at 390 and 1440 in light and dark, accessibility')
} finally {
  await browser.close()
  server.close()
}
