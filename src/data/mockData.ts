// ============================================================================
// Demo / test data — the boutique with no database behind it
// ----------------------------------------------------------------------------
// Every database connection was removed from this build: `src/lib/db.ts` and
// `src/lib/supabase.ts` now work entirely from the constant records below,
// held in memory for the life of the tab. Signing in with the "Demo" button on
// the login page opens the whole back office and storefront pre-filled with
// this data, so every screen has something to show without any configuration.
//
// Nothing here is persisted: a refresh re-seeds from these constants, which is
// exactly what you want for a demo or a test run.
// ============================================================================

import type {
  CaisseTransaction,
  Client,
  ContactLinks,
  DeliveryCompany,
  Expense,
  Product,
  Purchase,
  Sale,
  SizeCategory,
  SpecialOffer,
  StoreSettings,
  Supplier,
  WebOrder,
  WebProductMeta,
  WebsiteSettings,
  Worker,
} from '@/types'
import type { ProfileRow } from '@/lib/supabase'
import type { ReferenceLists } from '@/lib/db'

// ----------------------------------------------------------------------------
// Small helpers
// ----------------------------------------------------------------------------

let counter = 1000
/** A stable-enough id for records created at runtime in the demo. */
export const uid = (prefix = 'id'): string => `${prefix}-${(counter += 1).toString(36)}`

