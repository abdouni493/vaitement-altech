import { motion, type HTMLMotionProps } from 'framer-motion'
import { clsx } from '@/utils/clsx'

type Variant = 'primary' | 'gold' | 'ghost' | 'danger' | 'outline' | 'sage'
type Size = 'sm' | 'md' | 'lg' | 'icon'

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'ref'> {
  variant?: Variant
  size?: Size
}

const variants: Record<Variant, string> = {
  primary: 'bg-wood-btn text-white shadow-wood hover:shadow-wood-lg',
  gold: 'bg-gold-shine text-wood-dark font-semibold shadow-gold',
  ghost: 'bg-transparent text-wood-medium hover:bg-wood-light/10',
  danger: 'bg-gradient-to-br from-terracotta to-red-700 text-white shadow-wood',
  outline: 'bg-white/70 text-wood-medium border border-wood-light/40 hover:bg-wood-cream',
  sage: 'bg-gradient-to-br from-sage to-green-700 text-white shadow-wood',
}

const sizes: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2.5 text-sm gap-2',
  lg: 'px-6 py-3 text-base gap-2.5',
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
    whileHover={disabled ? undefined : { scale: 1.03 }}
    whileTap={disabled ? undefined : { scale: 0.97 }}
    disabled={disabled}
    className={clsx(
      'inline-flex items-center justify-center rounded-xl font-medium transition-shadow outline-none focus-visible:ring-2 focus-visible:ring-gold/50 disabled:cursor-not-allowed disabled:opacity-50',
      variants[variant],
      sizes[size],
      className,
    )}
    {...props}
  >
    {children}
  </motion.button>
)
