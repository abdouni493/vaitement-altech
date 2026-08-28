// ============================================================================
// Atelier Mode — default configuration lists
// ----------------------------------------------------------------------------
// The application no longer ships with demo records. All business data
// (products, purchases, sales, clients, suppliers, workers, expenses, caisse
// movements and user accounts) starts empty and is stored in the on-device
// IndexedDB database as the user enters it — see `src/store/persist.ts`.
//
// What remains here are the *default reference lists* the interface needs to be
// usable on a fresh install (size scales, and starter category/brand/colour/
// material/role suggestions). Every one of these is extensible from within the
// app and, once changed, is persisted like any other data.
// ============================================================================

import type {
  AppUser,
  CaisseTransaction,
  Client,
  Expense,
  Product,
  Purchase,
  Sale,
  SizeCategory,
  StoreSettings,
  Supplier,
  Worker,
} from '@/types'

// ----------------------------------------------------------------------------
// Reference lists — starter suggestions, all editable inside the app
// ----------------------------------------------------------------------------

export const INITIAL_CATEGORIES = [
  'Robes',
  'Chemises',
  'T-shirts & Tops',
  'Pantalons',
  'Jupes',
  'Vestes & Manteaux',
  'Chaussures',
  'Accessoires',
  'Enfants',
]

export const INITIAL_BRANDS = ['Autre']

/** The size scales the boutique sells with. The user can extend any of them. */
export const INITIAL_SIZE_SCALES: Record<SizeCategory, string[]> = {
  alpha: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  numeric: ['34', '36', '38', '40', '42', '44', '46', '48'],
  shoes: ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45'],
  kids: ['2 ans', '4 ans', '6 ans', '8 ans', '10 ans', '12 ans', '14 ans'],
  oneSize: ['TU'],
  custom: [],
}

export const INITIAL_COLORS = [
  'Noir',
  'Blanc',
  'Beige',
  'Camel',
  'Gris anthracite',
  'Bleu indigo',
  'Bordeaux',
  'Kaki',
  'Écru',
]

export const INITIAL_MATERIALS = [
  'Coton',
  'Coton bio',
  'Lin',
  'Laine',
  'Cuir',
  'Denim',
  'Soie',
  'Viscose',
  'Cachemire',
  'Polyester',
]

export const INITIAL_ROLES = [
  'Vendeur·se',
  'Conseiller·ère de style',
  'Caissier·ère',
  'Responsable boutique',
  'Retoucheur·se',
]

// ----------------------------------------------------------------------------
// Business records — empty on a fresh install, filled by the user
// ----------------------------------------------------------------------------

export const INITIAL_PRODUCTS: Product[] = []
export const INITIAL_SUPPLIERS: Supplier[] = []
export const INITIAL_CLIENTS: Client[] = []
export const INITIAL_PURCHASES: Purchase[] = []
export const INITIAL_SALES: Sale[] = []
export const INITIAL_WORKERS: Worker[] = []
export const INITIAL_EXPENSES: Expense[] = []
export const INITIAL_CAISSE: CaisseTransaction[] = []

// ----------------------------------------------------------------------------
// Store identity — blank template the owner fills in from Settings
// ----------------------------------------------------------------------------

export const INITIAL_SETTINGS: StoreSettings = {
  logo: '',
  name: 'Ma Boutique',
  description: '',
  email: '',
  phone: '',
  address: '',
  nif: '',
  nis: '',
  article: '',
  rc: '',
  currency: 'DA',
}

/**
 * Accounts that can sign in. Empty on a fresh install so the login screen shows
 * the "create admin account" flow; once the owner creates their account it is
 * persisted and the create flow hides itself.
 */
export const INITIAL_USERS: AppUser[] = []