/** A lightweight inline placeholder image, so no network is needed for photos. */
export const placeholder = (label: string, bg = '#1a1a1a', fg = '#f5f5f5'): string => {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='760'><rect width='100%' height='100%' fill='${bg}'/><text x='50%' y='50%' fill='${fg}' font-family='Georgia,serif' font-size='40' text-anchor='middle' dominant-baseline='middle'>${label}</text></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

// ----------------------------------------------------------------------------
// Accounts (replaces Supabase auth)
// ----------------------------------------------------------------------------

/** The credentials the "Demo" button signs in with. Any password is accepted. */
export const DEMO_CREDENTIALS = { email: 'demo@altech.dz', password: 'demo' }

export const DEMO_ADMIN: ProfileRow = {
  id: 'user-admin',
  full_name: 'Yacine Démo',
  username: 'admin',
  email: DEMO_CREDENTIALS.email,
  role: 'Administrateur',
  is_admin: true,
  permissions: 'ALL',
  active: true,
}

/** Extra sign-in accounts recognised by the mock. The admin is always first. */
export const DEMO_ACCOUNTS: ProfileRow[] = [
  DEMO_ADMIN,
  {
    id: 'user-vendeur',
    full_name: 'Amel Vendeuse',
    username: 'amel',
    email: 'amel@altech.dz',
    role: 'Vendeuse',
    is_admin: false,
    permissions: {
      dashboard: { enabled: true, actions: ['view'] },
      pos: { enabled: true, actions: ['view', 'create', 'print', 'pay'] },
      sales: { enabled: true, actions: ['view', 'print'] },
      stock: { enabled: true, actions: ['view'] },
      clients: { enabled: true, actions: ['view', 'create', 'edit'] },
    },
    active: true,
  },
]

// ----------------------------------------------------------------------------
// Reference lists
// ----------------------------------------------------------------------------

export const SIZE_SCALES: Record<SizeCategory, string[]> = {
  alpha: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  numeric: ['36', '38', '40', '42', '44', '46'],
  shoes: ['38', '39', '40', '41', '42', '43', '44'],
  kids: ['2 ans', '4 ans', '6 ans', '8 ans', '10 ans', '12 ans'],
  oneSize: ['Unique'],
  custom: [],
}

export const REFERENCE_LISTS: ReferenceLists = {
  brands: ['Altech', 'Zara', 'Mango', 'Bershka', 'LC Waikiki'],
  categories: ['Robes', 'Pantalons', 'Chemises', 'Vestes', 'Chaussures', 'Accessoires'],
  colors: ['Noir', 'Blanc', 'Beige', 'Bleu', 'Rouge', 'Vert', 'Gris'],
  materials: ['Coton', 'Lin', 'Laine', 'Soie', 'Polyester', 'Cuir'],
  roles: ['Administrateur', 'Vendeuse', 'Caissier', 'Magasinier'],
  sizeScales: SIZE_SCALES,
}

// ----------------------------------------------------------------------------
// Store identity & website
// ----------------------------------------------------------------------------

export const STORE_SETTINGS: StoreSettings = {
  logo: '',
  name: 'Altech Boutique',
  description: 'Prêt-à-porter & accessoires — démonstration sans base de données.',
  email: 'contact@altech.dz',
  phone: '0550 12 34 56',
  address: '12 Rue Didouche Mourad, Alger Centre',
  nif: '000016001234567',
  nis: '000016009876543',
  article: '16/00-1234567',
  rc: '16/00-0987654B21',
  currency: 'DA',
}

export const CONTACTS: ContactLinks = {
  facebook: 'https://facebook.com/altech',
  instagram: 'https://instagram.com/altech',
  tiktok: 'https://tiktok.com/@altech',
  snapchat: '',
  whatsapp: '213550123456',
  phone: '0550 12 34 56',
  phone2: '0770 98 76 54',
  email: 'contact@altech.dz',
  mapsUrl: 'https://maps.google.com/?q=Alger+Centre',
}

export const WEBSITE_SETTINGS: WebsiteSettings = {
  favicon: '',
  heroImage: placeholder('Altech', '#111111', '#e8c37a'),
  description: 'La nouvelle collection est arrivée. Livraison dans les 58 wilayas.',
  tagline: 'Nouvelle collection',
  freeShippingFrom: 8000,
}

// ----------------------------------------------------------------------------
// Products
// ----------------------------------------------------------------------------

const sized = (cat: SizeCategory, labels: string[], qtys: number[]) =>
  labels.map((size, i) => ({ size, quantity: qtys[i] ?? 0 }))

const makeProduct = (p: Partial<Product> & { id: string; name: string }): Product => {
  const sizes = p.sizes ?? []
  const quantity = sizes.length
    ? sizes.reduce((s, x) => s + x.quantity, 0)
    : (p.quantity ?? 0)
  return {
    description: '',
    barcode: '',
    brand: '',
    category: '',
    purchasePrice: 0,
    salePrice: 0,
    minQuantity: 3,
    sizeCategory: 'alpha',
    sizes,
    color: '',
    material: '',
    gender: 'women',
    season: 'allSeason',
    collection: '',
    images: [],
    createdAt: '2026-10-01T09:00:00.000Z',
    ...p,
    quantity,
  }
}

export const PRODUCTS: Product[] = [
  makeProduct({
    id: 'prod-robe-lin',
    name: 'Robe longue en lin',
    description: 'Robe fluide en lin, coupe droite, idéale pour l’été.',
    barcode: '6130000000012',
    brand: 'Altech',
    category: 'Robes',
    purchasePrice: 2800,
    salePrice: 5900,
    minQuantity: 4,
    sizeCategory: 'alpha',
    sizes: sized('alpha', ['S', 'M', 'L', 'XL'], [5, 8, 6, 3]),
    color: 'Beige',
    material: 'Lin',
    gender: 'women',
    season: 'springSummer',
    collection: 'Été 2026',
    images: [placeholder('Robe', '#8d7b68'), placeholder('Robe 2', '#6f5f4e')],
  }),
  makeProduct({
    id: 'prod-chemise-coton',
    name: 'Chemise en coton',
    description: 'Chemise classique en coton, toutes saisons.',
    barcode: '6130000000029',
    brand: 'Zara',
    category: 'Chemises',
    purchasePrice: 1500,
    salePrice: 3200,
    minQuantity: 5,
    sizeCategory: 'alpha',
    sizes: sized('alpha', ['S', 'M', 'L', 'XL'], [4, 2, 7, 5]),
    color: 'Blanc',
    material: 'Coton',
    gender: 'men',
    season: 'allSeason',
    collection: 'Essentiels',
    images: [placeholder('Chemise', '#dcdcdc', '#333')],
  }),
  makeProduct({
    id: 'prod-jean-slim',
    name: 'Jean slim',
    description: 'Jean coupe slim, stretch confortable.',
    barcode: '6130000000036',
    brand: 'Bershka',
    category: 'Pantalons',
    purchasePrice: 2200,
    salePrice: 4500,
    minQuantity: 6,
    sizeCategory: 'numeric',
    sizes: sized('numeric', ['38', '40', '42', '44'], [6, 9, 4, 2]),
    color: 'Bleu',
    material: 'Coton',
    gender: 'women',
    season: 'allSeason',
    collection: 'Denim',
    images: [placeholder('Jean', '#2f3b52', '#cdd6e0')],
  }),
  makeProduct({
    id: 'prod-veste-cuir',
    name: 'Veste en cuir',
    description: 'Veste en cuir véritable, doublure intérieure.',
    barcode: '6130000000043',
    brand: 'Mango',
    category: 'Vestes',
    purchasePrice: 7800,
    salePrice: 14900,
    minQuantity: 2,
    sizeCategory: 'alpha',
    sizes: sized('alpha', ['M', 'L', 'XL'], [2, 3, 1]),
    color: 'Noir',
    material: 'Cuir',
    gender: 'men',
    season: 'fallWinter',
    collection: 'Hiver 2026',
    images: [placeholder('Veste', '#1b1b1b', '#c9a24b')],
  }),
  makeProduct({
    id: 'prod-sneakers',
    name: 'Baskets urbaines',
    description: 'Baskets légères, semelle amortie.',
    barcode: '6130000000050',
    brand: 'Altech',
    category: 'Chaussures',
    purchasePrice: 3400,
    salePrice: 6900,
    minQuantity: 4,
    sizeCategory: 'shoes',
    sizes: sized('shoes', ['39', '40', '41', '42', '43'], [3, 5, 6, 4, 2]),
    color: 'Blanc',
    material: 'Polyester',
    gender: 'unisex',
    season: 'allSeason',
    collection: 'Street',
    images: [placeholder('Baskets', '#efefef', '#222')],
  }),
  makeProduct({
    id: 'prod-sac-main',
    name: 'Sac à main matelassé',
    description: 'Sac à main matelassé avec chaîne dorée.',
    barcode: '6130000000067',
    brand: 'Altech',
    category: 'Accessoires',
    purchasePrice: 1900,
    salePrice: 4200,
    minQuantity: 3,
    sizeCategory: 'oneSize',
    sizes: sized('oneSize', ['Unique'], [12]),
    color: 'Rouge',
    material: 'Cuir',
    gender: 'women',
    season: 'allSeason',
    collection: 'Accessoires',
    images: [placeholder('Sac', '#7a1f2b', '#f3d9c0')],
  }),
  makeProduct({
    id: 'prod-pull-enfant',
    name: 'Pull enfant',
    description: 'Pull chaud pour enfant, maille douce.',
    barcode: '6130000000074',
    brand: 'LC Waikiki',
    category: 'Vestes',
    purchasePrice: 1200,
    salePrice: 2600,
    minQuantity: 5,
    sizeCategory: 'kids',
    sizes: sized('kids', ['4 ans', '6 ans', '8 ans', '10 ans'], [4, 6, 5, 3]),
    color: 'Vert',
    material: 'Laine',
    gender: 'kids',
    season: 'fallWinter',
    collection: 'Kids',
    images: [placeholder('Pull', '#2f4f3a', '#e7f0e5')],
  }),
]

// ----------------------------------------------------------------------------
// Clients & suppliers
// ----------------------------------------------------------------------------

export const CLIENTS: Client[] = [
  { id: 'cli-1', name: 'Sarah Benali', phone: '0661 11 22 33', createdAt: '2026-09-02T10:00:00.000Z' },
  { id: 'cli-2', name: 'Karim Haddad', phone: '0770 44 55 66', createdAt: '2026-09-10T10:00:00.000Z' },
  { id: 'cli-3', name: 'Nadia Cherif', phone: '0555 77 88 99', createdAt: '2026-09-18T10:00:00.000Z' },
  { id: 'cli-4', name: 'Yacine Meziane', phone: '0699 00 11 22', createdAt: '2026-10-01T10:00:00.000Z' },
]

export const SUPPLIERS: Supplier[] = [
  {
    id: 'sup-1',
    name: 'Textile Import SARL',
    phone: '021 55 66 77',
    address: 'Zone industrielle, Oued Smar, Alger',
    createdAt: '2026-08-01T10:00:00.000Z',
  },
  {
    id: 'sup-2',
    name: 'Mode Grossiste Oran',
    phone: '041 22 33 44',
    address: 'Rue de la Bastille, Oran',
    createdAt: '2026-08-12T10:00:00.000Z',
  },
  {
    id: 'sup-3',
    name: 'Accessoires & Co',
    phone: '031 88 99 00',
    address: 'Centre-ville, Constantine',
    createdAt: '2026-08-20T10:00:00.000Z',
  },
]

// ----------------------------------------------------------------------------
// Purchases
// ----------------------------------------------------------------------------

export const PURCHASES: Purchase[] = [
  {
    id: 'pur-1',
    reference: 'ACH-000001',
    supplierId: 'sup-1',
    supplierName: 'Textile Import SARL',
    lines: [
      { productId: 'prod-robe-lin', productName: 'Robe longue en lin', barcode: '6130000000012', size: 'M', quantity: 8, purchasePrice: 2800, salePrice: 5900, minQuantity: 4 },
      { productId: 'prod-chemise-coton', productName: 'Chemise en coton', barcode: '6130000000029', size: 'L', quantity: 7, purchasePrice: 1500, salePrice: 3200, minQuantity: 5 },
    ],
    total: 8 * 2800 + 7 * 1500,
    paid: 20000,
    payments: [{ id: 'pp-1', amount: 20000, date: '2026-09-01', note: 'Acompte' }],
    date: '2026-09-01',
    createdAt: '2026-09-01T11:00:00.000Z',
  },
  {
    id: 'pur-2',
    reference: 'ACH-000002',
    supplierId: 'sup-2',
    supplierName: 'Mode Grossiste Oran',
    lines: [
      { productId: 'prod-jean-slim', productName: 'Jean slim', barcode: '6130000000036', size: '40', quantity: 9, purchasePrice: 2200, salePrice: 4500, minQuantity: 6 },
      { productId: 'prod-veste-cuir', productName: 'Veste en cuir', barcode: '6130000000043', size: 'L', quantity: 3, purchasePrice: 7800, salePrice: 14900, minQuantity: 2 },
    ],
    total: 9 * 2200 + 3 * 7800,
    paid: 9 * 2200 + 3 * 7800,
    payments: [{ id: 'pp-2', amount: 9 * 2200 + 3 * 7800, date: '2026-09-15', note: 'Payé' }],
    date: '2026-09-15',
    createdAt: '2026-09-15T11:00:00.000Z',
  },
]

// ----------------------------------------------------------------------------
// Sales
// ----------------------------------------------------------------------------

export const SALES: Sale[] = [
  {
    id: 'sale-1',
    reference: 'VEN-000001',
    clientId: 'cli-1',
    clientName: 'Sarah Benali',
    lines: [
      { productId: 'prod-robe-lin', productName: 'Robe longue en lin', barcode: '6130000000012', size: 'M', quantity: 1, unitPrice: 5900 },
      { productId: 'prod-sac-main', productName: 'Sac à main matelassé', barcode: '6130000000067', size: 'Unique', quantity: 1, unitPrice: 4200 },
    ],
    subtotal: 10100,
    discount: 100,
    total: 10000,
    paid: 10000,
    payments: [{ id: 'sp-1', amount: 10000, date: '2026-10-05', note: 'Espèces' }],
    date: '2026-10-05',
    createdAt: '2026-10-05T14:00:00.000Z',
  },
  {
    id: 'sale-2',
    reference: 'VEN-000002',
    clientId: null,
    clientName: 'Client comptoir',
    lines: [
      { productId: 'prod-jean-slim', productName: 'Jean slim', barcode: '6130000000036', size: '40', quantity: 2, unitPrice: 4500 },
    ],
    subtotal: 9000,
    discount: 0,
    total: 9000,
    paid: 5000,
    payments: [{ id: 'sp-2', amount: 5000, date: '2026-10-08', note: 'Acompte' }],
    date: '2026-10-08',
    createdAt: '2026-10-08T16:30:00.000Z',
  },
  {
    id: 'sale-3',
    reference: 'VEN-000003',
    clientId: 'cli-3',
    clientName: 'Nadia Cherif',
    lines: [
      { productId: 'prod-sneakers', productName: 'Baskets urbaines', barcode: '6130000000050', size: '40', quantity: 1, unitPrice: 6900 },
    ],
    subtotal: 6900,
    discount: 400,
    total: 6500,
    paid: 6500,
    payments: [{ id: 'sp-3', amount: 6500, date: '2026-10-12', note: 'Carte' }],
    date: '2026-10-12',
    createdAt: '2026-10-12T11:15:00.000Z',
  },
]

// ----------------------------------------------------------------------------
// Workers
// ----------------------------------------------------------------------------

export const WORKERS: Worker[] = [
  {
    id: 'wk-1',
    fullName: 'Amel Vendeuse',
    birthDate: '1996-04-12',
    idCard: '109223344',
    phone: '0661 22 33 44',
    role: 'Vendeuse',
    hasSalary: true,
    salaryType: 'monthly',
    salaryAmount: 38000,
    hasAccount: true,
    email: 'amel@altech.dz',
    username: 'amel',
    password: '',
    permissions: {
      dashboard: { enabled: true, actions: ['view'] },
      pos: { enabled: true, actions: ['view', 'create', 'print', 'pay'] },
      sales: { enabled: true, actions: ['view', 'print'] },
      clients: { enabled: true, actions: ['view', 'create', 'edit'] },
    },
    startDate: '2026-01-15',
    active: true,
    advances: [
      { id: 'adv-1', date: '2026-10-03', description: 'Avance sur salaire', amount: 5000, deducted: false },
    ],
    absences: [
      { id: 'abs-1', date: '2026-09-22', description: 'Absence non justifiée', cost: 1500 },
    ],
    payments: [
      { id: 'wp-1', period: '2026-09', baseSalary: 38000, absencesDeducted: 1500, advancesDeducted: 0, amount: 36500, date: '2026-09-30', note: '' },
    ],
    createdAt: '2026-01-15T09:00:00.000Z',
  },
  {
    id: 'wk-2',
    fullName: 'Reda Magasinier',
    birthDate: '1990-11-30',
    idCard: '118877665',
    phone: '0770 55 66 77',
    role: 'Magasinier',
    hasSalary: true,
    salaryType: 'monthly',
    salaryAmount: 42000,
    hasAccount: false,
    email: '',
    username: '',
    password: '',
    permissions: {
      stock: { enabled: true, actions: ['view', 'create', 'edit'] },
      purchase: { enabled: true, actions: ['view', 'create'] },
    },
    startDate: '2025-11-01',
    active: true,
    advances: [],
    absences: [],
    payments: [],
    createdAt: '2025-11-01T09:00:00.000Z',
  },
]

// ----------------------------------------------------------------------------
// Expenses & caisse
// ----------------------------------------------------------------------------

export const EXPENSES: Expense[] = [
  { id: 'exp-1', name: 'Loyer boutique', description: 'Octobre 2026', amount: 60000, date: '2026-10-01', createdAt: '2026-10-01T08:00:00.000Z' },
  { id: 'exp-2', name: 'Électricité', description: 'Facture Sonelgaz', amount: 7800, date: '2026-10-04', createdAt: '2026-10-04T08:00:00.000Z' },
  { id: 'exp-3', name: 'Publicité Instagram', description: 'Campagne nouvelle collection', amount: 12000, date: '2026-10-07', createdAt: '2026-10-07T08:00:00.000Z' },
]

export const CAISSE: CaisseTransaction[] = [
  { id: 'cx-1', type: 'deposit', amount: 50000, description: 'Fonds de caisse initial', date: '2026-10-01', createdAt: '2026-10-01T08:30:00.000Z' },
  { id: 'cx-2', type: 'withdrawal', amount: 12000, description: 'Retrait pour dépenses', date: '2026-10-07', createdAt: '2026-10-07T18:00:00.000Z' },
  { id: 'cx-3', type: 'deposit', amount: 25000, description: 'Versement banque', date: '2026-10-11', createdAt: '2026-10-11T18:00:00.000Z' },
]

// ----------------------------------------------------------------------------
// Website — catalogue exposure, offers, carriers, orders
// ----------------------------------------------------------------------------

export const WEB_PRODUCTS: Record<string, WebProductMeta> = {
  'prod-robe-lin': { productId: 'prod-robe-lin', hidden: false, featured: true, updatedAt: '2026-10-01T09:00:00.000Z' },
  'prod-sneakers': { productId: 'prod-sneakers', hidden: false, featured: true, webPrice: 6500, updatedAt: '2026-10-01T09:00:00.000Z' },
  'prod-pull-enfant': { productId: 'prod-pull-enfant', hidden: true, featured: false, updatedAt: '2026-10-01T09:00:00.000Z' },
}

export const OFFERS: SpecialOffer[] = [
  {
    id: 'off-1',
    title: 'Pack Tenue Complète',
    description: 'Robe en lin + sac à main à prix réduit.',
    image: placeholder('Offre', '#4a2f3a', '#f0d9c0'),
    lines: [
      { productId: 'prod-robe-lin', productName: 'Robe longue en lin', quantity: 1, originalPrice: 5900, offerPrice: 4900 },
      { productId: 'prod-sac-main', productName: 'Sac à main matelassé', quantity: 1, originalPrice: 4200, offerPrice: 3200 },
    ],
    originalTotal: 10100,
    offerTotal: 8100,
    discountAmount: 2000,
    discountPercent: Math.round((2000 / 10100) * 100),
    active: true,
    startDate: '2026-10-01',
    endDate: '2026-12-31',
    createdAt: '2026-10-01T09:00:00.000Z',
  },
]

export const DELIVERY_COMPANIES: DeliveryCompany[] = [
  {
    id: 'dc-1',
    name: 'Yalidine',
    phone: '0550 00 00 00',
    logo: placeholder('Yalidine', '#0a7d3b', '#fff'),
    notes: 'Livraison 58 wilayas',
    active: true,
    prices: {
      '16::Alger Centre': { key: '16::Alger Centre', wilayaCode: '16', commune: 'Alger Centre', home: 400, desk: 250, enabled: true },
      '31::Oran': { key: '31::Oran', wilayaCode: '31', commune: 'Oran', home: 600, desk: 350, enabled: true },
      '25::Constantine': { key: '25::Constantine', wilayaCode: '25', commune: 'Constantine', home: 650, desk: 400, enabled: true },
    },
    createdAt: '2026-08-01T09:00:00.000Z',
  },
  {
    id: 'dc-2',
    name: 'ZR Express',
    phone: '0660 00 00 00',
    logo: placeholder('ZR', '#b4232a', '#fff'),
    notes: '',
    active: true,
    prices: {
      '16::Alger Centre': { key: '16::Alger Centre', wilayaCode: '16', commune: 'Alger Centre', home: 450, desk: 300, enabled: true },
      '09::Blida': { key: '09::Blida', wilayaCode: '09', commune: 'Blida', home: 500, desk: 300, enabled: true },
    },
    createdAt: '2026-08-05T09:00:00.000Z',
  },
]

export const WEB_ORDERS: WebOrder[] = [
  {
    id: 'wo-1',
    reference: 'WEB-000001',
    customerName: 'Lamia Boudiaf',
    phone: '0661 23 45 67',
    wilayaCode: '16',
    wilaya: 'Alger',
    commune: 'Alger Centre',
    address: '5 rue Larbi Ben Mhidi',
    deliveryMode: 'home',
    deliveryCompanyId: 'dc-1',
    deliveryCompanyName: 'Yalidine',
    deliveryPrice: 400,
    lines: [
      { productId: 'prod-robe-lin', productName: 'Robe longue en lin', size: 'M', quantity: 1, unitPrice: 5900, image: placeholder('Robe', '#8d7b68') },
    ],
    subtotal: 5900,
    total: 6300,
    status: 'pending',
    note: '',
    history: [{ status: 'pending', at: '2026-10-14T10:00:00.000Z' }],
    createdAt: '2026-10-14T10:00:00.000Z',
  },
  {
    id: 'wo-2',
    reference: 'WEB-000002',
    customerName: 'Sofiane Taleb',
    phone: '0770 11 22 33',
    wilayaCode: '31',
    wilaya: 'Oran',
    commune: 'Oran',
    address: 'Cité El Badr, Bt 4',
    deliveryMode: 'desk',
    deliveryCompanyId: 'dc-1',
    deliveryCompanyName: 'Yalidine',
    deliveryPrice: 350,
    lines: [
      { productId: 'prod-sneakers', productName: 'Baskets urbaines', size: '42', quantity: 1, unitPrice: 6500, image: placeholder('Baskets', '#efefef', '#222') },
    ],
    subtotal: 6500,
    total: 6850,
    status: 'accepted',
    note: 'Appeler avant livraison',
    history: [
      { status: 'pending', at: '2026-10-13T09:00:00.000Z' },
      { status: 'accepted', at: '2026-10-13T12:00:00.000Z' },
    ],
    createdAt: '2026-10-13T09:00:00.000Z',
  },
  {
    id: 'wo-3',
    reference: 'WEB-000003',
    customerName: 'Imane Khelifi',
    phone: '0555 66 77 88',
    wilayaCode: '25',
    wilaya: 'Constantine',
    commune: 'Constantine',
    address: 'Rue Didouche Mourad',
    deliveryMode: 'home',
    deliveryCompanyId: 'dc-1',
    deliveryCompanyName: 'Yalidine',
    deliveryPrice: 650,
    lines: [
      { productId: 'prod-veste-cuir', productName: 'Veste en cuir', size: 'L', quantity: 1, unitPrice: 14900, image: placeholder('Veste', '#1b1b1b', '#c9a24b') },
    ],
    subtotal: 14900,
    total: 15550,
    status: 'completed',
    note: '',
    history: [
      { status: 'pending', at: '2026-10-02T09:00:00.000Z' },
      { status: 'accepted', at: '2026-10-02T11:00:00.000Z' },
      { status: 'delivered', at: '2026-10-04T15:00:00.000Z' },
      { status: 'completed', at: '2026-10-05T10:00:00.000Z' },
    ],
    cashedAt: '2026-10-05T10:00:00.000Z',
    stockAppliedAt: '2026-10-04T15:00:00.000Z',
    createdAt: '2026-10-02T09:00:00.000Z',
  },
]
