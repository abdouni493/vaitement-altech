import { motion, type HTMLMotionProps } from 'framer-motion'
import { clsx } from '@/utils/clsx'

type Variant = 'primary' | 'gold' | 'ghost' | 'danger' | 'outline' | 'sage'
type Size = 'sm' | 'md' | 'lg' | 'icon'

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'ref'> {
  variant?: Variant
  size?: Size
}

/**
 * Square, high-contrast slabs. `primary` is the ink block that inverts in dark
 * mode; `outline` is its hairline counterpart, which fills on hover — the
 * inversion is the whole hover language of the design.
 */
const variants: Record<Variant, string> = {
  primary: 'bg-wood-btn text-accentfg hover:opacity-85',
  gold: 'border border-wood-warm bg-transparent text-wood-warm hover:bg-wood-btn hover:text-accentfg',
  ghost: 'bg-transparent text-wood-medium hover:bg-wood-cream hover:text-wood-dark',
  danger: 'bg-terracotta text-white hover:opacity-85',
  outline: 'border border-wood-light bg-wood-white text-wood-dark hover:border-wood-warm hover:bg-wood-cream',
  sage: 'bg-sage text-white hover:opacity-85',
}

const sizes: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-[11px] gap-1.5 tracking-wide',
  md: 'px-4 py-2.5 text-xs gap-2 tracking-wide',
  lg: 'px-7 py-3.5 text-sm gap-2.5 tracking-wide',
  icon: 'p-2',
}

export const Button = ({
  variant = 'primary',
  size = 'md',
  className,
  children,
  disabled,
  ...props
}: ButtonProps) => (
  <motion.button
    whileHover={disabled ? undefined : { y: -1 }}
    whileTap={disabled ? undefined : { scale: 0.98 }}
    transition={{ duration: 0.18, ease: 'easeOut' }}
    disabled={disabled}
    className={clsx(
      'inline-flex cursor-pointer items-center justify-center font-semibold uppercase outline-none transition-[opacity,background-color,border-color,color] duration-200 focus-visible:ring-2 focus-visible:ring-wood-warm/50 focus-visible:ring-offset-2 focus-visible:ring-offset-wood-white disabled:cursor-not-allowed disabled:opacity-40',
      size === 'icon' ? 'normal-case' : '',
      variants[variant],
      sizes[size],
      className,
    )}
    {...props}
  >
    {children}
  </motion.button>
)
