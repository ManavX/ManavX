import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AbsoluteFill, useDelayRender, useVideoConfig } from 'remotion'
import { mulberry32 } from '../kit/rng'
import { useLoop } from '../kit/type'
import { Px, pixelText } from './pixels'

/**
 * "Life on board": a hi-bit pixel scene of Manav at his desk in a spaceship cabin, seen from behind
 * the chair. Four monitors (chess, code, a terminal, Hyperdrive from manav.world); a porthole onto
 * the galaxy and the unnamed planet; a spray wall, hangboard, pull-up bar and gym rings; a chess
 * shelf; a turntable and the recently played tracks as album sleeves with an LCD; two cats with
 * routines of their own; and a few zero-g odds and ends. Drawn at 640×360 and scaled 2×; every motion completes whole cycles per loop.
 */

export const W = 640
export const H = 360

export type Track = { title: string; artists: string; cover: string | null }
export type CabinProps = { tracks: Track[]; music?: 'recent' | 'top' | null }

const P = {
  space: '#04050a',
  wall: '#161922',
  wallLight: '#1d212c',
  wallDark: '#12141b',
  seam: '#0d0f15',
  rivet: '#2c313d',
  ceiling: '#0c0e13',
  pipe: '#1f232c',
  pipeHi: '#2f3440',
  frame: '#0a0b0f',
  frameHi: '#2a2f3b',
  desk: '#2b2f3a',
  deskTop: '#3d4250',
  deskEdge: '#1e2129',
  floor: '#0e1015',
  floorLine: '#161922',
  shadow: '#08090c',
  orange: '#ff6b1a',
  orangeDim: '#a8430f',
  ember: '#d9560f',
  cyan: '#22d3ee',
  cyanDim: '#0e7490',
  bezel: '#0b0c10',
  bezelHi: '#20232b',
  hair: '#1b1513',
  hairHi: '#3a2c22',
  hairMid: '#2a201a',
  hairLo: '#0e0a09',
  skin: '#c68b6b',
  skinHi: '#d9a080',
  skinLo: '#9c6a50',
  shirt: '#15151a',
  shirtMid: '#1c1c23',
  shirtHi: '#2a3348',
  silver: '#c9ccd2',
  chair: '#18181e',
  chairHi: '#26262f',
  wood: '#7a4e2c',
  woodHi: '#9a6a40',
  woodLo: '#5a3820',
  hole: '#2a1a10',
  steel: '#9aa0aa',
  steelLo: '#5f6570',
  white: '#f4f1ea',
  green: '#5ee08f',
  greenDim: '#1f6b3d',
}

const PROJECT_COLORS = ['#3B82F6', '#1DB954', '#769656', '#FF6B6B', '#4ECDC4']
const SYNTAX = ['#c678dd', '#61afef', '#98c379', '#e5c07b', '#abb2bf', '#abb2bf', '#56b6c2', '#e06c75', '#d19a66']
const HOLDS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#f97316', '#ec4899', '#14b8a6']

// ── Room ──

function room(p: Px) {
  // Ceiling with pipes and a light panel
  p.rect(0, 0, W, 22, P.ceiling)
  p.rect(0, 6, W, 4, P.pipe)
  p.rect(0, 6, W, 1, P.pipeHi)
  p.rect(0, 13, W, 3, P.pipe)
  p.rect(0, 13, W, 1, P.pipeHi)
  for (let x = 40; x < W; x += 110) {
    p.rect(x, 5, 5, 6, '#3a3f4c')
    p.rect(x + 30, 12, 4, 5, '#3a3f4c')
  }
  p.rect(0, 21, W, 1, P.seam)
  p.rect(232, 18, 176, 3, '#59607a')
  p.rect(252, 19, 136, 1, '#8a92ad')
  // Wall: panels, seams and rivets
  p.rect(0, 22, W, 252, P.wall)
  for (let x = 79; x < W; x += 80) {
    p.rect(x, 22, 1, 252, P.seam)
    p.rect(x + 1, 22, 1, 252, P.wallLight)
  }
  p.rect(0, 178, W, 1, P.seam)
  p.rect(0, 179, W, 1, P.wallLight)
  for (let x = 6; x < W; x += 80)
    for (const y of [28, 172, 186, 266]) {
      p.px(x, y, P.rivet)
      p.px(x + 66, y, P.rivet)
    }
  // Light from the ceiling panel, dithered down the wall
  for (let y = 22; y < 40; y++) for (let x = 236 + (y - 22); x < 404 - (y - 22); x += 2) if ((x + y) % 4 === 0) p.px(x, y, '#1b1f29')
  // Vent grille, top right
  p.rect(598, 30, 32, 22, P.wallDark)
  for (let y = 32; y < 50; y += 3) p.rect(600, y, 28, 1, P.seam)
  // Hazard stripes along the bottom of the wall
  for (let x = 0; x < W; x++) if (x < 64 || x > 584) for (let y = 264; y < 272; y++) p.px(x, y, (x + y) % 10 < 5 ? '#3a2410' : '#121216')
  // Floor plates
  p.rect(0, 274, W, 86, P.floor)
  p.rect(0, 274, W, 1, '#1d212c')
  for (const y of [288, 308, 336]) p.rect(0, y, W, 1, P.floorLine)
  for (let x = -200; x < W + 200; x += 96) p.line(320 + (x - 320) * 0.45, 275, x, 359, P.floorLine)
  const grip = mulberry32(44)
  for (let i = 0; i < 160; i++) p.px(Math.floor(grip() * W), 276 + Math.floor(grip() * 84), '#13151c')
}

// ── Porthole: the galaxy, the unnamed planet, a comet and a probe ──

