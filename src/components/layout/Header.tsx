import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { Bell, ChevronRight, Globe, LogOut, AlertTriangle, Ruler } from 'lucide-react'
import { useTranslation } from '@/i18n/useTranslation'
import { useAuthStore } from '@/store/useAuthStore'
import { useProductStore } from '@/store/useProductStore'
import { NAV_ITEMS } from './navConfig'
import { initials, brokenSizes } from '@/utils/helpers'
import type { Product } from '@/types'

export const Header = () => {
  const { t, toggleLang, lang } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const currentUser = useAuthStore((s) => s.currentUser)
  const logout = useAuthStore((s) => s.logout)
  const products = useProductStore((s) => s.products)
  const [notifOpen, setNotifOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const lowStock = useMemo(() => products.filter((p) => p.quantity <= p.minQuantity), [products])

  /** Articles still on sale but no longer available in one of their sizes. */
  const missingSizes = useMemo(() => {
    const rows: { product: Product; missing: string[] }[] = []
    for (const p of products) {
      if (p.quantity <= 0) continue // already covered by the low-stock alert
      const missing = brokenSizes(p)
      if (missing.length > 0) rows.push({ product: p, missing })
    }
    return rows.sort((a, b) => b.missing.length - a.missing.length)
  }, [products])

  const alertCount = lowStock.length + missingSizes.length

  const current = NAV_ITEMS.find((i) => location.pathname.startsWith(i.path))
  const crumb = current ? t(current.labelKey) : ''

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-wood-light/20 bg-wood-white/80 px-6 py-3 backdrop-blur-md">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link to="/dashboard" className="text-wood-medium/70 hover:text-wood-warm">
          {t('appName')}
        </Link>
        {crumb && (
          <>
            <ChevronRight size={14} className="text-wood-medium/40 rtl:rotate-180" />
            <span className="font-semibold text-wood-dark">{crumb}</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Language */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleLang}
          className="flex items-center gap-1.5 rounded-xl border border-wood-light/40 bg-white/70 px-3 py-2 text-xs font-semibold text-wood-medium transition hover:bg-wood-cream"
        >
          <Globe size={16} />
          {lang === 'fr' ? 'FR' : 'ع'}
        </motion.button>

        {/* Notifications */}
        <div className="relative">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setNotifOpen((v) => !v)
              setMenuOpen(false)
            }}
            className="relative rounded-xl border border-wood-light/40 bg-white/70 p-2 text-wood-medium transition hover:bg-wood-cream"
          >
            <Bell size={18} />
            {alertCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-terracotta px-1 text-[10px] font-bold text-white">
                {alertCount}
              </span>
            )}
          </motion.button>
          <AnimatePresence>
            {notifOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                className="card-wood absolute end-0 mt-2 w-80 rounded-2xl p-3 shadow-wood-lg"
              >
                {alertCount === 0 ? (
                  <p className="px-1 py-3 text-center text-xs text-wood-medium">{t('noData')}</p>
                ) : (
                  <div className="max-h-80 space-y-3 overflow-y-auto">
                    {lowStock.length > 0 && (
                      <div>
                        <p className="mb-1 px-1 text-xs font-bold uppercase tracking-wide text-wood-medium">{t('stockAlerts')}</p>
                        <div className="space-y-1">
                          {lowStock.map((p) => (
                            <Link
                              key={p.id}
                              to="/stock"
                              onClick={() => setNotifOpen(false)}
                              className="flex items-center gap-2 rounded-lg p-2 transition hover:bg-wood-cream"
                            >
                              <AlertTriangle size={16} className="shrink-0 text-terracotta" />
                              <span className="flex-1 truncate text-xs font-medium text-wood-dark">{p.name}</span>
                              <span className="text-xs font-bold text-terracotta">{p.quantity}/{p.minQuantity}</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                    {missingSizes.length > 0 && (
                      <div>
                        <p className="mb-1 px-1 text-xs font-bold uppercase tracking-wide text-wood-medium">
                          {t('missingSizes')}
                        </p>
                        <div className="space-y-1">
                          {missingSizes.map(({ product, missing }) => (
                            <Link
                              key={product.id}
                              to="/stock"
                              onClick={() => setNotifOpen(false)}
                              className="flex items-center gap-2 rounded-lg p-2 transition hover:bg-wood-cream"
                            >
                              <Ruler size={16} className="shrink-0 text-wood-warm" />
                              <span className="flex-1 truncate text-xs font-medium text-wood-dark">
                                {product.name}
                              </span>
                              <span className="text-xs font-bold text-wood-warm">
                                {missing.join(' · ')}
                              </span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* User */}
        <div className="relative">
          <motion.button
            whileHover={{ scale: 1.02 }}
            onClick={() => {
              setMenuOpen((v) => !v)
              setNotifOpen(false)
            }}
            className="flex items-center gap-2 rounded-xl border border-wood-light/40 bg-white/70 py-1.5 pe-3 ps-1.5 transition hover:bg-wood-cream"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-wood-btn text-xs font-bold text-white">
              {initials(currentUser?.fullName ?? 'U')}
            </div>
            <div className="text-start">
              <p className="text-xs font-bold leading-none text-wood-dark">{currentUser?.fullName}</p>
              <p className="mt-0.5 text-[10px] text-wood-medium">{currentUser?.role}</p>
            </div>
          </motion.button>
          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                className="card-wood absolute end-0 mt-2 w-48 rounded-2xl p-2 shadow-wood-lg"
              >
                <Link
                  to="/settings"
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-lg px-3 py-2 text-sm text-wood-dark transition hover:bg-wood-cream"
                >
                  {t('myAccount')}
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-terracotta transition hover:bg-terracotta/10"
                >
                  <LogOut size={15} />
                  {t('logout')}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  )
}
