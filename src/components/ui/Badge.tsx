import type { ReactNode } from 'react'
import { clsx } from '@/utils/clsx'

type Tone = 'paid' | 'partial' | 'unpaid' | 'neutral' | 'gold' | 'info' | 'sage'

const tones: Record<Tone, string> = {
  paid: 'bg-sage/15 text-sage border-sage/30',
  partial: 'bg-gold/15 text-[#854D0E] border-gold/30',
  unpaid: 'bg-terracotta/15 text-terracotta border-terracotta/30',
  neutral: 'bg-wood-light/15 text-wood-medium border-wood-light/30',
  gold: 'bg-gold-shine text-wood-dark border-gold/40',
  info: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
  sage: 'bg-sage/15 text-sage border-sage/30',
}

export const Badge = ({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: Tone
  children: ReactNode
  className?: string
}) => (
  <span
    className={clsx(
      'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
      tones[tone],
      className,
    )}
  >
    {children}
  </span>
)

export const statusTone = (status: 'paid' | 'partial' | 'unpaid'): Tone => status