function porthole(p: Px, u: number, theta: number) {
  const x0 = 204
  const y0 = 38
  const w = 232
  const h = 94
  p.round(x0 - 8, y0 - 8, w + 16, h + 16, 12, P.frame)
  p.round(x0 - 8, y0 - 8, w + 16, 2, 2, P.frameHi)
  for (let x = x0; x <= x0 + w; x += 29) {
    p.rect(x, y0 - 5, 2, 2, '#3a3f4c')
    p.rect(x, y0 + h + 3, 2, 2, '#3a3f4c')
  }
  for (let y = y0 + 10; y < y0 + h; y += 26) {
    p.rect(x0 - 5, y, 2, 2, '#3a3f4c')
    p.rect(x0 + w + 3, y, 2, 2, '#3a3f4c')
  }
  p.round(x0 - 2, y0 - 2, w + 4, h + 4, 8, '#1a1d25')
  p.round(x0, y0, w, h, 7, P.space)
  const inside = (x: number, y: number) => x > x0 + 2 && x < x0 + w - 2 && y > y0 + 2 && y < y0 + h - 2
  // Stars at three depths
  const rng = mulberry32(3)
  for (let i = 0; i < 170; i++) {
    const sx = x0 + 3 + Math.floor(rng() * (w - 6))
    const sy = y0 + 3 + Math.floor(rng() * (h - 6))
    const tier = rng()
    const k = 1 + Math.floor(rng() * 3)
    const lit = Math.sin(theta * k + rng() * 6.28)
    if (tier < 0.08) {
      p.px(sx, sy, lit > 0 ? '#ffffff' : '#9fb3d1')
      if (lit > 0.6) {
        p.px(sx - 1, sy, '#3d4a66')
        p.px(sx + 1, sy, '#3d4a66')
        p.px(sx, sy - 1, '#3d4a66')
        p.px(sx, sy + 1, '#3d4a66')
      }
    } else if (lit > -0.4) p.px(sx, sy, tier < 0.4 ? '#7d8594' : '#454a55')
  }
  // The galaxy: a white core, coloured nebulae and two career rings with comets running round them
  const gx = 268
  const gy = 86
  for (const [rx, ry, col] of [[44, 11, '#4b505c'], [30, 8, '#5a4a3a']] as const) {
    p.ellipse(gx, gy, rx, ry, (t) => (Math.round(t * 20) % 2 === 0 ? col : null), 96)
  }
  for (const [rx, ry, speed, col] of [[44, 11, 1, P.orange], [30, 8, 2, '#e5e7eb']] as const) {
    for (let k = 0; k < 9; k++) {
      const t = theta * speed - k * 0.09
      p.px(Math.round(gx + Math.cos(t) * rx), Math.round(gy + Math.sin(t) * ry), k === 0 ? '#ffffff' : k < 4 ? col : '#4b3a2c')
    }
  }
  const neb = mulberry32(12)
  PROJECT_COLORS.forEach((c, i) => {
    const t = (i / 5) * Math.PI * 2 + 0.5
    const nx = gx + Math.round(Math.cos(t) * 22)
    const ny = gy + Math.round(Math.sin(t) * 6) - 2
    for (let k = 0; k < 9; k++) {
      const dx = Math.round((neb() - 0.5) * 6)
      const dy = Math.round((neb() - 0.5) * 3)
      if (k < 7 || Math.sin(theta * 2 + i + k) > 0) p.px(nx + dx, ny + dy, c)
    }
    p.px(nx, ny, '#ffffff')
  })
  p.disc(gx, gy, 4, '#5c5446')
  p.dither(gx - 4, gy - 2, 9, 5, '#8c826f', '#5c5446')
  p.disc(gx, gy, 2, '#d9cdb8')
  p.rect(gx - 1, gy - 1, 3, 3, '#fff7ed')
  // The unnamed planet: night side, orange lights, a white crescent, a dashed ring
  const px = 390
  const py = 80
  const R = 24
  const ring = (front: boolean) => {
    for (let a = 0; a < 140; a++) {
      const t = (a / 140) * Math.PI * 2
      if (Math.sin(t) < 0 === front) continue
      const rx = Math.cos(t) * 40
      const ry = Math.sin(t) * 8
      const x = Math.round(px + rx)
      const y = Math.round(py + ry - rx * 0.16)
      const behind = !front && (x - px) ** 2 + (y - py) ** 2 < R * R
      if (behind || !inside(x, y)) continue
      // Traffic in the ring moves a whole dash pattern per loop
      const dash = Math.floor((a / 140) * 48 + (theta / (Math.PI * 2)) * 48) % 3 !== 0
      if (dash) p.px(x, y, front ? (a % 2 ? P.orange : '#ff9a5a') : P.orangeDim)
    }
  }
  ring(false)
  p.disc(px, py, R, '#0b0b0e')
  const land = mulberry32(8)
  for (let i = 0; i < 120; i++) {
    const a = land() * Math.PI * 2
    const r = Math.sqrt(land()) * (R - 3)
    const lx = Math.round(px + Math.cos(a) * r)
    const ly = Math.round(py + Math.sin(a) * r)
    // Lights cluster in a few continents, and only on the night side
    const cont = Math.sin(lx * 0.31) + Math.cos(ly * 0.27) + Math.sin((lx + ly) * 0.13)
    if (cont > 0.6 && lx < px + 12 && Math.sin(theta * 3 + i) > -0.7) p.px(lx, ly, i % 4 ? P.orange : '#ffc28a')
  }
  for (let y = -R; y <= R; y++) {
    const wd = Math.floor(Math.sqrt(R * R - y * y + R * 0.8))
    p.px(px + wd, py + y, P.white)
    if (Math.abs(y) < R - 4) p.px(px + wd - 1, py + y, '#b5b0a6')
    if (Math.abs(y) < R - 10) p.px(px + wd - 2, py + y, '#55524c')
  }
  ring(true)
  // A comet crosses between 55% and 70% of the loop
  const ck = (u - 0.55) / 0.15
  if (ck > 0 && ck < 1) {
    const hx = x0 + 10 + ck * 150
    const hy = y0 + 12 + ck * 30
    for (let k = 0; k < 26; k++) {
      const tx = Math.round(hx - k * 2.2)
      const ty = Math.round(hy - k * 0.44)
      if (inside(tx, ty)) p.px(tx, ty, k === 0 ? '#ffffff' : k < 6 ? '#d9f7ff' : k < 14 ? '#a78bfa' : '#4c3a75')
    }
  }
  // A probe drifts past once per loop
  const bx = Math.round(x0 - 10 + u * (w + 20))
  const by = Math.round(y0 + h - 16 - u * 10)
  if (inside(bx - 3, by) && inside(bx + 7, by + 3)) {
    p.rect(bx, by, 4, 3, '#8a8f99')
    p.rect(bx - 3, by + 1, 3, 1, '#3b4a66')
    p.rect(bx + 4, by + 1, 3, 1, '#3b4a66')
    if (Math.sin(theta * 16) > 0.6) p.px(bx + 2, by + 3, P.orange)
  }
  // Glare on the glass
  p.line(x0 + 8, y0 + 22, x0 + 26, y0 + 4, '#141a26')
  p.line(x0 + 14, y0 + 24, x0 + 34, y0 + 4, '#11161f')
  p.line(x0 + w - 30, y0 + h - 4, x0 + w - 10, y0 + h - 22, '#11161f')
}

// ── Climbing and calisthenics, on the left ──

function training(p: Px, theta: number) {
  // Hangboard: jugs, crimps, pockets, bolted to the wall
  const x = 22
  const y = 32
  p.round(x, y, 84, 24, 3, P.wood)
  p.rect(x + 2, y, 80, 1, P.woodHi)
  p.rect(x + 2, y + 23, 80, 1, P.woodLo)
  for (let gy = y + 4; gy < y + 22; gy += 5) p.rect(x + 3, gy, 78, 1, '#6e4628')
  for (const jx of [6, 34, 62]) {
    p.round(x + jx, y + 3, 16, 6, 2, P.hole)
    p.rect(x + jx + 2, y + 9, 12, 1, P.woodLo)
  }
  for (const cx of [4, 22, 40, 58]) p.rect(x + cx, y + 12, 14, 2, P.hole)
  for (const kx of [10, 22, 54, 66]) p.round(x + kx, y + 16, 6, 5, 1, P.hole)
  for (const bx of [2, 80]) p.rect(x + bx, y + 2, 2, 2, P.steelLo)
  // Spray wall: a plywood board with a grid of T-nuts, and coloured holds, some chalked
  p.rect(14, 64, 94, 106, '#3b2a1c')
  p.rect(14, 64, 94, 1, '#5a4330')
  p.rect(14, 169, 94, 1, '#22180f')
  p.rect(14, 64, 1, 106, '#4a3524')
  p.rect(107, 64, 1, 106, '#22180f')
  for (let ty = 70; ty < 168; ty += 8) for (let tx = 19 + ((ty / 8) % 2) * 4; tx < 106; tx += 8) p.px(tx, ty, '#22180f')
  const holds = mulberry32(17)
  for (let i = 0; i < 22; i++) {
    const hx = 18 + Math.floor(holds() * 82)
    const hy = 68 + Math.floor(holds() * 94)
    const c = HOLDS[Math.floor(holds() * HOLDS.length)]
    const big = holds() < 0.3
    const s = big ? 6 : 4
    p.round(hx, hy, s, s - 1, big ? 2 : 1, c)
    p.px(hx + 1, hy, '#ffffff')
    p.px(hx + s - 1, hy + s - 2, '#1a120b')
    if (holds() < 0.4) p.dither(hx, hy - 2, s, 2, '#d8d4c8', '#3b2a1c')
  }
  // Pull-up bar on brackets, with foam grips
  const by = 66
  p.rect(120, by - 8, 3, 12, '#3b404c')
  p.rect(182, by - 8, 3, 12, '#3b404c')
  p.rect(116, by, 74, 2, P.steel)
  p.rect(116, by + 2, 74, 1, P.steelLo)
  p.rect(128, by, 12, 3, '#1a1a1f')
  p.rect(166, by, 12, 3, '#1a1a1f')
  // Chalk bag swinging from the bar
  const sway = Math.round(Math.sin(theta) * 2)
  p.line(153, by + 3, 153 + sway, by + 10, '#8a8f99')
  p.round(148 + sway, by + 10, 12, 12, 2, '#d8d4c8')
  p.rect(148 + sway, by + 10, 12, 2, '#a19c90')
  p.rect(150 + sway, by + 14, 3, 3, '#e8e6e0')
  if (Math.sin(theta * 2) > 0.6) p.px(153 + sway, by + 24, '#e8e6e0')
  // Gym rings on straps from the ceiling, swinging gently
  for (const [ax, phase] of [[132, 0], [174, 0.5]] as const) {
    const swing = Math.sin(theta + phase) * 4
    const rx = Math.round(ax + swing)
    p.line(ax, 22, rx, 120, '#5a3d24')
    p.line(ax + 1, 22, rx + 1, 120, '#3a2817')
    p.rect(rx - 2, 118, 6, 3, '#26262e')
    p.ellipse(rx + 1, 130, 7, 8, '#b07a48', 48)
    p.ellipse(rx + 1, 130, 6, 7, '#8a5a32', 48)
  }
  // Crash pad, with the climbing shoes on it; parallettes beside it
  p.round(10, 296, 104, 24, 3, '#1f3a5f')
  p.rect(12, 296, 100, 2, '#2c5282')
  p.rect(10, 312, 104, 1, '#16304f')
  for (let sx = 16; sx < 110; sx += 10) p.px(sx, 304, '#16304f')
  const shoe = ['..ooooo.', '.ooooooo', 'oooooooo', 'kkkkkkkk']
  p.sprite(shoe, { o: '#c2410c', k: '#1a1a1f' }, 30, 290)
  p.sprite(shoe, { o: '#c2410c', k: '#1a1a1f' }, 42, 291)
  for (const lx of [124, 160]) {
    p.rect(lx, 302, 30, 3, '#9a6a40')
    p.rect(lx, 302, 30, 1, '#b8834f')
    p.rect(lx + 3, 305, 2, 8, '#1a1a1f')
    p.rect(lx + 25, 305, 2, 8, '#1a1a1f')
    p.rect(lx + 1, 313, 8, 2, '#1a1a1f')
    p.rect(lx + 21, 313, 8, 2, '#1a1a1f')
  }
}

