import raw from './github.json'

/** The GitHub data the animations draw (written by scripts/fetch-data.mjs). */
export type GithubData = typeof raw
export const github: GithubData = raw

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

/** "2026-03-26" → "MAR 26" */
export function shortDate(iso: string) {
  const [, m, d] = iso.split('-').map(Number)
  return `${MONTHS[m - 1]} ${d}`
}

/** "2026-03-26" → "26 MAR 2026" */
export function longDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return `${d} ${MONTHS[m - 1]} ${y}`
}

export const monthName = (m: number) => MONTHS[m]
