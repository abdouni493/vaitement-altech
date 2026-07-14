import {
  LayoutDashboard,
  Shirt,
  PackagePlus,
  Store,
  Receipt,
  Users,
  Truck,
  UserCog,
  Wallet,
  Banknote,
  PieChart,
  Settings,
  type LucideIcon,
} from 'lucide-react'
import type { ModuleKey } from '@/types'
import type { TranslationKey } from '@/i18n/translations'

export interface NavItem {
  key: ModuleKey
  path: string
  labelKey: TranslationKey
  icon: LucideIcon
  color: string
}

/**
 * Sidebar icons speak the language of a clothing boutique — a garment for the
 * rail, a shop front for the till, a delivery truck for suppliers — and are
 * tinted along the champagne/brass scale so they read on the ink sidebar.
 */
export const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', path: '/dashboard', labelKey: 'dashboard', icon: LayoutDashboard, color: '#E7C063' },
  { key: 'stock', path: '/stock', labelKey: 'stock', icon: Shirt, color: '#D9C7A3' },
  { key: 'purchase', path: '/purchase', labelKey: 'purchase', icon: PackagePlus, color: '#EADFC8' },
  { key: 'pos', path: '/pos', labelKey: 'pos', icon: Store, color: '#F0D08A' },
  { key: 'sales', path: '/sales', labelKey: 'sales', icon: Receipt, color: '#E7C063' },
  { key: 'clients', path: '/clients', labelKey: 'clients', icon: Users, color: '#D9C7A3' },
  { key: 'suppliers', path: '/suppliers', labelKey: 'suppliers', icon: Truck, color: '#EADFC8' },
  { key: 'workers', path: '/workers', labelKey: 'workers', icon: UserCog, color: '#F0D08A' },
  { key: 'expenses', path: '/expenses', labelKey: 'expenses', icon: Wallet, color: '#E7C063' },
  { key: 'caisse', path: '/caisse', labelKey: 'caisse', icon: Banknote, color: '#D9C7A3' },
  { key: 'reports', path: '/reports', labelKey: 'reports', icon: PieChart, color: '#EADFC8' },
  { key: 'settings', path: '/settings', labelKey: 'settings', icon: Settings, color: '#F0D08A' },
]
