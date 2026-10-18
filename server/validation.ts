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

// What AI agents report over MCP (server/mcp.ts). Keep in step with src/lib/moments.ts.
export const MOMENT_KINDS = ['good', 'annoying', 'user_annoying', 'other'] as const
export type MomentKind = (typeof MOMENT_KINDS)[number]

export interface MomentInput {
  kind: MomentKind
  note: string
  agent?: string
  project?: string
}

export const tokenCreate = z.object({
  name: z.string().trim().min(1, 'Give the key a name').max(60)
})

// Accounts. Usernames are case-insensitive and stored lowercase.
export const username = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'At least 3 characters')
  .max(32, 'At most 32 characters')
  .regex(/^[a-z0-9._-]+$/, 'Letters, digits, dots, dashes and underscores only')

// The handful of passwords that get tried first. NIST's advice is a length minimum and a check
// against known-bad passwords, rather than rules about digits and symbols.
const COMMON_PASSWORDS = new Set([
  '00000000',
  '11111111',
  '12345678',
  '123456789',
  '1234567890',
  '12341234',
  '87654321',
  'password',
  'password1',
  'password12',
  'password123',
  'passw0rd',
  'p@ssw0rd',
  'qwertyui',
  'qwerty12',
  'qwerty123',
  'qwertyuiop',
  'asdfghjk',
  'asdfasdf',
  'zxcvbnm1',
  'iloveyou',
  'sunshine',
  'princess',
  'football',
  'baseball',
  'superman',
  'starwars',
  'whatever',
  'trustno1',
  'letmein1',
  'welcome1',
  'admin123',
  'abc12345',
  'abcd1234',
  'changeme',
  'monkey12',
  'dragon12',
  'master12',
  'habits123',
  'habittracker'
])

export const newPassword = z
  .string()
  .min(8, 'At least 8 characters')
  .max(256, 'At most 256 characters')
  .refine((password) => !COMMON_PASSWORDS.has(password.toLowerCase()), {
    message: 'That password is too common'
  })

// Logging in checks nothing about the shape of what was typed: that would hint at the rules
export const credentials = z.object({
  username: z.string().trim().toLowerCase().min(1).max(64),
  password: z.string().min(1).max(256)
})

export const registration = z
  .object({ username, password: newPassword })
  .refine(({ username, password }) => password.toLowerCase() !== username, {
    message: "Don't use your username as your password",
    path: ['password']
  })

export const accountUpdate = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password').max(256),
    username: username.optional(),
    newPassword: newPassword.optional()
  })
  .refine((input) => input.username !== undefined || input.newPassword !== undefined, {
    message: 'Nothing to update'
  })

export const accountDelete = z.object({
  password: z.string().min(1, 'Enter your password').max(256)
})
