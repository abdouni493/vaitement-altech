import { type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Search, PackageOpen } from 'lucide-react'
import { fadeUp } from '@/utils/animations'
import { clsx } from '@/utils/clsx'

export const PageHeader = ({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
}) => (
  <motion.div
    variants={fadeUp}
    initial="initial"
    animate="animate"
    className="mb-6 flex flex-wrap items-end justify-between gap-4"
  >
    <div className="min-w-0">
      <h1 className="text-display text-2xl font-bold text-wood-dark sm:text-3xl">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-wood-medium">{subtitle}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </motion.div>
)

export const SearchInput = ({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
}) => (
  <div className={clsx('relative', className)}>
    {/* start-3 (not left-3) so the icon follows the text direction in RTL */}
    <Search className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-wood-medium/50" size={18} />
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="input-wood ps-10"
    />
  </div>
)

export const EmptyState = ({
  title,
  hint,
  action,
  icon,
}: {
  title: string
  hint?: string
  action?: ReactNode
  icon?: ReactNode
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="card-wood flex flex-col items-center justify-center gap-3 rounded-2xl px-6 py-16 text-center"
  >
    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-wood-cream text-wood-light">
      {icon ?? <PackageOpen size={40} />}
    </div>
    <h3 className="text-display text-xl font-bold text-wood-dark">{title}</h3>
    {hint && <p className="max-w-sm text-sm text-wood-medium">{hint}</p>}
    {action && <div className="mt-2">{action}</div>}
  </motion.div>
)

export const ViewToggle = ({
  view,
  onChange,
  labels,
}: {
  view: 'cards' | 'table'
  onChange: (v: 'cards' | 'table') => void
  labels: { cards: string; table: string }
}) => (
  <div className="inline-flex rounded-xl border border-wood-light/40 bg-white/70 p-1">
    {(['cards', 'table'] as const).map((v) => (
      <button
        key={v}
        onClick={() => onChange(v)}
        className={clsx(
          'rounded-lg px-3 py-1.5 text-xs font-semibold transition',
          view === v ? 'bg-wood-btn text-white shadow-wood' : 'text-wood-medium hover:bg-wood-cream',
        )}
      >
        {labels[v]}
      </button>
    ))}
  </div>
)

export const ProgressBar = ({ value, max, danger }: { value: number; max: number; danger?: boolean }) => {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-wood-cream">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className={clsx(
          'h-full rounded-full',
          danger ? 'bg-gradient-to-r from-terracotta to-red-600' : 'bg-gradient-to-r from-sage to-green-600',
        )}
      />
    </div>
  )
}
