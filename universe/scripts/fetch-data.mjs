// Fetches the public GitHub data the animations draw, and writes it to src/data/github.json.
// Only the official GitHub GraphQL API is used. Needs a token in GITHUB_TOKEN or GH_TOKEN
// (the Action's built-in token is enough: the contribution calendar is public).
//
// usage: node scripts/fetch-data.mjs [--check]
//   --check  exit 0 without writing when nothing the animations show has changed (prints "unchanged")

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const USER = 'ManavX'
const OUT = fileURLToPath(new URL('../src/data/github.json', import.meta.url))
// Repos shown as worlds, in display order. Forks and the profile repo are never shown.
const FEATURED = ['context-snap', 'chess-puzzle-generator', 'spotify-auto-curator', 'multiplayer-io-game']

const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN
if (!token) {
  console.error('Set GITHUB_TOKEN or GH_TOKEN')
  process.exit(1)
}

async function graphql(query, variables = {}) {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'manavx-universe' },
    body: JSON.stringify({ query, variables }),
  })
  if (!res.ok) throw new Error(`GitHub API ${res.status}`)
  const json = await res.json()
  if (json.errors) throw new Error(json.errors.map((e) => e.message).join('; '))
  return json.data
}

const data = await graphql(
  `query ($login: String!) {
    user(login: $login) {
      contributionsCollection {
        startedAt
        endedAt
        totalCommitContributions
        totalPullRequestContributions
        totalIssueContributions
        totalPullRequestReviewContributions
        restrictedContributionsCount
        contributionCalendar {
          totalContributions
          weeks { contributionDays { date contributionCount weekday } }
        }
      }
      repositories(first: 50, ownerAffiliations: OWNER, privacy: PUBLIC, orderBy: { field: PUSHED_AT, direction: DESC }) {
        nodes {
          name
          description
          url
          homepageUrl
          isFork
          createdAt
          pushedAt
          primaryLanguage { name color }
          languages(first: 8, orderBy: { field: SIZE, direction: DESC }) { edges { size node { name color } } }
          defaultBranchRef { target { ... on Commit { history { totalCount } } } }
        }
      }
    }
  }`,
  { login: USER },
)

const c = data.user.contributionsCollection
const days = c.contributionCalendar.weeks.flatMap((w) => w.contributionDays).map((d) => ({ date: d.date, count: d.contributionCount, weekday: d.weekday }))

// Streaks count whole days with at least one contribution. The current streak may end yesterday,
// since today isn't over yet.
let longest = { length: 0, start: null, end: null }
let run = 0
days.forEach((d, i) => {
  run = d.count > 0 ? run + 1 : 0
  if (run > longest.length) longest = { length: run, start: days[i - run + 1].date, end: d.date }
})
let current = 0
for (let i = days.length - 1; i >= 0; i--) {
  if (days[i].count > 0) current++
  else if (i === days.length - 1) continue
  else break
}
const busiest = days.reduce((a, b) => (b.count > a.count ? b : a), days[0])

const repos = data.user.repositories.nodes
  .filter((r) => !r.isFork && r.name !== USER)
  .map((r) => ({
    name: r.name,
    description: r.description,
    url: r.url,
    homepage: r.homepageUrl || null,
    createdAt: r.createdAt,
    pushedAt: r.pushedAt,
    commits: r.defaultBranchRef?.target?.history?.totalCount ?? 0,
    languages: r.languages.edges.map((e) => ({ name: e.node.name, color: e.node.color, bytes: e.size })),
  }))

// Language mix across the featured repos, by bytes of code (GitHub's own measure)
const totals = new Map()
for (const r of repos.filter((r) => FEATURED.includes(r.name))) {
  for (const l of r.languages) {
    const t = totals.get(l.name) ?? { name: l.name, color: l.color, bytes: 0 }
    t.bytes += l.bytes
    totals.set(l.name, t)
  }
}
const languageBytes = [...totals.values()].sort((a, b) => b.bytes - a.bytes)

const out = {
  // What the animations show; generatedAt alone never triggers a re-render
  user: USER,
  period: { from: days[0].date, to: days[days.length - 1].date },
  contributions: {
    total: c.contributionCalendar.totalContributions,
    privateCounted: c.restrictedContributionsCount,
    commits: c.totalCommitContributions,
    pullRequests: c.totalPullRequestContributions,
    issues: c.totalIssueContributions,
    reviews: c.totalPullRequestReviewContributions,
    activeDays: days.filter((d) => d.count > 0).length,
    longestStreak: longest,
    currentStreak: current,
    busiestDay: { date: busiest.date, count: busiest.count },
  },
  days,
  featured: FEATURED.map((name) => repos.find((r) => r.name === name)).filter(Boolean),
  languageBytes,
}

const next = JSON.stringify(out, null, 2) + '\n'
if (process.argv.includes('--check') && existsSync(OUT) && readFileSync(OUT, 'utf8') === next) {
  console.log('unchanged')
  process.exit(0)
}
writeFileSync(OUT, next)
console.log(`wrote ${OUT}: ${out.contributions.total} contributions, ${out.contributions.activeDays} active days, ${out.featured.length} repos`)