// ── Music, chess and keepsakes, on the right ──

function rightWall(p: Px, covers: (HTMLCanvasElement | null)[], tracks: Track[], u: number, music: CabinProps['music'], theta: number) {
  // Album sleeves of the recently played tracks
  p.rect(452, 68, 180, 4, P.desk)
  p.rect(452, 68, 180, 1, P.deskTop)
  covers.forEach((cv, i) => {
    const x = 458 + i * 34
    p.rect(x - 1, 40, 28, 28, P.bezel)
    if (cv) p.ctx.drawImage(cv, x, 41)
    else p.rect(x, 41, 26, 26, '#2a2f3b')
    p.rect(x + 26, 41, 1, 27, '#05060a')
  })
  // LCD cycling through them
  const x = 454
  const y = 80
  p.round(x, y, 176, 48, 3, P.bezel)
  p.rect(x + 3, y + 3, 170, 42, '#06120b')
  for (let sy = y + 4; sy < y + 45; sy += 2) p.rect(x + 3, sy, 170, 1, '#071509')
  p.text(music === 'top' ? 'TOP TRACKS' : 'LAST PLAYED', x + 7, y + 6, P.greenDim)
  if (tracks.length) {
    // Switches tracks between other events, not on the loop seam
    const i = Math.floor(((u + 0.1) % 1) * tracks.length)
    p.text(`${i + 1}/${tracks.length}`, x + 150, y + 6, P.greenDim)
    p.text(tracks[i].title, x + 7, y + 15, P.green, 160, 2)
    p.text(tracks[i].artists, x + 7, y + 30, '#3fae6c', 110)
    tracks.forEach((_, k) => p.rect(x + 7 + k * 8, y + 39, 6, 2, k === i ? P.green : P.greenDim))
    // A small level meter
    for (let b = 0; b < 8; b++) {
      const lv = 2 + Math.round(Math.abs(Math.sin(theta * (4 + (b % 3)) + b)) * 8)
      p.rect(x + 122 + b * 6, y + 42 - lv, 4, lv, b > 5 ? '#e5c07b' : P.greenDim)
    }
  } else p.text('NO SIGNAL', x + 7, y + 15, P.green, 160, 2)
  // Mission patch
  const cx = 594
  const cy = 148
  p.disc(cx, cy, 20, P.orange)
  p.disc(cx, cy, 18, '#101a33')
  p.disc(cx + 6, cy + 4, 6, '#0b0b0e')
  for (let yy = -5; yy <= 5; yy++) p.px(cx + 6 + Math.floor(Math.sqrt(36 - yy * yy)), cy + 4 + yy, P.white)
  p.ellipse(cx + 6, cy + 4, 11, 3, (t) => (Math.sin(t) > 0 || Math.abs(Math.cos(t)) > 0.6 ? P.orange : null), 40)
  p.sprite(['..w..', '.www.', '.wcw.', '.www.', 'wwwww', 'o.o.o'], { w: '#e5e7eb', c: P.cyan, o: P.orange }, cx - 12, cy - 12)
  for (let k = 0; k < 12; k++) p.px(cx - 8 + ((k * 7) % 16), cy - 14 + ((k * 5) % 10), '#ffffff')
  p.text('MW-01', cx - 9, cy + 23, '#6b7280')
  // Chess shelf: pieces and a clock
  p.rect(530, 196, 102, 4, P.desk)
  p.rect(530, 196, 102, 1, P.deskTop)
  const king = ['..w..', '.www.', '..w..', '.www.', '.www.', '..w..', '.www.', 'wwwww']
  const knight = ['.ww..', 'wwww.', 'w.ww.', '..ww.', '.www.', '.www.', 'wwwww']
  const pawn = ['.w.', 'www', '.w.', 'www']
  p.sprite(king, { w: '#e8e2d6' }, 536, 188)
  p.sprite(knight, { w: '#1c1c1c' }, 546, 189)
  p.sprite(pawn, { w: '#e8e2d6' }, 556, 192)
  p.sprite(pawn, { w: '#1c1c1c' }, 561, 192)
  // Chess clock, one side running
  p.rect(572, 182, 34, 14, '#2a1d14')
  p.rect(572, 182, 34, 1, '#4a3424')
  p.disc(581, 189, 5, '#e8e2d6')
  p.disc(597, 189, 5, '#e8e2d6')
  const ta = theta * 2
  p.line(581, 189, 581 + Math.round(Math.cos(ta) * 4), 189 + Math.round(Math.sin(ta) * 4), '#111111')
  p.line(597, 189, 597, 185, '#111111')
  p.rect(578, 179, 6, 3, Math.sin(theta * 2) > 0 ? '#ef4444' : '#7f1d1d')
  p.rect(594, 179, 6, 3, '#3b404c')
  // Small trophy
  p.sprite(['yyyyy', 'yyyyy', '.yyy.', '..y..', '.yyy.'], { y: '#e5c07b' }, 614, 189)
}

// ── Desk, monitors and what's on them ──

function desk(p: Px, theta: number) {
  p.rect(0, 222, W, 52, P.shadow)
  p.rect(56, 220, 548, 9, P.desk)
  p.rect(56, 220, 548, 1, P.deskTop)
  p.rect(56, 229, 548, 6, P.deskEdge)
  const glow = Math.sin(theta * 2) > 0 ? P.orange : P.ember
  p.rect(58, 235, 544, 1, glow)
  for (let x = 58; x < 602; x += 2) p.px(x, 236, '#3a1d0c')
  p.rect(70, 236, 6, 64, '#1a1d24')
  p.rect(584, 236, 6, 64, '#1a1d24')
}

function monitor(p: Px, x: number, y: number, w: number, h: number) {
  p.round(x, y, w, h, 2, P.bezel)
  p.rect(x + 2, y, w - 4, 1, P.bezelHi)
  const cx = x + Math.floor(w / 2)
  p.rect(cx - 3, y + h, 6, 220 - (y + h), '#1a1d24')
  p.rect(cx - 2, y + h, 1, 220 - (y + h), '#262a33')
  p.rect(cx - 14, 218, 28, 2, '#262a33')
  p.px(x + w - 5, y + h - 2, '#22c55e')
  // Screen glow on the desk
  for (let gx = x + 4; gx < x + w - 4; gx += 3) p.px(gx, 221, '#3d4560')
}

