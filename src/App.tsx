import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { useAuthStore } from '@/store/useAuthStore'
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

const RequireAuth = () => {
  const currentUser = useAuthStore((s) => s.currentUser)
  return currentUser ? <Outlet /> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'linear-gradient(145deg, #FFFFFF 0%, #FDF6FE 100%)',
            color: '#2A1140',
            border: '1px solid rgba(192, 38, 211, 0.22)',
            boxShadow: '0 8px 30px rgba(59, 7, 100, 0.18)',
            fontWeight: 500,
          },
          success: { iconTheme: { primary: '#047857', secondary: '#fff' } },
          error: { iconTheme: { primary: '#BE123C', secondary: '#fff' } },
        }}
      />
      <Routes>
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
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
