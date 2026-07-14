import { motion, AnimatePresence } from 'framer-motion'
import { NavLink, useNavigate } from 'react-router-dom'
import { LogOut, Shirt, ChevronLeft, ChevronRight } from 'lucide-react'
import { NAV_ITEMS } from './navConfig'
import { useTranslation } from '@/i18n/useTranslation'
import { useAuthStore } from '@/store/useAuthStore'
import { moduleEnabled } from '@/utils/helpers'
import { clsx } from '@/utils/clsx'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export const Sidebar = ({ collapsed, onToggle }: SidebarProps) => {
  const { t, isRTL } = useTranslation()
  const navigate = useNavigate()
  const currentUser = useAuthStore((s) => s.currentUser)
  const logout = useAuthStore((s) => s.logout)

  const items = NAV_ITEMS.filter((item) => moduleEnabled(currentUser?.permissions, item.key))

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const CollapseIcon = collapsed ? (isRTL ? ChevronLeft : ChevronRight) : isRTL ? ChevronRight : ChevronLeft

  return (
    <motion.aside
      animate={{ width: collapsed ? 76 : 256 }}
      transition={{ type: 'spring', damping: 26, stiffness: 240 }}
      className="wood-grain relative z-30 flex h-screen flex-col bg-wood-sidebar shadow-wood-lg"
    >
      {/* Brand */}
      <div className="flex items-center gap-3 px-4 py-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-shine bg-[length:200%_200%] text-white shadow-rose animate-gradient-shift">
          <Shirt size={24} />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="overflow-hidden"
            >
              <h1 className="text-display text-xl font-bold leading-none text-white">{t('appName')}</h1>
              <p className="mt-0.5 truncate text-[10px] text-wood-blonde/80">{t('appSubtitle')}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        aria-label="toggle sidebar"
        className="absolute -end-3 top-16 z-40 flex h-6 w-6 items-center justify-center rounded-full border border-wood-light/40 bg-wood-cream text-wood-dark shadow-wood transition hover:bg-white"
      >
        <CollapseIcon size={14} />
      </button>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden px-3 py-2">
        {items.map((item) => (
          <NavLink key={item.key} to={item.path} title={collapsed ? t(item.labelKey) : undefined}>
            {({ isActive }) => (
              <motion.div
                whileHover={{ x: isRTL ? -6 : 6 }}
                className={clsx(
                  'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors',
                  isActive
                    ? 'bg-white/15 shadow-wood-inset ring-1 ring-white/20 backdrop-blur-sm'
                    : 'hover:bg-white/10',
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId="activeBar"
                    className="absolute inset-y-1.5 start-0 w-1 rounded-full bg-gradient-to-b from-wood-light to-pink-300"
                  />
                )}
                <item.icon size={20} style={{ color: item.color }} className="shrink-0" />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      className={clsx(
                        'truncate text-sm font-medium',
                        isActive ? 'text-white' : 'text-wood-cream/90',
                      )}
                    >
                      {t(item.labelKey)}
                    </motion.span>
                  )}
                </AnimatePresence>
                {isActive && !collapsed && (
                  <motion.div layoutId="activeDot" className="ms-auto h-2 w-2 rounded-full bg-gold-light" />
                )}
              </motion.div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="border-t border-white/10 p-3">
        <motion.button
          whileHover={{ x: isRTL ? -6 : 6 }}
          onClick={handleLogout}
          title={collapsed ? t('logout') : undefined}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-wood-cream/90 transition hover:bg-terracotta/30"
        >
          <LogOut size={20} className="shrink-0 text-terracotta" />
          {!collapsed && <span className="text-sm font-medium">{t('logout')}</span>}
        </motion.button>
      </div>
    </motion.aside>
  )
}
