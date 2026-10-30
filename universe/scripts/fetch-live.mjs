// Fetches the hourly live data: the latest public push (GitHub's public events) and the recently
// played tracks (Spotify), and writes src/data/live.json. Either part degrades to "no signal" rather
// than failing the run.
//
// Env: GITHUB_TOKEN or GH_TOKEN (optional, raises the rate limit);
//      SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REFRESH_TOKEN (optional).
// usage: node scripts/fetch-live.mjs

import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const USER = 'ManavX'
const OUT = fileURLToPath(new URL('../src/data/live.json', import.meta.url))
const TRACKS = 5

async function latestPush() {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN
  const res = await fetch(`https://api.github.com/users/${USER}/events/public?per_page=50`, {
    headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'manavx-universe', ...(token ? { Authorization: `bearer ${token}` } : {}) },
  })
  if (!res.ok) throw new Error(`events ${res.status}`)
  const events = await res.json()
  // Pushes to the profile repo itself are README edits, not project work
  const push = events.find((e) => e.type === 'PushEvent' && e.repo.name.toLowerCase() !== `${USER}/${USER}`.toLowerCase())
  if (!push) return null
  return { repo: push.repo.name.split('/')[1], at: push.created_at, commits: push.payload?.size ?? push.payload?.commits?.length ?? null }
}

// Recently played (needs the user-read-recently-played permission); falls back to the top tracks
// of the last four weeks when the stored sign-in predates that permission. `source` says which.
async function tracks() {
  const { SPOTIFY_CLIENT_ID: id, SPOTIFY_CLIENT_SECRET: secret, SPOTIFY_REFRESH_TOKEN: refresh } = process.env
  if (!id || !secret || !refresh) return null
  const basic = Buffer.from(`${id}:${secret}`).toString('base64')
  const auth = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { authorization: `Basic ${basic}`, 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refresh }),
  })
  if (!auth.ok) throw new Error(`spotify sign-in ${auth.status}`)
  const { access_token } = await auth.json()
  const get = (path) => fetch(`https://api.spotify.com/v1/${path}`, { headers: { authorization: `Bearer ${access_token}` } })

  let source = 'recent'
  let list
  const recent = await get('me/player/recently-played?limit=30')
  if (recent.ok) {
    // One entry per track, most recent play first
    const seen = new Set()
    list = (await recent.json()).items
      .filter((i) => !seen.has(i.track.id) && seen.add(i.track.id))
      .map((i) => ({ track: i.track, playedAt: i.played_at }))
  } else if (recent.status === 403 || recent.status === 401) {
    console.warn('[live] spotify: no recently-played permission yet; showing top tracks (re-run the sign-in to switch)')
    source = 'top'
    const top = await get('me/top/tracks?time_range=short_term&limit=' + TRACKS)
    if (!top.ok) throw new Error(`spotify top tracks ${top.status}`)
    list = (await top.json()).items.map((track) => ({ track, playedAt: null }))
  } else throw new Error(`spotify recently played ${recent.status}`)

  const items = await Promise.all(
    list.slice(0, TRACKS).map(async ({ track: t, playedAt }, i) => {
      // Smallest cover (Spotify lists them widest first), embedded so nothing needs the network later
      const img = [...t.album.images].sort((a, b) => (a.width ?? 0) - (b.width ?? 0))[0]
      let cover = null
      if (img) {
        const r = await fetch(img.url)
        if (r.ok) cover = `data:${r.headers.get('content-type') || 'image/jpeg'};base64,${Buffer.from(await r.arrayBuffer()).toString('base64')}`
      }
      return { rank: i + 1, id: t.id, title: t.name, artists: t.artists.map((a) => a.name).join(', '), url: t.external_urls.spotify, playedAt, cover }
    }),
  )
  return { source, items }
}

const settle = async (name, fn) => {
  try {
    return await fn()
  } catch (err) {
    console.warn(`[live] ${name}: ${err.message}`)
    return null
  }
}

const music = await settle('spotify', tracks)
const live = { fetchedAt: new Date().toISOString(), push: await settle('push', latestPush), music: music?.source ?? null, tracks: music?.items ?? null }
writeFileSync(OUT, JSON.stringify(live, null, 2) + '\n')
console.log(`wrote ${OUT}: push ${live.push ? `${live.push.repo} at ${live.push.at}` : 'none'}, ${live.tracks?.length ?? 0} tracks`)
