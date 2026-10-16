import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const html = await readFile(fileURLToPath(new URL('../dist/index.html', import.meta.url)), 'utf8')
const links = [...new Set([...html.matchAll(/href="(https:[^"#]+)/g)].map((m) => m[1].replaceAll("&amp;", "&")))].filter((url) => new URL(url).hostname !== "placeproto.org")
const allowPending = new Set((process.env.ALLOW_PENDING ?? '').split(',').filter(Boolean))
let failed = 0
for (const url of links) {
  let status
  try {
    status = (await fetch(url, { method: 'GET', redirect: 'follow' })).status
  } catch (error) {
    status = error.cause?.code ?? 'error'
  }
  const ok = status === 200 || (allowPending.has(url) && status === 404)
  if (!ok) failed++
  console.log(`${ok ? '✓' : '✗'} ${status} ${url}${status !== 200 && ok ? ' (allowed while pending)' : ''}`)
}
if (failed) process.exit(1)
