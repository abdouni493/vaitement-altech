import { useThemeStore } from '@/store/useThemeStore'

/**
 * Recharts writes colours straight onto SVG presentation attributes, where a
 * CSS `var()` does not resolve — so the charts read the theme in JS and pick a
 * concrete palette instead of inheriting the design tokens.
 *
 * The ramp opens on the two neutrals that carry the brand, then adds hue only
 * as far as a series count demands it. Every entry clears 3:1 against its own
 * theme's surface, and no meaning ever rests on colour alone: each chart pairs
 * its series with a legend and a tooltip.
 */
const LIGHT = [
  '#111111', // ink
  '#6B6B6B', // graphite
  '#117A57', // emerald
  '#C72020', // red
  '#B05B04', // amber
  '#1D4ED8', // blue
  '#6D28D9', // violet
  '#0F766E', // teal
  '#9A9A9A', // silver
]

const DARK = [
  '#FFFFFF',
  '#A3A3A3',
  '#34C77B',
  '#FF6961',
  '#F0AD4E',
  '#7AA2F7',
  '#C4A7FF',
  '#5EEAD4',
  '#6E6E6E',
]

export interface ChartTheme {
  colors: string[]
  axis: { fontSize: number; fill: string }
  grid: string
  tooltip: React.CSSProperties
  /** The single accent, for a chart that plots one series. */
  accent: string
  success: string
  danger: string
}

export const useChartTheme = (): ChartTheme => {
  const dark = useThemeStore((s) => s.theme) === 'dark'
  return {
    colors: dark ? DARK : LIGHT,
    axis: { fontSize: 11, fill: dark ? '#A3A3A3' : '#6B6B6B' },
    grid: dark ? '#2D2D2D' : '#E2E2E2',
    tooltip: {
      borderRadius: 2,
      border: `1px solid ${dark ? '#2D2D2D' : '#E2E2E2'}`,
      background: dark ? '#141414' : '#FFFFFF',
      color: dark ? '#FFFFFF' : '#000000',
      fontSize: 12,
      boxShadow: 'none',
    },
    accent: dark ? '#FFFFFF' : '#111111',
    success: dark ? '#34C77B' : '#117A57',
    danger: dark ? '#FF6961' : '#C72020',
  }
}
