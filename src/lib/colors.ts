// A habit's accent colour. Keep the names in step with HABIT_COLORS in server/validation.ts.
// Values are Tailwind's 500 shades; components read them through the --habit custom property.
export const HABIT_COLORS = {
  rose: 'oklch(64.5% 0.246 16.439)',
  orange: 'oklch(70.5% 0.213 47.604)',
  amber: 'oklch(76.9% 0.188 70.08)',
  lime: 'oklch(76.8% 0.233 130.85)',
  emerald: 'oklch(69.6% 0.17 162.48)',
  sky: 'oklch(68.5% 0.169 237.323)',
  violet: 'oklch(60.6% 0.25 292.717)',
  fuchsia: 'oklch(66.7% 0.295 322.15)'
} as const

export type HabitColor = keyof typeof HABIT_COLORS

export const COLOR_NAMES = Object.keys(HABIT_COLORS) as HabitColor[]

export const habitStyle = (color: string) => ({
  '--habit': HABIT_COLORS[color as HabitColor] ?? HABIT_COLORS.violet
})

// Light accents need dark ink on top of them; the rest take white
const LIGHT = new Set<string>(['amber', 'lime'])
export const inkClass = (color: string) => (LIGHT.has(color) ? 'text-zinc-900' : 'text-white')
