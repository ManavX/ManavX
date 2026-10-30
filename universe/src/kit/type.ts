import { loadFont as loadInter } from '@remotion/google-fonts/Inter'
import { loadFont as loadMono } from '@remotion/google-fonts/JetBrainsMono'
import { useCurrentFrame, useVideoConfig } from 'remotion'

/** manav.world's type: Inter for names and titles, JetBrains Mono for the HUD. */
export const inter = loadInter('normal', { weights: ['400', '500', '600', '700'], subsets: ['latin'] })
export const mono = loadMono('normal', { weights: ['400', '500', '700'], subsets: ['latin'] })

export const INTER = inter.fontFamily
export const MONO = mono.fontFamily

// Site palette
export const C = {
  void: '#000000',
  hud: '#E5E7EB',
  hudDim: '#6B7280',
  orange: '#FF6B1A',
  ember: '#FB923C',
  cyan: '#22D3EE',
  paper: '#F4F1EA',
}

/** Where we are in the loop: theta runs 0 → 2π once per loop, so loop(f) motions come back to the start. */
export function useLoop() {
  const frame = useCurrentFrame()
  const { durationInFrames, fps } = useVideoConfig()
  const u = frame / durationInFrames
  return { frame, fps, u, theta: u * Math.PI * 2, period: durationInFrames / fps, seconds: frame / fps }
}

export const smooth = (x: number) => {
  const t = Math.min(1, Math.max(0, x))
  return t * t * (3 - 2 * t)
}