function chess(p: Px, x: number, y: number, u: number) {
  const sq = 7
  const light = '#eeeed2'
  const dark = '#769656'
  const glyph: Record<string, string[]> = {
    p: ['..o..', '.ooo.', '..o..', '.ooo.', 'ooooo'],
    n: ['.oo..', 'oooo.', '.ooo.', '..oo.', 'ooooo'],
    b: ['..o..', '.oo..', '.ooo.', '..o..', 'ooooo'],
    r: ['o.o.o', 'ooooo', '.ooo.', '.ooo.', 'ooooo'],
    q: ['o.o.o', '.ooo.', '..o..', '.ooo.', 'ooooo'],
    k: ['..o..', '.ooo.', '..o..', '.ooo.', 'ooooo'],
  }
  const board = ['r.bqk..r', 'pppp.ppp', '..n..n..', '..b.p...', '..B.P...', '...P.N..', 'PPP..PPP', 'RNBQ.RK.']
  // A knight considers a jump, then thinks better of it
  const thinking = u > 0.3 && u < 0.62
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++) {
      let col = (r + c) % 2 ? dark : light
      if (thinking && ((r === 5 && c === 5) || (r === 3 && c === 6))) col = (r + c) % 2 ? '#baca44' : '#f6f669'
      p.rect(x + c * sq, y + r * sq, sq, sq, col)
    }
  const draw = (ch: string, c: number, r: number) => {
    const white = ch === ch.toUpperCase()
    p.sprite(glyph[ch.toLowerCase()], { o: white ? '#ffffff' : '#1a1a1a' }, x + c * sq + 1, y + r * sq + 1)
    if (white) p.rect(x + c * sq + 1, y + r * sq + 5, 5, 1, '#9a9a9a')
  }
  board.forEach((row, r) => {
    for (let c = 0; c < 8; c++) if (row[c] !== '.' && !(thinking && r === 5 && c === 5)) draw(row[c], c, r)
  })
  if (thinking) draw('N', 6, 3)
  // Evaluation bar, clocks and move list
  const ex = x + 58
  const ev = 30 + Math.round(Math.sin(u * Math.PI * 2) * 6)
  p.rect(ex, y, 4, 56, '#2b2b2b')
  p.rect(ex, y + 56 - ev, 4, ev, '#f2f2f2')
  const px = ex + 7
  p.text('BOT', px, y, '#9ca3af')
  p.rect(px, y + 7, 26, 9, '#262626')
  p.text('3:58', px + 2, y + 9, '#9ca3af')
  for (let i = 0; i < 4; i++) p.rect(px, y + 20 + i * 5, 10 + ((i * 7) % 12), 2, i === 3 && thinking ? '#f6f669' : '#4b5563')
  p.rect(px, y + 40, 26, 9, '#e5e7eb')
  p.text('4:12', px + 2, y + 42, '#111111')
  p.text('YOU', px, y + 51, '#e5e7eb')
}

function codeEditor(p: Px, x: number, y: number, w: number, h: number, u: number, theta: number) {
  p.rect(x, y, w, h, '#0d1117')
  p.rect(x, y, w, 6, '#161b22')
  p.rect(x + 2, y + 1, 22, 5, '#0d1117')
  p.px(x + 4, y + 3, P.orange)
  p.rect(x + 7, y + 3, 14, 1, '#8b949e')
  p.rect(x + 28, y + 3, 14, 1, '#484f58')
  p.rect(x + 46, y + 3, 12, 1, '#484f58')
  const LINES = 60
  const rng = mulberry32(11)
  const lines = Array.from({ length: LINES }, () => {
    const indent = Math.floor(rng() * 4) * 4
    const n = rng() < 0.12 ? 0 : 1 + Math.floor(rng() * 5)
    return { indent, tokens: Array.from({ length: n }, () => [2 + Math.floor(rng() * 10), SYNTAX[Math.floor(rng() * SYNTAX.length)]] as [number, string]) }
  })
  const rows = Math.floor((h - 9) / 3)
  const scroll = Math.floor(u * LINES)
  for (let r = 0; r < rows; r++) {
    const line = lines[(scroll + r) % LINES]
    const ly = y + 8 + r * 3
    p.rect(x + 2, ly, 3, 1, '#30363d')
    let lx = x + 9 + line.indent
    for (const [len, c] of line.tokens) {
      const cut = Math.min(len, x + w - 9 - lx)
      if (cut > 0) p.rect(lx, ly, cut, 1, c)
      lx += len + 2
    }
  }
  // The line being typed, and the cursor
  const ly = y + 8 + (rows - 1) * 3
  p.rect(x + 7, ly - 1, w - 16, 3, '#161b22')
  const typed = Math.floor(((u * 6 + 0.37) % 1) * 40)
  p.rect(x + 9, ly, typed, 1, '#e5e7eb')
  if (Math.sin(theta * 24) > 0) p.rect(x + 9 + typed, ly - 1, 1, 3, '#ffffff')
  // Minimap down the right edge
  for (let r = 0; r < 26; r++) p.rect(x + w - 6, y + 8 + r * 2, 2 + ((r * 5) % 4), 1, SYNTAX[r % SYNTAX.length] + '88')
  p.rect(x + w - 7, y + 20, 6, 8, '#ffffff14')
}

function terminal(p: Px, x: number, y: number, w: number, h: number, u: number, theta: number) {
  p.rect(x, y, w, h, '#050a08')
  p.rect(x, y, w, 5, '#0f1a14')
  for (const [cx, c] of [[3, '#ef4444'], [7, '#eab308'], [11, '#22c55e']] as const) p.px(x + cx, y + 2, c)
  const LINES = 36
  const rng = mulberry32(23)
  const lines = Array.from({ length: LINES }, (_, i) => {
    const prompt = i % 6 === 0
    const n = prompt ? 2 : 1 + Math.floor(rng() * 3)
    return { prompt, tokens: Array.from({ length: n }, () => [3 + Math.floor(rng() * 12), prompt ? '#e5e7eb' : rng() < 0.7 ? '#4ade80' : '#6b7280'] as [number, string]) }
  })
  const rows = Math.floor((h - 18) / 3)
  const k = (u * 2 + 0.21) % 1
  const scroll = Math.floor(k * LINES)
  for (let r = 0; r < rows; r++) {
    const line = lines[(scroll + r) % LINES]
    const ly = y + 8 + r * 3
    let lx = x + 3
    if (line.prompt) {
      p.rect(lx, ly, 2, 1, P.orange)
      lx += 4
    }
    for (const [len, c] of line.tokens) {
      const cut = Math.min(len, x + w - 3 - lx)
      if (cut > 0) p.rect(lx, ly, cut, 1, c)
      lx += len + 2
    }
  }
  // A deploy progress bar that fills, ticks, and starts again
  const by = y + h - 8
  p.text('DEPLOY', x + 3, by - 1, '#6b7280')
  p.rect(x + 30, by, w - 36, 4, '#16231b')
  const fill = Math.min(1, ((u * 3 + 0.6) % 1) * 1.25)
  p.rect(x + 30, by, Math.round((w - 36) * fill), 4, fill >= 1 ? '#22c55e' : '#4ade80')
  if (fill >= 1 && Math.sin(theta * 12) > -0.5) p.text('OK', x + w - 14, by - 7, '#22c55e')
}

