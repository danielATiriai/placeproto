import { mkdir, rm, copyFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('.', import.meta.url))
const out = join(root, 'dist')

// Self-hosted type (design settled Oct 16): EB Garamond 500 for headings and the wordmark, with its
// italic for the principle names, and Inter 400/600 for body and UI. Latin and Latin Extended only.
const fonts = [
  ['EB Garamond', 'eb-garamond', 500, 'normal', ['latin', 'latin-ext']],
  ['EB Garamond', 'eb-garamond', 500, 'italic', ['latin']],
  ['Inter', 'inter', 400, 'normal', ['latin', 'latin-ext']],
  ['Inter', 'inter', 600, 'normal', ['latin', 'latin-ext']],
]
const ranges = {
  latin: 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD',
  'latin-ext': 'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF',
}
const fontFiles = []
const fontCss = fonts
  .flatMap(([family, pkg, weight, style, subsets]) =>
    subsets.map((subset) => {
      const file = `${pkg}-${subset}-${weight}-${style}.woff2`
      fontFiles.push([join(root, 'node_modules', '@fontsource', pkg, 'files', file), file])
      return `@font-face{font-family:"${family}";font-style:${style};font-weight:${weight};font-display:swap;src:url(fonts/${file}) format("woff2");unicode-range:${ranges[subset]}}`
    }),
  )
  .join('\n')

await rm(out, { recursive: true, force: true })
await mkdir(join(out, 'fonts'), { recursive: true })
await writeFile(join(out, 'fonts.css'), fontCss + '\n')
for (const [from, file] of fontFiles) await copyFile(from, join(out, 'fonts', file))
for (const [pkg, name] of [['eb-garamond', 'OFL-eb-garamond.txt'], ['inter', 'OFL-inter.txt']]) await copyFile(join(root, 'node_modules', '@fontsource', pkg, 'LICENSE'), join(out, 'fonts', name))
for (const file of ['index.html', 'style.css', 'site.js', 'favicon.svg', 'favicon-32.png', 'apple-touch-icon.png', 'robots.txt']) await copyFile(join(root, 'site', file), join(out, file))
console.log(`✓ built dist/: the PlaceProto page with ${fontFiles.length} font files`)
