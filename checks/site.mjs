import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'
import axe from 'axe-core'

const dist = fileURLToPath(new URL('../dist/', import.meta.url))
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.txt': 'text/plain', '.woff2': 'font/woff2' }
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
const APPS_SCRIPT = /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/

const axeCheck = async (page, label) => {
  await page.evaluate(axe.source)
  const result = await page.evaluate(() => axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } }))
  assert.deepEqual(result.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })), [], `Accessibility: ${label}`)
}

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

    // Daniel's copy, in order.
    assert.equal(await page.locator('.st').innerText(), 'Kickoff', 'The status label reads Kickoff')
    assert.match(await page.locator('h1').innerText(), /^PlaceProto: Lexicons for community and place-based apps$/, 'The headline is the one from the copy doc')
    assert.deepEqual(await page.locator('.pr i').allInnerTexts(), ['Simple', 'Grounded', 'Affordant'], 'The three principles, in order')
    assert.match(await page.locator('.foot').innerText(), /open standard in progress\. Development sponsored by Iriai\./, 'The footer line')
    assert.equal(await page.locator('.foot a').getAttribute('href'), 'https://useiriai.com/', 'Iriai in the footer links to useiriai.com')
    assert.equal(await page.locator('main .btn').count(), 1, 'One button on the page')
    assert.equal(await page.locator('nav').count(), 0, 'No nav: this is a single page')
    for (const href of await page.locator('a[href]').evaluateAll((as) => as.map((a) => a.getAttribute('href')))) assert.ok(href === '/' || href.startsWith('https://'), `Only the home link and off-site links: ${href}`)

    // Type and the icon.
    for (const [family, selector] of [['EB Garamond', 'h1'], ['EB Garamond', '.pr i'], ['Inter', '.body p']]) {
      const used = await page.evaluate(async (sel) => { await document.fonts.ready; return getComputedStyle(document.querySelector(sel)).fontFamily }, selector)
      assert.match(used, new RegExp(family), `${selector} uses ${family}`)
      assert.ok(await page.evaluate((f) => document.fonts.check(`16px "${f}"`), family), `${family} is loaded from the self-hosted files`)
    }
    assert.ok(await page.evaluate((f) => document.fonts.check(`italic 500 16px "${f}"`), 'EB Garamond'), 'The EB Garamond italic is loaded')
    assert.equal(await page.locator('.logo .mark').innerText(), '🫚', 'The ginger emoji is the mark')
    assert.match(await (await page.request.get(base + 'favicon.svg')).text(), /🫚/, 'The favicon is the ginger emoji')
    for (const href of ['fonts.css', 'site.js', 'fonts/OFL-inter.txt', 'fonts/OFL-eb-garamond.txt']) assert.equal((await page.request.get(base + href)).status(), 200, `${href} is served`)

    for (const target of await page.locator('.logo, .btn').all()) { // the footer link is inline text, exempt from the 44px rule
      const box = await target.boundingBox()
      if (box) assert.ok(box.height >= 44, `Target under 44px: ${await target.innerText()}`)
    }
    await axeCheck(page, `page at ${width}px ${scheme}`)

    // The contact form: opens as a popover, carries the waitlist script's fields, validates, and closes.
    assert.equal(await page.locator('#connect:popover-open').count(), 0, 'The form starts closed')
    await page.click('button[popovertarget=connect]')
    assert.equal(await page.locator('#connect:popover-open').count(), 1, 'Get in touch opens the form')
    const form = page.locator('form[name=placeproto]')
    assert.match(await form.getAttribute('action'), APPS_SCRIPT, 'The form posts to the Iriai Apps Script')
    assert.equal(await form.locator('input[name=form]').inputValue(), 'placeproto', 'It identifies itself as the placeproto form')
    assert.match(await form.locator('input[name=t]').inputValue(), /^\d{13}$/, 'The submit script set the time-to-submit field')
    assert.ok(await form.locator('input[name=website]').evaluate((el) => el.getBoundingClientRect().right < 0), 'The honeypot is off screen')
    assert.deepEqual(await form.locator('input[name=segment]').evaluateAll((els) => els.map((e) => e.value)), ['company', 'developer', 'community-organization', 'neighborhood-organization', 'other'], 'The five segments')
    for (const name of ['name', 'email', 'organization', 'message']) assert.equal(await form.locator(`[name=${name}]`).count(), 1, `The ${name} field`)
    for (const target of await page.locator('#connect .btn, #connect .x, .roles label').all()) {
      const box = await target.boundingBox()
      if (box) assert.ok(box.height >= 44, `Form target under 44px: ${await target.innerText()}`)
    }
    await axeCheck(page, `form open at ${width}px ${scheme}`)
    await page.route('https://script.google.com/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }))
    await form.locator('button[type=submit]').click()
    assert.equal(await form.locator('.field-error').first().innerText(), 'This field is required.', 'Empty required fields are flagged before anything is sent')
    await form.locator('[name=name]').fill('Test')
    await form.locator('[name=email]').fill('test@example.com')
    await form.locator('input[name=segment][value=developer]').check()
    await form.locator('button[type=submit]').click()
    await form.locator('.form-success').waitFor({ state: 'visible' })
    assert.equal(await form.locator('.actions').isVisible(), false, 'The thanks state replaces the fields')
    await page.keyboard.press('Escape')
    assert.equal(await page.locator('#connect:popover-open').count(), 0, 'Escape closes the form')
    await page.close()
  }
  console.log('PASS placeproto.org: copy, type, icon, contact form, layout at 390 and 1440 in light and dark, accessibility')
} finally {
  await browser.close()
  server.close()
}