function hyperdrive(p: Px, x: number, y: number, w: number, h: number, u: number, theta: number) {
  p.rect(x, y, w, h, '#03050b')
  const rng = mulberry32(21)
  for (let i = 0; i < 50; i++) {
    const sx = x + Math.floor(rng() * w)
    const speed = 1 + Math.floor(rng() * 3)
    const sy = y + ((Math.floor(rng() * h) + Math.floor(u * h * speed * 2)) % h)
    p.px(sx, sy, speed > 2 ? '#cfe3ff' : speed > 1 ? '#6b7280' : '#374151')
    if (speed > 2) p.px(sx, sy - 1, '#4b5563')
  }
  const rock = ['..oooo..', '.oohooo.', 'ooooohoo', 'oohooooo', '.ooooho.', '..oooo..']
  for (let i = 0; i < 5; i++) {
    const ax = x + 6 + ((i * 19 + 7) % (w - 16))
    const ay = y + ((Math.floor(u * (h + 12) * (i % 2 ? 2 : 1)) + i * 13) % (h + 12)) - 6
    if (ay > y - 4 && ay < y + h - 5) p.sprite(rock, { o: i % 2 ? '#8b8f98' : '#6b6f78', h: '#3b3f48' }, ax, ay)
  }
  // The ship weaves and fires
  const sx = x + Math.floor(w / 2) + Math.round(Math.sin(theta * 2) * (w / 2 - 10)) - 4
  const sy = y + h - 11
  p.sprite(['....c....', '...ccc...', '...cwc...', '..ccccc..', '.cc.c.cc.', 'cc..c..cc', '.o.....o.'], { c: P.cyan, w: '#ffffff', o: Math.sin(theta * 30) > 0 ? P.orange : '#ffd2a8' }, sx, sy)
  for (let b = 0; b < 4; b++) {
    const by = sy - 3 - ((Math.floor(u * 192) + b * 12) % 48)
    if (by > y + 8) p.rect(sx + 4, by, 1, 3, P.orange)
  }
  // An asteroid bursts, twice per loop
  const e = (u * 2 + 0.3) % 1
  if (e < 0.12) {
    const r = Math.round(e * 60)
    const ex = x + 30
    const ey = y + 22
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2
      p.px(ex + Math.round(Math.cos(a) * r), ey + Math.round(Math.sin(a) * r * 0.8), k % 2 ? P.orange : '#fde68a')
    }
  }
  p.rect(x, y, w, 7, '#03050b')
  p.text('HYPERDRIVE', x + 3, y + 1, '#ff9a5a')
  p.text('HI 1337', x + w - 30, y + 1, '#6b7280')
}

function deskThings(p: Px, theta: number, u: number) {
  // Speaker, left end of the desk
  p.round(62, 190, 22, 30, 2, '#14161b')
  p.rect(64, 190, 18, 1, '#262a33')
  const beat = Math.abs(Math.sin(theta * 8)) > 0.6
  p.disc(73, 210, beat ? 7 : 6, '#262a33')
  p.disc(73, 210, 3, '#1a1d24')
  p.px(73, 210, beat ? P.green : '#3b404c')
  p.disc(73, 197, 3, '#262a33')
  p.px(73, 197, '#6b7280')
  // Plant with a grow light
  p.sprite(['....g.g....', '..g.ggg.g..', '.ggggggggg.', 'gg..ggg..gg', '...ggggg...', '..ppppppp..', '..ppppppp..', '...ppppp...'], { g: '#22a35a', p: '#6b4a32' }, 88, 206)
  p.rect(90, 202, 1, 2, '#a855f7')
  // Game controller
  p.sprite(['.kkkkkkkkk.', 'kkkkkkkkkkk', 'kckkkkkkrkk', 'kkkkkkkkkkk', 'kk.......kk'], { k: '#2a2d35', c: P.cyan, r: P.orange }, 132, 213)
  // Mug with steam
  p.sprite(['.wwwww.', 'wwwwwww.', 'wwwwwwwo', 'wwwwwww.o', 'wwwwwwwo', 'wwwwwww.', '.wwwww.'], { w: '#e8e2d6', o: '#e8e2d6' }, 228, 211)
  p.rect(229, 213, 6, 1, P.orange)
  for (let i = 0; i < 6; i++) {
    const k = (u * 3 + i / 6) % 1
    const sx = 231 + Math.round(Math.sin(k * 6.28 + i) * 2)
    const sy = 208 - Math.floor(k * 20)
    if (k < 0.85) p.px(sx, sy, k < 0.4 ? '#6b7280' : '#3b404c')
  }
  // Mouse with a glowing scroll wheel
  p.round(392, 213, 8, 6, 2, '#22252d')
  p.px(395, 214, P.orange)
  // Rubber duck, for debugging
  p.sprite(['..yy..', '.yyyb.', '.yyyyo', 'yyyyy.', '.yyyy.'], { y: '#facc15', b: '#111111', o: P.orange }, 418, 213)
  // Turntable with a spinning record, right end of the desk
  p.round(540, 204, 52, 16, 2, '#2a2420')
  p.rect(542, 204, 48, 1, '#3d3530')
  p.disc(560, 210, 9, '#0d0d10')
  p.ellipse(560, 210, 6, 6, '#1f1f24', 32)
  p.disc(560, 210, 2, P.orange)
  const ra = theta * 4
  p.px(560 + Math.round(Math.cos(ra) * 5), 210 + Math.round(Math.sin(ra) * 5), '#4b4b55')
  p.line(584, 206, 578, 214, P.steel)
  p.rect(583, 205, 3, 3, P.steelLo)
  // Sticky notes on the monitor bezels
  p.rect(218, 142, 8, 7, '#facc15')
  p.rect(219, 144, 5, 1, '#a16207')
  p.rect(219, 146, 4, 1, '#a16207')
  p.rect(414, 142, 8, 7, '#fb923c')
  p.rect(415, 144, 5, 1, '#9a3412')
}

function pcTower(p: Px, theta: number, u: number) {
  p.rect(474, 240, 44, 58, '#121318')
  p.rect(474, 240, 44, 1, '#262a33')
  p.rect(478, 244, 36, 50, '#0a0b0f')
  // 48 steps per loop, a multiple of the blade symmetry, so the fans line up at the seam
  const spin = Math.floor(u * 48) % 4
  for (const [fx, fy, c] of [[496, 256, P.orange], [496, 280, P.cyan]] as const) {
    p.ellipse(fx, fy, 9, 9, c, 48)
    for (let b = 0; b < 4; b++) {
      const a = (b / 4) * Math.PI * 2 + spin * (Math.PI / 8)
      p.line(fx, fy, fx + Math.round(Math.cos(a) * 7), fy + Math.round(Math.sin(a) * 7), '#2a2f3b')
    }
    p.disc(fx, fy, 1, c)
  }
  p.rect(476, 296, 40, 2, Math.sin(theta * 2) > 0 ? '#7c3aed' : '#4c1d95')
}

// ── You, from behind the chair ──

/** A limb as a thick tapered stroke from a to b, with a rim of light along its outer side */
function limb(p: Px, ax: number, ay: number, bx: number, by: number, wa: number, wb: number, fill: string, rim: string, rimSide: number) {
  const dx = bx - ax
  const dy = by - ay
  const len = Math.hypot(dx, dy)
  const nx = -dy / len
  const ny = dx / len
  const steps = Math.ceil(len * 2)
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const x = ax + dx * t
    const y = ay + dy * t
    const half = (wa + (wb - wa) * t) / 2
    for (let k = -half; k <= half; k += 0.5) p.px(Math.round(x + nx * k), Math.round(y + ny * k), fill)
    p.px(Math.round(x + nx * half * rimSide), Math.round(y + ny * half * rimSide), rim)
  }
}

/** Half-width of the back of his head at row y (relative to the head's centre) */
function headHalf(y: number) {
  if (y < -4) return 29 * Math.sqrt(Math.max(0, 1 - ((y + 4) / 27) ** 2))
  if (y <= 8) return 29 - (y + 4) * 0.12
  return Math.max(0, 27.5 - (y - 8) * 0.95)
}

