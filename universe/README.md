# universe

Everything in the profile README is an animated image drawn here, in a "deep-space signal" style: text arrives as a transmission, decoding out of static under a scanning beam, then holds steady with the odd flicker of interference. The visuals reuse [manav.world](https://manav.world)'s own shaders, particle recipes, colours and type.

Two kinds of image:

| Kind | Made with | Files |
| --- | --- | --- |
| Animated SVG panels: telemetry, dividers, about, contact buttons, constellations, receiver, sign-off | `panels/` (plain Node, CSS animation, fonts embedded as subsets) | `*.svg` |
| GIFs: hero, cabin (hi-bit pixel art), year orbit, fly-by | `src/` (Remotion; React Three Fiber for the 3D ones, a 2D canvas for the cabin and year) | `*.gif`, plus a still `*.png` for reduced motion and an `*.mp4` master |

`src/heroes/Ignition.tsx`, `src/heroes/Flight.tsx`, `src/projects/Worlds.tsx` and `src/footer/Portal.tsx` are earlier designs that are no longer in the README, kept for reference.

All of it is published hourly to GitHub Pages at `https://manavx.github.io/ManavX/`, and the README points there.

## Commands

```bash
npm ci
npm run dev                        # Remotion Studio for the GIFs
npm run data                       # contribution year → src/data/github.json (needs GH_TOKEN)
node scripts/fetch-live.mjs        # latest push + Spotify recently played → src/data/live.json
node panels/build.mts out/site     # every SVG panel
npm run render -- hero             # a GIF asset (hero, cabin, year, flyby): MP4, GIF, still PNG, thumbnail
node scripts/assemble.mjs out/site # the whole Pages site (panels + GIFs + data)
npm run check:loops                # loop seams of the rendered MP4s
```

`fetch-live.mjs` reads `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET` and `SPOTIFY_REFRESH_TOKEN` from the environment (`node --env-file=...` locally). The token needs the `user-read-recently-played` permission; a token without it falls back to top tracks, labelled as such. Without any token the receiver shows "no signal". Rendering GIFs needs `ffmpeg`; the 3D ones use the GPU (`angle`), so pass `--gl swangle` on a machine without one.

## Every hour

`.github/workflows/universe.yml`:

1. Fetches the contribution calendar (GraphQL, with the workflow's own read-only token), the latest public push, and the Spotify top five.
2. Draws every SVG panel: a few seconds, no browser needed.
3. Renders a GIF only when what it shows changed since the last deploy: the Year Orbit when the contribution year changed, the cabin when the recently played tracks did. Otherwise it reuses the live one.
4. Deploys the whole folder to Pages. A deploy replaces the site, so nothing is committed and the repo doesn't grow.

GitHub pauses scheduled workflows after 60 days without repo activity, so once a week the workflow re-enables itself through the API, which counts as activity without a commit.

Setup: Settings → Pages → Source: GitHub Actions, and three repository secrets for Spotify.

## The signal style

- Body text is JetBrains Mono, so every character has the same advance: each word decodes in place, and the static that stands in for it is exactly as wide.
- Each SVG embeds only the glyphs it uses, cut from Inter and JetBrains Mono by the Google Fonts API at build time.
- Words decode left to right as the beam sweeps down; about one word in sixteen later catches interference for a fifth of a second, each on its own slow rhythm.
- In the GIFs, `SignalText` does the same: words glitch briefly at points inside the loop, never across the seam, so the loops stay seamless.
- `prefers-reduced-motion` turns the SVG animations off, leaving the decoded text, and swaps each GIF for its still.
- The skill constellations loop: every 14 s each cluster's stars gather into a picture (rocket, satellite, astronaut, UFO, telescope), the lines draw in, it holds, then the stars drift apart. The clusters run out of step.

## The cabin

`src/cabin/` draws a 640×360 pixel scene on a canvas each frame (`pixels.ts` has the primitives and a 3×5 font that also draws at 2×) and shows it scaled 2× with nearest-neighbour sampling. Its GIF is made straight from lossless PNG frames, because video compression would smear the pixel edges. The album sleeves and the LCD come from the recently played tracks, passed in as props from `live.json`.

## How the GIF loops loop

`useLoop()` gives `theta`, which runs from 0 to 2π once per loop, and every motion is a whole number of cycles of it. The shaders' `lt(f)` turns the site's `uTime * f` into the nearest whole number of cycles per loop. Randomness is seeded (`src/kit/rng.ts`), so renders are identical frame for frame. `scripts/check-loop.mjs` and `scripts/check-seam.mjs` confirm that the step from the last frame to the first is no bigger than any other step.

## Data and honesty

- Contribution counts come from GitHub's contribution calendar, which includes private work as bare counts (as the public profile already shows). Nothing about private repos is fetched.
- "Last signal" is the latest public push when there's one from the last two weeks. Otherwise it's the latest active day on the calendar, which counts private work.
- The Vancouver time and sky are as of the last hourly redraw.
- The language mix is GitHub's own byte count for the four featured repos, as of the last render of `worlds`.
