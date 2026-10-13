export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'icon'

const base =
  'inline-flex items-center justify-center gap-2 rounded-xl font-medium whitespace-nowrap select-none ' +
  'transition-[background-color,color,box-shadow,transform,opacity] duration-150 active:scale-[0.97] ' +
  'disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0'

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-fg text-bg shadow-card hover:bg-fg/85',
  secondary: 'border border-line bg-surface text-fg shadow-card hover:bg-surface-2',
  ghost: 'text-muted hover:bg-surface-2 hover:text-fg',
  danger: 'bg-rose-600 text-white shadow-card hover:bg-rose-500'
}

const sizes: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-4 text-sm',
  icon: 'size-10'
}

// Shared with RouterLinks that should look like buttons
export const buttonClass = (variant: ButtonVariant = 'secondary', size: ButtonSize = 'md') =>
  `${base} ${variants[variant]} ${sizes[size]}`