function you(p: Px, theta: number) {
  const cx = 320
  const l = Math.sin(theta * 18) > 0 ? 1 : 0
  const r = Math.sin(theta * 18 + 1.7) > 0 ? 1 : 0
  // Keyboard, centred under his hands
  p.round(258, 213, 124, 7, 2, '#22252d')
  for (let k = 0; k < 30; k++) p.rect(261 + k * 4, 215, 3, 2, Math.sin(theta * 3 + k * 0.7) > 0.5 ? P.orangeDim : '#3a3f4c')
  // Forearms reach forward from his elbows; only the wrists show above his shoulders
  const wristL = [cx - 38, 220 - l]
  const wristR = [cx + 38, 220 - r]
  limb(p, cx - 48, 250, wristL[0], wristL[1], 12, 10, P.shirt, '#3b4a6b', 1)
  limb(p, cx + 48, 250, wristR[0], wristR[1], 12, 10, P.shirt, '#3b4a6b', -1)
  // Cuffs
  limb(p, wristL[0] - 1, wristL[1] + 6, wristL[0], wristL[1] + 1, 11, 11, '#25262e', '#3b4a6b', 1)
  limb(p, wristR[0] + 1, wristR[1] + 6, wristR[0], wristR[1] + 1, 11, 11, '#25262e', '#3b4a6b', -1)
  // Hands on the keys, typing in turn
  const hand = ['..ssssss..', '.ssssssss.', 'ssssssssss', 'ssssssssss', 'shshshshs.', '.s.s.s.s..']
  p.sprite(hand, { s: P.skin, h: P.skinLo }, wristL[0] - 4, wristL[1] - 8)
  p.rect(wristL[0] - 2, wristL[1] - 8, 4, 1, P.skinHi)
  p.sprite(hand, { s: P.skin, h: P.skinLo }, wristR[0] - 5, wristR[1] - 8, true)
  p.rect(wristR[0] - 1, wristR[1] - 8, 4, 1, P.skinHi)
  // His watch, on the left wrist
  p.rect(wristL[0] - 5, wristL[1] - 2, 11, 3, P.silver)
  p.rect(wristL[0] - 2, wristL[1] - 3, 5, 5, '#d8dbe0')
  p.rect(wristL[0] - 1, wristL[1] - 2, 3, 3, '#5f6570')
  p.px(wristL[0], wristL[1] - 1, '#ffffff')
  // Shoulders and back: slope out from the neck, rim-lit by the monitors; the chair hides the rest
  const top = 226
  const SH = 62
  for (let j = 0; j < 80; j++) {
    const half = j < 26 ? Math.round(22 + Math.sqrt(j / 26) * (SH - 22)) : SH
    const y = top + j
    p.rect(cx - half, y, half * 2, 1, P.shirt)
    const lit = j < 14
    p.px(cx - half, y, lit ? '#4a5a80' : '#262833')
    p.px(cx + half - 1, y, lit ? '#4a5a80' : '#262833')
  }
  for (let x = -(SH - 1); x <= SH - 1; x++) {
    if (Math.abs(x) < 22) continue
    p.px(cx + x, top + Math.round(26 * ((Math.abs(x) - 22) / (SH - 22)) ** 2), '#3b4a6b')
  }
  p.rect(cx - 21, top, 42, 1, '#3b4a6b')
  // Shirt: yoke seam and shoulder seams
  p.line(cx - 40, top + 14, cx + 40, top + 14, '#1a1a21')
  p.line(cx - 34, top + 3, cx - 48, top + 15, P.shirtMid)
  p.line(cx + 34, top + 3, cx + 48, top + 15, P.shirtMid)
  // Upper arms hang at his sides, down to his elbows on the armrests
  const elbowL = [cx - 66, 290]
  const elbowR = [cx + 66, 290]
  limb(p, cx - 54, 236, elbowL[0], elbowL[1], 17, 15, P.shirt, '#4a5a80', 1)
  limb(p, cx + 54, 236, elbowR[0], elbowR[1], 17, 15, P.shirt, '#4a5a80', -1)
  p.disc(elbowL[0], elbowL[1], 7, P.shirt)
  p.disc(elbowR[0], elbowR[1], 7, P.shirt)
  p.line(cx - 56, 246, cx - 64, 280, P.shirtMid)
  p.line(cx + 56, 246, cx + 64, 280, P.shirtMid)
  // Collar and neck
  p.sprite(['cccc..............cccc', '.cccc............cccc.', '..ccccc........ccccc..', '....cccc......cccc....', '......cccc..cccc......'], { c: '#2e2e38' }, cx - 11, top - 4)
  // Head from behind, bobbing now and then
  const nod = Math.sin(theta * 2) > 0.92 ? 1 : 0
  const hy = 197 + nod
  // Nape of the neck, under the hairline
  for (let y = hy + 14; y < top + 1; y++) {
    const half = 10
    p.rect(cx - half, y, half * 2, 1, P.skin)
    p.px(cx - half, y, P.skinLo)
    p.px(cx + half - 1, y, P.skinLo)
  }
  p.rect(cx, hy + 18, 1, top - hy - 18, P.skinLo)
  // Ears tucked against the head, the back of each catching a little light
  const EAR = [1, 2, 3, 3, 3, 3, 3, 2, 2, 1]
  for (const side of [-1, 1]) {
    EAR.forEach((out, k) => {
      const y = hy + 1 + k
      const edge = Math.round(headHalf(y - hy))
      for (let o = 0; o <= out; o++) {
        const x = side < 0 ? cx - edge - o : cx + edge - 1 + o
        p.px(x, y, o === out ? P.skinHi : o === 0 ? P.skinLo : P.skin)
      }
    })
  }
  // Hair: a curly mass, full on top and narrowing to the nape
  for (let y = -30; y <= 22; y++) {
    const half = headHalf(y)
    for (let x = -Math.ceil(half) - 2; x <= Math.ceil(half) + 2; x++) {
      // Curls push the outline out in little bumps
      const bump = ((x * 5 + y * 3 + 400) % 6 < 2 ? 1.5 : 0) + ((x + y * 4 + 400) % 9 === 0 ? 1 : 0)
      if (Math.abs(x) > half + bump || half <= 0) continue
      if (y > 16 && Math.abs(x) > half - 1) continue
      p.px(cx + x, hy + y, P.hair)
    }
  }
  // Coily texture: small rings, lit on top, shadowed underneath
  for (let gy = -28; gy <= 20; gy += 4) {
    const shift = (((gy + 28) / 4) % 2) * 2
    for (let gx = -30 + shift; gx <= 30; gx += 4) {
      if (Math.abs(gx) > headHalf(gy) - 1) continue
      const lit = gy < -6 ? P.hairHi : gy < 8 ? P.hairMid : '#221a15'
      const cxp = cx + gx
      const cyp = hy + gy
      p.px(cxp - 1, cyp - 1, lit)
      p.px(cxp, cyp - 1, lit)
      p.px(cxp - 2, cyp, lit)
      p.px(cxp + 1, cyp + 1, P.hairLo)
      p.px(cxp, cyp + 1, P.hairLo)
    }
  }
  // The hairline over the nape: a few curls dipping down
  for (const x of [-9, -4, 2, 7]) p.rect(cx + x, hy + 20, 3, 2, P.hair)
  // Glasses: the arms hook down behind his ears
  for (const side of [-1, 1]) {
    const edge = Math.round(headHalf(1))
    const ex = side < 0 ? cx - edge - 3 : cx + edge + 2
    p.px(ex, hy + 1, '#d4d9e1')
    p.px(ex + side, hy + 2, '#c4cad3')
    p.px(ex + side, hy + 3, '#a8afba')
    p.px(ex - side * 2, hy, '#c4cad3')
  }
  // Monitor light along the top of his hair
  for (let x = -14; x <= 14; x += 2) p.px(cx + x, hy - 30 + Math.round((x * x) / 60), '#4a5a80')
  if (Math.sin(theta * 4) > 0) p.rect(cx + 8, hy - 27, 4, 1, '#3d4a66')
}

