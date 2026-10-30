import { Fragment, type CSSProperties } from 'react'
import { mulberry32 } from './rng'
import { C, MONO, useLoop } from './type'

/**
 * Text in the README's "deep-space signal" style, for the GIFs: always readable, but now and
 * then a word catches interference and breaks into static for a fraction of a second, the way
 * the SVG panels' words do. Glitches sit inside the loop (never across its seam), so loops
 * stay seamless.
 */

const NOISE = '░▒▓<>/\\|=+*#%01'

type Props = {
  text: string
  seed: number
  /** Share of words that glitch once per loop */
  rate?: number
  style?: CSSProperties
}

export function SignalText({ text, seed, rate = 0.3, style }: Props) {
  const { u, frame } = useLoop()
  const rng = mulberry32(seed)
  const words = text.split(' ')
  return (
    <span style={style}>
      {words.map((word, i) => {
        const glitches = rng() < rate
        const start = 0.05 + rng() * 0.85
        const length = 0.012 + rng() * 0.012
        const on = glitches && u >= start && u < start + length
        let noise = ''
        if (on) {
          // Fresh static every other frame
          const n = mulberry32(seed * 977 + i * 131 + Math.floor(frame / 2))
          for (let k = 0; k < word.length; k++) noise += NOISE[Math.floor(n() * NOISE.length)]
        }
        return (
          <Fragment key={i}>
            {i > 0 && ' '}
            <span style={{ position: 'relative', display: 'inline-block' }}>
              <span style={{ visibility: on ? 'hidden' : 'visible' }}>{word}</span>
              {on && (
                <span
                  style={{
                    position: 'absolute',
                    inset: 0,
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    fontFamily: MONO,
                    fontWeight: 400,
                    letterSpacing: 0,
                    color: C.cyan,
                    fontSize: '0.92em',
                  }}
                >
                  {noise}
                </span>
              )}
            </span>
          </Fragment>
        )
      })}
    </span>
  )
}
