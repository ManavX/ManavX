// Assembles the hourly site for GitHub Pages: draws every SVG panel, and copies in the rendered
// GIFs, their still fallbacks and the data the next run compares against.
// Live GIFs (year.*, and cabin.* when the tracks changed) are rendered into the folder first, or
// carried over from the live site; anything already there wins over the copy in ../assets.
// usage: node scripts/assemble.mjs <siteDir>

import { execFileSync, spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const site = resolve(process.argv[2] ?? join(ROOT, 'out/site'))
mkdirSync(site, { recursive: true })

const panels = spawnSync(process.execPath, [join(ROOT, 'panels/build.mts'), site], { stdio: 'inherit' })
if (panels.status !== 0) process.exit(panels.status ?? 1)

// Rendered GIFs kept in the repo: the hero and footer, and a fallback copy of the cabin
const assets = join(ROOT, '..', 'assets')
for (const f of readdirSync(assets)) {
  if (!/^(hero|flyby|cabin)[.-]/.test(f) || existsSync(join(site, f))) continue
  copyFileSync(join(assets, f), join(site, f))
}
// What the next hour compares against
copyFileSync(join(ROOT, 'src/data/github.json'), join(site, 'github.json'))
writeFileSync(join(site, 'cabin.json'), execFileSync(process.execPath, [join(ROOT, 'scripts/cabin-signature.mjs')]))

if (!existsSync(join(site, 'year.gif'))) console.warn('[assemble] year.gif is missing: the contribution orbit will be broken until the next render')

const files = readdirSync(site).filter((f) => /\.(svg|gif|png)$/.test(f)).sort()
writeFileSync(
  join(site, 'index.html'),
  `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>ManavX profile art</title>
<style>body{margin:0;padding:24px 16px;background:#000;color:#9ca3af;font:14px ui-monospace,monospace}main{max-width:1000px;margin:auto;display:grid;gap:10px}img{width:100%;display:block}a{color:#ff6b1a}</style>
<main><p>The images behind <a href="https://github.com/ManavX">github.com/ManavX</a>, redrawn hourly. Source: <a href="https://github.com/ManavX/ManavX/tree/main/universe">universe/</a>.</p>
${files.map((f) => `<a href="${f}"><img src="${f}" alt="${f}" loading="lazy"></a>`).join('\n')}</main>\n`,
)
console.log(`site ready: ${files.length} images in ${site}`)
