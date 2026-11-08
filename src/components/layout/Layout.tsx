import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { pageVariants } from '@/utils/animations'

const MOBILE_BREAKPOINT = 1024

export const Layout = () => {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT,
  )
  const [collapsed, setCollapsed] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT,
  )
  const location = useLocation()

  // Track the viewport, and keep the sidebar collapsed on small / mobile screens.
  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth < MOBILE_BREAKPOINT
      setIsMobile(mobile)
      if (mobile) setCollapsed(true)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // On mobile, opening an interface from the sidebar hides the whole sidebar
  // again — icons included — so the chosen page gets the full screen.
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT) setCollapsed(true)
  }, [location.pathname])

  // On mobile the sidebar is an overlay drawer, so it is "open" when not collapsed.
  const drawerOpen = isMobile && !collapsed

  return (
    <div className="flex h-screen overflow-hidden bg-wood-bg">
      <Sidebar
        collapsed={collapsed}
        isMobile={isMobile}
        onToggle={() => setCollapsed((v) => !v)}
      />

      {/* Backdrop behind the mobile drawer — tapping it closes the sidebar. */}
      <AnimatePresence>
        {drawerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setCollapsed(true)}
            className="fixed inset-0 z-30 bg-black/50 lg:hidden"
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header
          showMenuButton={isMobile}
          onOpenMenu={() => setCollapsed(false)}
        />
        <main className="flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
