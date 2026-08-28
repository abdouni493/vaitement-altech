import { useEffect } from 'react'
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation,
} from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { useAuthStore } from '@/store/useAuthStore'
import { useHydrated } from '@/store/hydration'
import { Login } from '@/pages/Login'
import { Dashboard } from '@/pages/Dashboard'
import { StockPage } from '@/pages/Stock/StockPage'
import { PurchasePage } from '@/pages/Purchase/PurchasePage'
import { POSPage } from '@/pages/POS/POSPage'
import { SalesPage } from '@/pages/Sales/SalesPage'
import { ClientsPage } from '@/pages/Clients/ClientsPage'
import { SuppliersPage } from '@/pages/Suppliers/SuppliersPage'
import { WorkersPage } from '@/pages/Workers/WorkersPage'
import { ExpensesPage } from '@/pages/Expenses/ExpensesPage'
import { CaissePage } from '@/pages/Caisse/CaissePage'
import { ReportsPage } from '@/pages/Reports/ReportsPage'
import { SettingsPage } from '@/pages/Settings/SettingsPage'
import { WebsitePage } from '@/pages/Website/WebsitePage'
import { WebOrdersPage } from '@/pages/WebOrders/WebOrdersPage'
// ── Storefront ──────────────────────────────────────────────────────────────
import { ShopLayout } from '@/shop/ShopLayout'
import { ShopHome } from '@/shop/ShopHome'
import { ShopProducts } from '@/shop/ShopProducts'
import { ShopProductDetail } from '@/shop/ShopProductDetail'
import { ShopOffers, ShopOfferDetail } from '@/shop/ShopOffers'
import { ShopContact } from '@/shop/ShopContact'
import { ShopCart } from '@/shop/ShopCart'
import { ShopOrder } from '@/shop/ShopOrder'
import { ShopThankYou } from '@/shop/ShopThankYou'

const RequireAuth = () => {
  const currentUser = useAuthStore((s) => s.currentUser)
  const location = useLocation()
  if (currentUser) return <Outlet />
  // Hand the login screen the page that was asked for, so signing in returns
  // the user there rather than dropping them on the dashboard.
  return (
    <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  )
}

/** Shown while the stores load their data from the local IndexedDB database. */
const Splash = () => (
  <div className="wood-grain flex min-h-screen flex-col items-center justify-center gap-6 bg-black">
    <div className="h-14 w-14 animate-float bg-white" />
    <div className="h-px w-40 overflow-hidden bg-white/15">
      <div className="h-full w-1/2 animate-shimmer bg-gradient-to-r from-transparent via-white to-transparent" />
    </div>
  </div>
)

export default function App() {
  const hydrated = useHydrated()
  const restoreSession = useAuthStore((s) => s.restoreSession)

  // The session is read back from IndexedDB with everything else, so the UI
  // renders straight away on the current page. This only revalidates it in the
  // background — an account revoked since the last visit is signed out here.
  useEffect(() => {
    if (hydrated) void restoreSession()
  }, [hydrated, restoreSession])

  if (!hydrated) return <Splash />

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'rgb(var(--c-surface))',
            color: 'rgb(var(--c-fg))',
            border: '1px solid rgb(var(--c-border))',
            borderRadius: '2px',
            fontWeight: 600,
            fontSize: '13px',
          },
          success: { iconTheme: { primary: 'rgb(var(--c-success))', secondary: '#fff' } },
          error: { iconTheme: { primary: 'rgb(var(--c-danger))', secondary: '#fff' } },
        }}
      />
      <Routes>
        {/* ── Public storefront ─────────────────────────────────────────── */}
        <Route path="/shop" element={<ShopLayout />}>
          <Route index element={<ShopHome />} />
          <Route path="products" element={<ShopProducts />} />
          <Route path="products/:id" element={<ShopProductDetail />} />
          <Route path="offers" element={<ShopOffers />} />
          <Route path="offers/:id" element={<ShopOfferDetail />} />
          <Route path="contact" element={<ShopContact />} />
          <Route path="cart" element={<ShopCart />} />
          <Route path="order" element={<ShopOrder />} />
          <Route path="thank-you/:id" element={<ShopThankYou />} />
        </Route>

        {/* ── Back office ───────────────────────────────────────────────── */}
        <Route path="/login" element={<Login />} />
        <Route element={<RequireAuth />}>
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/stock" element={<StockPage />} />
            <Route path="/purchase" element={<PurchasePage />} />
            <Route path="/pos" element={<POSPage />} />
            <Route path="/sales" element={<SalesPage />} />
            <Route path="/clients" element={<ClientsPage />} />
            <Route path="/suppliers" element={<SuppliersPage />} />
            <Route path="/workers" element={<WorkersPage />} />
            <Route path="/expenses" element={<ExpensesPage />} />
            <Route path="/caisse" element={<CaissePage />} />
            <Route path="/website" element={<WebsitePage />} />
            <Route path="/web-orders" element={<WebOrdersPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
