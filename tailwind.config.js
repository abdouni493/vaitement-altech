/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Atelier palette — fashion boutique: ink · brass · camel on warm stone ──
        // Token group is still named "wood" so every existing utility class
        // (text-wood-dark, bg-wood-cream, …) recolours app-wide in one place.
        wood: {
          dark: '#1C1917', // ink — headings, sidebar base
          medium: '#57534E', // stone — muted, readable body/labels (7.5:1 on white)
          warm: '#A16207', // brass — signature accent (4.6:1 on white)
          light: '#D9C7A3', // champagne — soft accents, borders
          blonde: '#EADFC8', // sand
          cream: '#F5F1EA', // warm cream — tinted surfaces
          white: '#FCFAF6', // off-white — page base
        },
        gold: {
          DEFAULT: '#CA8A04', // gilded brass — CTA accent
          light: '#E7C063',
        },
        sage: '#047857', // deep emerald — success / sale price / paid
        terracotta: '#BE123C', // couture red — danger / debt / alerts
        charcoal: '#1C1917', // ink — body text
      },
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        sans: ['Inter', 'Cairo', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
        arabic: ['Cairo', 'sans-serif'],
      },
      backgroundImage: {
        'wood-sidebar': 'linear-gradient(180deg, #1C1917 0%, #292524 55%, #3F3830 100%)',
        'wood-header': 'linear-gradient(135deg, #292524 0%, #57534E 100%)',
        'wood-btn': 'linear-gradient(135deg, #8A5A08 0%, #B4801F 100%)',
        'wood-bg': 'linear-gradient(135deg, #FCFAF6 0%, #F5F1EA 60%, #EFE9DE 100%)',
        'wood-card': 'linear-gradient(145deg, #FFFFFF 0%, #FCFAF6 100%)',
        'gold-shine': 'linear-gradient(135deg, #CA8A04 0%, #E7C063 100%)',
        'rose-shine': 'linear-gradient(135deg, #A16207 0%, #CA8A04 50%, #E7C063 100%)',
      },
      boxShadow: {
        wood: '0 4px 20px rgba(28, 25, 23, 0.10)',
        'wood-lg': '0 12px 40px rgba(28, 25, 23, 0.18)',
        'wood-inset': 'inset 0 1px 0 rgba(255,255,255,0.5)',
        gold: '0 4px 16px rgba(202, 138, 4, 0.30)',
        rose: '0 6px 20px rgba(161, 98, 7, 0.28)',
      },
      borderColor: {
        woodborder: 'rgba(217, 199, 163, 0.55)',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        bloom: {
          '0%': { transform: 'scale(0.96)', opacity: '0.7' },
          '50%': { transform: 'scale(1.02)', opacity: '1' },
          '100%': { transform: 'scale(0.96)', opacity: '0.7' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(190, 18, 60, 0.45)' },
          '50%': { boxShadow: '0 0 0 6px rgba(190, 18, 60, 0)' },
        },
        gradientShift: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
      animation: {
        shimmer: 'shimmer 2.5s linear infinite',
        float: 'float 6s ease-in-out infinite',
        bloom: 'bloom 4s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'gradient-shift': 'gradientShift 8s ease infinite',
      },
    },
  },
  plugins: [],
}