function chair(p: Px, theta: number) {
  const cx = 320
  // Armrests: padded tops on posts, his elbows resting on them
  for (const side of [-1, 1]) {
    const ax = cx + side * 66
    p.rect(ax - 3, 297, 7, 34, '#16171c')
    p.rect(side < 0 ? ax - 3 : ax + 3, 297, 1, 34, '#26272e')
    p.round(ax - 13, 292, 27, 7, 3, '#1c1d24')
    p.rect(ax - 11, 292, 23, 1, '#3a3c46')
    p.rect(ax - 12, 298, 25, 1, '#101115')
  }
  // Seat edge, peeking out either side of the back
  p.round(262, 336, 116, 8, 3, '#15161b')
  p.rect(266, 336, 108, 1, '#2a2b33')
  // Back: a curved frame with a woven mesh, lumbar band and badge
  const x0 = 272
  const y0 = 246
  const w = 96
  const h = 92
  p.round(x0, y0, w, h, 14, '#202129')
  p.round(x0 + 3, y0 + 3, w - 6, h - 6, 12, '#141519')
  for (let y = y0 + 4; y < y0 + h - 4; y++) {
    for (let x = x0 + 4; x < x0 + w - 4; x++) {
      // Only inside the rounded inner panel
      const dx = Math.max(0, Math.abs(x - (x0 + w / 2)) - (w / 2 - 16))
      const dy = Math.max(0, Math.abs(y - (y0 + h / 2)) - (h / 2 - 16))
      if (dx * dx + dy * dy > 11 * 11) continue
      const weave = (x + y) % 4 === 0 || (x - y + 400) % 4 === 0
      // Darker toward the sides, where the mesh curves away
      const edge = Math.abs(x - (x0 + w / 2)) > w / 2 - 14
      if (weave) p.px(x, y, edge ? '#1b1c22' : '#24252d')
    }
  }
  // Frame highlights: monitor light along the top, a cooler edge down the sides
  for (let x = x0 + 12; x < x0 + w - 12; x++) p.px(x, y0, '#3d4253')
  p.rect(x0, y0 + 14, 1, h - 28, '#2c2e38')
  p.rect(x0 + w - 1, y0 + 14, 1, h - 28, '#2c2e38')
  p.px(x0 + 4, y0 + 5, '#3d4253')
  p.px(x0 + w - 5, y0 + 5, '#3d4253')
  // Badge: an orange chevron near the top
  p.sprite(['...o...', '..ooo..', '.oo.oo.', 'oo...oo'], { o: P.orange }, cx - 3, y0 + 8)
  // Lumbar band with orange piping and an adjuster
  p.round(x0 + 10, y0 + 54, w - 20, 14, 5, '#1d1410')
  p.rect(x0 + 14, y0 + 54, w - 28, 1, Math.sin(theta * 2) > 0 ? P.orange : P.ember)
  p.rect(x0 + 14, y0 + 67, w - 28, 1, P.orangeDim)
  for (let x = x0 + 16; x < x0 + w - 16; x += 4) p.px(x, y0 + 61, '#2e2018')
  p.round(x0 + w - 22, y0 + 58, 6, 6, 2, '#2a2b33')
  p.px(x0 + w - 19, y0 + 60, '#6b7280')
  // Bracket down to the seat, gas lift and base
  p.rect(cx - 5, y0 + h, 10, 6, '#1a1b20')
  p.rect(cx - 3, 344, 6, 8, '#2a2b33')
  p.rect(cx - 2, 344, 1, 8, '#4b4e5a')
  for (const [ex, ey] of [[282, 358], [358, 358], [300, 360], [340, 360]]) {
    p.line(cx, 352, ex, ey, '#16161b')
    p.line(cx, 353, ex, ey + 1, '#16161b')
    p.round(ex - 2, ey - 1, 5, 3, 1, '#0a0a0d')
  }
}

// ── Cats ──

type Coat = { fur: string; dark: string; light: string; white: string; eye: string }
const TABBY: Coat = { fur: '#e8873a', dark: '#b5602a', light: '#f6c08a', white: '#fbf3e8', eye: '#1a1a1a' }
const GREY: Coat = { fur: '#8b93a1', dark: '#5b6270', light: '#c3c9d3', white: '#f1f2f4', eye: '#1a1a1a' }

function blob(p: Px, cx: number, cy: number, rx: number, ry: number, c: string) {
  for (let y = -ry; y <= ry; y++) {
    const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry + 0.6))))
    p.rect(cx - w, cy + y, w * 2 + 1, 1, c)
  }
}

/** Cat's head, facing right unless flipped; (hx, hy) is its centre */
function catHead(p: Px, hx: number, hy: number, dir: number, coat: Coat, eyes: 'open' | 'shut' | 'blink') {
  const e = eyes === 'open' ? 'e' : 'f'
  const rows = ['.f.....f.', 'fpf...fpf', 'fffffffff', 'fdfffdfff', `ffff${e}ff${e}f`, 'fffffffwn', '.ffffwww.', '..fwww...']
  p.sprite(rows, { f: coat.fur, p: '#f4a6a6', d: coat.dark, e: coat.eye, w: coat.white, n: '#f48fb1' }, hx - 4, hy - 4, dir < 0)
  if (eyes !== 'open') {
    // Closed eyes: little arcs
    for (const ox of [0, 3]) p.px(dir > 0 ? hx + ox : hx - ox, hy, coat.dark)
  }
}

/** A tail from (x, y), curving up and over, its tip swaying */
function catTail(p: Px, x: number, y: number, dir: number, coat: Coat, sway: number, curl: 'up' | 'floor') {
  const pts =
    curl === 'up'
      ? [[0, 0], [-2, -2], [-3, -5], [-3, -8], [-2 + sway, -11]]
      : [[0, 0], [-3, 1], [-6, 1], [-9, 0], [-10 + sway, -2]]
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1]
    const [bx, by] = pts[i]
    p.line(x + ax * dir, y + ay, x + bx * dir, y + by, coat.fur)
    p.line(x + ax * dir + dir, y + ay, x + bx * dir + dir, y + by, coat.fur)
  }
  const [tx, ty] = pts[pts.length - 1]
  p.px(x + tx * dir, y + ty, coat.dark)
}

type Pose = 'walk' | 'sit' | 'groom' | 'loaf' | 'stretch' | 'swat'

/** A cat standing on the floor at (x, y), facing right if dir is 1; `t` animates the pose */
function cat(p: Px, x: number, y: number, dir: number, coat: Coat, pose: Pose, t: number, theta: number) {
  const X = (dx: number) => x + dx * dir
  // Soft shadow
  p.rect(x - 9, y, 19, 1, '#08090c')
  if (pose === 'walk') {
    const step = Math.sin(t * Math.PI * 2)
    catTail(p, X(-9), y - 8, dir, coat, Math.round(Math.sin(theta * 6)), 'up')
    for (const [lx, phase] of [[-6, 1], [-3, -1], [4, -1], [7, 1]] as const) {
      const s = step * phase
      const lift = s > 0.3 ? 1 : 0
      p.rect(X(lx + Math.round(s)) - (dir < 0 ? 1 : 0), y - 5 - lift, 2, 5, lx < 0 ? coat.fur : coat.fur)
      p.rect(X(lx + Math.round(s)) - (dir < 0 ? 1 : 0), y - 1 - lift, 2, 1, coat === GREY ? coat.white : coat.light)
    }
    blob(p, x, y - 8, 9, 4, coat.fur)
    for (const dx of [-6, -3, 0, 3]) p.rect(X(dx), y - 12, 1, 3, coat.dark)
    p.rect(X(-6) - (dir < 0 ? 10 : 0), y - 5, 11, 1, coat.light)
    catHead(p, X(10), y - 13 + (Math.abs(step) > 0.7 ? 1 : 0), dir, coat, Math.sin(theta * 5) > 0.97 ? 'blink' : 'open')
  } else if (pose === 'sit' || pose === 'groom' || pose === 'swat') {
    catTail(p, X(-5), y - 1, dir, coat, Math.round(Math.sin(theta * 4) * 2), 'floor')
    blob(p, x, y - 5, 7, 5, coat.fur)
    blob(p, X(3), y - 11, 5, 6, coat.fur)
    blob(p, X(5), y - 9, 2, 3, coat.white)
    p.rect(X(-3), y - 9, 1, 3, coat.dark)
    p.rect(X(0), y - 10, 1, 3, coat.dark)
    // Front legs
    const swat = pose === 'swat' && Math.sin(t * Math.PI * 2) > 0
    const lick = pose === 'groom' && Math.sin(t * Math.PI * 2) > -0.2
    p.rect(X(3) - (dir < 0 ? 1 : 0), y - 7, 2, 7, coat.fur)
    p.rect(X(3) - (dir < 0 ? 1 : 0), y - 1, 2, 1, coat.white)
    if (swat) {
      p.line(X(6), y - 9, X(13), y - 6, coat.fur)
      p.line(X(6), y - 8, X(13), y - 5, coat.fur)
      p.px(X(14), y - 6, coat.white)
    } else if (lick) {
      p.line(X(6), y - 8, X(8), y - 15, coat.fur)
      p.line(X(7), y - 8, X(9), y - 15, coat.fur)
      p.px(X(9), y - 16, coat.white)
    } else {
      p.rect(X(6) - (dir < 0 ? 1 : 0), y - 7, 2, 7, coat.fur)
      p.rect(X(6) - (dir < 0 ? 1 : 0), y - 1, 2, 1, coat.white)
    }
    const look = lick ? 2 : 0
    catHead(p, X(5 + (lick ? 1 : 0)), y - 20 + look, dir, coat, lick ? 'shut' : Math.sin(theta * 3 + x) > 0.96 ? 'blink' : 'open')
  } else if (pose === 'loaf') {
    catTail(p, X(-7), y - 1, dir, coat, 0, 'floor')
    blob(p, x, y - 4, 9, 4, coat.fur)
    for (const dx of [-5, -2, 1]) p.rect(X(dx), y - 8, 1, 2, coat.dark)
    p.rect(X(-6) - (dir < 0 ? 12 : 0), y - 1, 13, 1, coat.light)
    catHead(p, X(8), y - 7, dir, coat, 'shut')
    // Z's drift up from the sleeper
    for (let k = 0; k < 3; k++) {
      const zt = (t * 2 + k / 3) % 1
      if (zt < 0.8) p.text('Z', X(12) + Math.round(zt * 6) * dir - 1, y - 18 - Math.round(zt * 16), zt < 0.5 ? '#c3c9d3' : '#5b6270')
    }
  } else if (pose === 'stretch') {
    // Front down, rear up
    catTail(p, X(-9), y - 11, dir, coat, 0, 'up')
    blob(p, X(-3), y - 9, 7, 4, coat.fur)
    blob(p, X(4), y - 5, 6, 3, coat.fur)
    p.rect(X(-7) - (dir < 0 ? 1 : 0), y - 6, 2, 6, coat.fur)
    p.rect(X(-3) - (dir < 0 ? 1 : 0), y - 6, 2, 6, coat.fur)
    p.line(X(6), y - 2, X(14), y - 1, coat.fur)
    p.line(X(6), y - 3, X(14), y - 2, coat.fur)
    catHead(p, X(11), y - 6, dir, coat, 'shut')
  }
}

