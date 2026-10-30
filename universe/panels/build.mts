/**
 * Writes every animated SVG panel into an output folder (default ../out/site).
 * usage: node panels/build.mts [outDir]
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { about, button, constellations, divider, receiver, signoff, telemetry, type Github, type Live } from './sections.mts'

const root = fileURLToPath(new URL('..', import.meta.url))
const out = resolve(process.argv[2] ?? join(root, 'out/site'))
mkdirSync(out, { recursive: true })
const read = <T,>(f: string): T => JSON.parse(readFileSync(join(root, 'src/data', f), 'utf8'))
const gh = read<Github>('github.json')
let live: Live
try {
  live = read<Live>('live.json')
} catch {
  live = { fetchedAt: new Date().toISOString(), push: null, tracks: null }
}
const now = new Date()

export const SECTIONS = ['TRANSMISSION', 'LIFE ON BOARD', 'CONSTELLATIONS', 'A YEAR ON GITHUB', 'ON THE RECEIVER']

const jobs: [string, () => Promise<string>][] = [
  ['telemetry.svg', () => telemetry(gh, live, now)],
  ...SECTIONS.map((name, i): [string, () => Promise<string>] => [`divider-${String(i + 1).padStart(2, '0')}.svg`, () => divider(i + 1, name)]),
  ['about.svg', about],
  ['link-site.svg', () => button(1, 'GALAXY', 'manav.world', '3D PORTFOLIO', 1)],
  ['link-linkedin.svg', () => button(2, 'LINKEDIN', 'linkedin.com/in/manavxa', 'PROFESSIONAL', 2)],
  ['link-email.svg', () => button(3, 'EMAIL', 'manavxa@gmail.com', 'DIRECT LINE', 3)],
  ['link-resume.svg', () => button(4, 'RÉSUMÉ', 'Manav_Acharya_Resume.pdf', 'PDF', 4)],
  ['constellations.svg', constellations],
  ['receiver.svg', () => receiver(live, now)],
  ['signoff.svg', signoff],
]

let total = 0
for (const [file, make] of jobs) {
  const svg = await make()
  writeFileSync(join(out, file), svg)
  total += svg.length
  console.log(`${file.padEnd(20)} ${(svg.length / 1024).toFixed(1).padStart(6)} KB`)
}
console.log(`${jobs.length} panels, ${(total / 1024).toFixed(0)} KB, in ${out}`)
