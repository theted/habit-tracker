import { z } from 'zod'

// The accent colours a habit can have. Keep in step with src/lib/colors.ts.
export const HABIT_COLORS = [
  'rose',
  'orange',
  'amber',
  'lime',
  'emerald',
  'sky',
  'violet',
  'fuchsia'
] as const

const title = z.string().trim().min(1, 'Give the habit a name').max(60)
// An empty description clears it
const description = z
  .string()
  .trim()
  .max(280)
  .nullish()
  .transform((value) => (value ? value : null))
const emoji = z.string().trim().min(1).max(16)
const color = z.enum(HABIT_COLORS)

export const habitCreate = z.object({
  title,
  description: description.optional(),
  emoji: emoji.optional(),
  color: color.optional()
})

export const habitUpdate = z
  .object({
    title: title.optional(),
    description: description.optional(),
    emoji: emoji.optional(),
    color: color.optional()
  })
  .refine((input) => Object.values(input).some((value) => value !== undefined), {
    message: 'Nothing to update'
  })

// Entries can be backdated (a forgotten check-in), but not placed in the future. A minute of slack
// covers clocks that disagree a little.
const CLOCK_SKEW_MS = 60_000

export const trackCreate = z.object({
  date: z.iso
    .datetime({ offset: true })
    .transform((value) => new Date(value))
    .refine((date) => date.getTime() <= Date.now() + CLOCK_SKEW_MS, 'Date is in the future')
    .refine((date) => date.getFullYear() >= 2000, 'Date is too far back')
    .optional()
})

export const id = z.coerce.number().int().positive()

export type HabitCreate = z.infer<typeof habitCreate>
export type HabitUpdate = z.infer<typeof habitUpdate>