/** Two cats on loops of their own: one patrols and grooms, one naps and plays with yarn */
function cats(p: Px, u: number, theta: number) {
  // Tabby: patrols the right side of the floor, grooms at the far end, then sits watching the grey cat play
  const v = (u + 0.15) % 1
  if (v < 0.3) {
    const k = v / 0.3
    cat(p, Math.round(412 + k * 196), 352, 1, TABBY, 'walk', (k * 8) % 1, theta)
  } else if (v < 0.52) {
    cat(p, 608, 352, 1, TABBY, 'groom', ((v - 0.3) / 0.22) * 5, theta)
  } else if (v < 0.82) {
    const k = (v - 0.52) / 0.3
    cat(p, Math.round(608 - k * 196), 352, -1, TABBY, 'walk', (k * 8) % 1, theta)
  } else cat(p, 412, 352, 1, TABBY, 'sit', 0, theta)
  // Grey cat by the PC: naps, stretches, bats the yarn, then curls up again
  const w = (u + 0.4) % 1
  let ball = 0
  if (w < 0.42) cat(p, 548, 318, 1, GREY, 'loaf', w / 0.42, theta)
  else if (w < 0.5) cat(p, 548, 318, 1, GREY, 'stretch', 0, theta)
  else if (w < 0.82) {
    const k = (w - 0.5) / 0.32
    cat(p, 548, 318, 1, GREY, 'swat', k * 4, theta)
    ball = Math.round(Math.max(0, Math.sin(k * Math.PI * 4)) * 8)
  } else cat(p, 548, 318, 1, GREY, 'sit', 0, theta)
  // Yarn ball, rolling when batted
  const bx = 568 + ball
  p.disc(bx, 314, 4, '#ec4899')
  p.line(bx - 3, 313, bx + 2, 311, '#f9a8d4')
  p.line(bx - 2, 316, bx + 3, 314, '#be185d')
  p.line(bx - 6, 318, bx - 2, 317, '#ec4899')
}

// ── Zero-g ──

function floatingDuck(p: Px, theta: number) {
  // Floating in front of the porthole, turning to face one way, then the other
  const x = 232 + Math.round(Math.sin(theta) * 6)
  const y = 104 + Math.round(Math.sin(theta * 2) * 4)
  const tilt = Math.sin(theta) > 0
  const duck = tilt
    ? ['.....yyy....', '....yyyyy...', '....yyybyy..', '....yyyyyyoo', '....yyyyy...', 'y..yyyyyyy..', 'yyyyyyyyyyy.', '.yyyyyyyyyy.', '..yyyyyyyy..', '....yyyy....']
    : ['....yyy.....', '...yyyyy....', '..yybyyy....', 'ooyyyyyy....', '...yyyyy....', '..yyyyyyy..y', '.yyyyyyyyyyy', '.yyyyyyyyyy.', '..yyyyyyyy..', '....yyyy....']
  p.sprite(duck, { y: '#facc15', b: '#111111', o: P.orange }, x, y)
  p.px(x + (tilt ? 6 : 5), y + 6, '#fde68a')
  if (Math.sin(theta * 3) > 0.5) p.px(x - 3, y + 4, '#6b7280')
  if (Math.sin(theta * 3 + 2) > 0.5) p.px(x + 14, y + 7, '#6b7280')
}

// ── The composition ──

/** Shrinks each cover to 26×26 once, so it reads as pixel art on the shelf */
function useCovers(tracks: Track[]) {
  const [covers, setCovers] = useState<(HTMLCanvasElement | null)[] | null>(null)
  const { delayRender, continueRender } = useDelayRender()
  const [handle] = useState(() => delayRender('Pixelating album covers'))
  useEffect(() => {
    Promise.all(
      tracks.slice(0, 5).map(
        (t) =>
          new Promise<HTMLCanvasElement | null>((resolve) => {
            if (!t.cover) return resolve(null)
            const img = new Image()
            img.onload = () => {
              const c = document.createElement('canvas')
              c.width = 26
              c.height = 26
              const ctx = c.getContext('2d')!
              ctx.imageSmoothingEnabled = true
              ctx.imageSmoothingQuality = 'high'
              ctx.drawImage(img, 0, 0, 26, 26)
              resolve(c)
            }
            img.onerror = () => resolve(null)
            img.src = t.cover
          }),
      ),
    ).then((list) => {
      setCovers(list)
      continueRender(handle)
    })
  }, [tracks, handle, continueRender])
  return covers
}

export function Cabin({ tracks, music }: CabinProps) {
  const { width, height } = useVideoConfig()
  const { u, theta } = useLoop()
  const canvas = useRef<HTMLCanvasElement>(null)
  const covers = useCovers(tracks)
  const shown = tracks.slice(0, 5).map((t) => ({ ...t, title: pixelText(t.title), artists: pixelText(t.artists) }))

  useLayoutEffect(() => {
    if (!covers || !canvas.current) return
    const ctx = canvas.current.getContext('2d')!
    ctx.imageSmoothingEnabled = false
    const p = new Px(ctx)
    room(p)
    porthole(p, u, theta)
    training(p, theta)
    rightWall(p, covers, shown, u, music, theta)
    desk(p, theta)
    pcTower(p, theta, u)
    // Four monitors: chess, code, terminal, Hyperdrive
    monitor(p, 104, 144, 100, 66)
    chess(p, 108, 148, u)
    monitor(p, 212, 140, 106, 70)
    codeEditor(p, 215, 143, 100, 64, u, theta)
    monitor(p, 322, 140, 106, 70)
    terminal(p, 325, 143, 100, 64, u, theta)
    monitor(p, 436, 144, 100, 66)
    hyperdrive(p, 439, 147, 94, 60, u, theta)
    deskThings(p, theta, u)
    floatingDuck(p, theta)
    you(p, theta)
    chair(p, theta)
    cats(p, u, theta)
  })

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <canvas ref={canvas} width={W} height={H} style={{ width, height, imageRendering: 'pixelated' }} />
    </AbsoluteFill>
  )
}
