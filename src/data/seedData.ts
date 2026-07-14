// ============================================================================
// Atelier Mode — constant demo data
// ----------------------------------------------------------------------------
// The app runs entirely in memory: no database, no localStorage. Every store is
// seeded from this file on boot, so every screen (dashboard, stock, POS, sales,
// purchases, clients, suppliers, workers, expenses, caisse, reports) has
// realistic data to exercise on a fresh load.
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
  SizeStock,
  StoreSettings,
  Supplier,
  Worker,
} from '@/types'
import { round2, sumSizes } from '@/utils/helpers'

// ----------------------------------------------------------------------------
// Catalogue reference lists
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

export const INITIAL_BRANDS = [
  'Atelier Maison',
  'Zara',
  'H&M',
  'Mango',
  "Levi's",
  'Lacoste',
  'Nike',
  'Adidas',
  'Autre',
]

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

export const DEMO_ADMIN: AppUser = {
  id: 'admin-demo',
  fullName: 'Admin Démo',
  username: 'admin',
  email: 'admin@atelier-mode.com',
  password: 'demo2024',
  role: 'Administrateur',
  permissions: 'ALL',
  isDemo: true,
}

// ----------------------------------------------------------------------------
// Date helpers — relative to "now" so the demo always looks fresh
// ----------------------------------------------------------------------------

const now = new Date()
const iso = (d: Date) => d.toISOString()
const daysAgo = (n: number): string => {
  const d = new Date(now)
  d.setDate(d.getDate() - n)
  return iso(d)
}
const monthsAgo = (n: number, day = 15): string =>
  iso(new Date(now.getFullYear(), now.getMonth() - n, day, 11, 30))

// ----------------------------------------------------------------------------
// Products
// ----------------------------------------------------------------------------

/** Build a size breakdown from `{ size: qty }` pairs. */
const sz = (pairs: Record<string, number>): SizeStock[] =>
  Object.entries(pairs).map(([size, quantity]) => ({ size, quantity }))

/** Assemble a product, deriving `quantity` from the size breakdown. */
const mkProduct = (
  p: Omit<Product, 'quantity' | 'createdAt'> & { createdAt: string },
): Product => ({ ...p, quantity: sumSizes(p.sizes) })

export const INITIAL_PRODUCTS: Product[] = [
  mkProduct({
    id: 'p1',
    name: 'Robe longue « Élise »',
    description: 'Robe fluide midi, manches courtes, ceinture nouée à la taille.',
    barcode: '6132540098761',
    brand: 'Atelier Maison',
    category: 'Robes',
    purchasePrice: 2400,
    salePrice: 5200,
    minQuantity: 6,
    sizeCategory: 'alpha',
    sizes: sz({ XS: 3, S: 7, M: 9, L: 5, XL: 2 }),
    color: 'Noir',
    material: 'Viscose',
    gender: 'women',
    season: 'springSummer',
    collection: 'Printemps/Été 2026',
    createdAt: daysAgo(150),
  }),
  mkProduct({
    id: 'p2',
    name: 'Chemise en lin « Riviera »',
    description: 'Chemise homme 100 % lin, coupe droite, col italien.',
    barcode: '6132540098778',
    brand: 'Zara',
    category: 'Chemises',
    purchasePrice: 1500,
    salePrice: 3400,
    minQuantity: 8,
    sizeCategory: 'alpha',
    sizes: sz({ S: 4, M: 11, L: 8, XL: 6, XXL: 2 }),
    color: 'Blanc',
    material: 'Lin',
    gender: 'men',
    season: 'springSummer',
    collection: 'Printemps/Été 2026',
    createdAt: daysAgo(140),
  }),
  mkProduct({
    id: 'p3',
    name: 'Jean slim « Denim 501 »',
    description: 'Jean coupe slim, taille haute, denim brut stretch.',
    barcode: '6132540098785',
    brand: "Levi's",
    category: 'Pantalons',
    purchasePrice: 2800,
    salePrice: 6200,
    minQuantity: 8,
    sizeCategory: 'numeric',
    // 38 en rupture alors que l'article reste vendable → alerte "taille manquante"
    sizes: sz({ '36': 5, '38': 0, '40': 9, '42': 7, '44': 3, '46': 2 }),
    color: 'Bleu indigo',
    material: 'Denim',
    gender: 'unisex',
    season: 'allSeason',
    collection: 'Permanent',
    createdAt: daysAgo(130),
  }),
  mkProduct({
    id: 'p4',
    name: 'Veste en cuir « Rebel »',
    description: 'Perfecto en cuir d’agneau, doublure satinée, zip argenté.',
    barcode: '6132540098792',
    brand: 'Mango',
    category: 'Vestes & Manteaux',
    purchasePrice: 7500,
    salePrice: 15900,
    minQuantity: 3,
    sizeCategory: 'alpha',
    sizes: sz({ S: 2, M: 4, L: 3, XL: 1 }),
    color: 'Camel',
    material: 'Cuir',
    gender: 'women',
    season: 'fallWinter',
    collection: 'Automne/Hiver 2026',
    createdAt: daysAgo(120),
  }),
  mkProduct({
    id: 'p5',
    name: 'T-shirt coton bio « Essentiel »',
    description: 'T-shirt basique col rond, coton biologique certifié.',
    barcode: '6132540098808',
    brand: 'H&M',
    category: 'T-shirts & Tops',
    purchasePrice: 550,
    salePrice: 1400,
    minQuantity: 15,
    sizeCategory: 'alpha',
    // stock total sous le seuil → alerte stock faible
    sizes: sz({ XS: 1, S: 2, M: 3, L: 2, XL: 1, XXL: 0 }),
    color: 'Blanc',
    material: 'Coton bio',
    gender: 'unisex',
    season: 'allSeason',
    collection: 'Permanent',
    createdAt: daysAgo(110),
  }),
  mkProduct({
    id: 'p6',
    name: 'Jupe plissée « Midi »',
    description: 'Jupe plissée mi-longue, taille élastiquée, tombé fluide.',
    barcode: '6132540098815',
    brand: 'Zara',
    category: 'Jupes',
    purchasePrice: 1300,
    salePrice: 2900,
    minQuantity: 6,
    sizeCategory: 'numeric',
    sizes: sz({ '34': 4, '36': 6, '38': 8, '40': 5, '42': 2 }),
    color: 'Beige',
    material: 'Polyester',
    gender: 'women',
    season: 'springSummer',
    collection: 'Printemps/Été 2026',
    createdAt: daysAgo(100),
  }),
  mkProduct({
    id: 'p7',
    name: 'Sneakers « Urban Run »',
    description: 'Baskets basses, semelle amortissante, tige respirante.',
    barcode: '6132540098822',
    brand: 'Nike',
    category: 'Chaussures',
    purchasePrice: 4200,
    salePrice: 8900,
    minQuantity: 8,
    sizeCategory: 'shoes',
    sizes: sz({ '39': 3, '40': 6, '41': 7, '42': 8, '43': 5, '44': 2, '45': 0 }),
    color: 'Blanc',
    material: 'Cuir',
    gender: 'unisex',
    season: 'allSeason',
    collection: 'Permanent',
    createdAt: daysAgo(90),
  }),
  mkProduct({
    id: 'p8',
    name: 'Manteau en laine « Hiver »',
    description: 'Manteau long croisé, laine mélangée, poches passepoilées.',
    barcode: '6132540098839',
    brand: 'Atelier Maison',
    category: 'Vestes & Manteaux',
    purchasePrice: 6800,
    salePrice: 14500,
    minQuantity: 4,
    sizeCategory: 'alpha',
    sizes: sz({ S: 3, M: 5, L: 4, XL: 2 }),
    color: 'Gris anthracite',
    material: 'Laine',
    gender: 'women',
    season: 'fallWinter',
    collection: 'Automne/Hiver 2026',
    createdAt: daysAgo(80),
  }),
  mkProduct({
    id: 'p9',
    name: 'Écharpe en cachemire',
    description: 'Écharpe douce en cachemire, franges nouées main.',
    barcode: '6132540098846',
    brand: 'Atelier Maison',
    category: 'Accessoires',
    purchasePrice: 1900,
    salePrice: 4300,
    minQuantity: 5,
    sizeCategory: 'oneSize',
    sizes: sz({ TU: 16 }),
    color: 'Bordeaux',
    material: 'Cachemire',
    gender: 'unisex',
    season: 'fallWinter',
    collection: 'Automne/Hiver 2026',
    createdAt: daysAgo(70),
  }),
  mkProduct({
    id: 'p10',
    name: 'Pull enfant « Nuage »',
    description: 'Pull maille douce pour enfant, col rond, coton mélangé.',
    barcode: '6132540098853',
    brand: 'H&M',
    category: 'Enfants',
    purchasePrice: 900,
    salePrice: 2100,
    minQuantity: 6,
    sizeCategory: 'kids',
    sizes: sz({ '2 ans': 4, '4 ans': 6, '6 ans': 5, '8 ans': 3, '10 ans': 2 }),
    color: 'Écru',
    material: 'Coton',
    gender: 'kids',
    season: 'fallWinter',
    collection: 'Automne/Hiver 2026',
    createdAt: daysAgo(60),
  }),
  mkProduct({
    id: 'p11',
    name: 'Pantalon chino « Classic »',
    description: 'Chino homme coupe droite, coton armuré, ceinture passants.',
    barcode: '6132540098860',
    brand: 'Lacoste',
    category: 'Pantalons',
    purchasePrice: 2100,
    salePrice: 4600,
    minQuantity: 6,
    sizeCategory: 'numeric',
    sizes: sz({ '38': 3, '40': 6, '42': 7, '44': 4, '46': 2, '48': 1 }),
    color: 'Kaki',
    material: 'Coton',
    gender: 'men',
    season: 'allSeason',
    collection: 'Permanent',
    createdAt: daysAgo(50),
  }),
  mkProduct({
    id: 'p12',
    name: 'Sac en cuir « Milano »',
    description: 'Sac à main en cuir grainé, bandoulière amovible.',
    barcode: '6132540098877',
    brand: 'Mango',
    category: 'Accessoires',
    purchasePrice: 3600,
    salePrice: 7800,
    minQuantity: 3,
    sizeCategory: 'oneSize',
    sizes: sz({ TU: 9 }),
    color: 'Noir',
    material: 'Cuir',
    gender: 'women',
    season: 'allSeason',
    collection: 'Permanent',
    createdAt: daysAgo(40),
  }),
]

const byId = (id: string): Product => INITIAL_PRODUCTS.find((p) => p.id === id)!

// ----------------------------------------------------------------------------
// Suppliers
// ----------------------------------------------------------------------------

export const INITIAL_SUPPLIERS: Supplier[] = [
  { id: 's1', name: 'Textile Import Méditerranée', phone: '0550 12 34 56', address: 'Zone industrielle, Rouiba, Alger', createdAt: daysAgo(220) },
  { id: 's2', name: 'Confection El Djazaïr SARL', phone: '0661 98 76 54', address: 'Rue des Frères Bouadou, Oran', createdAt: daysAgo(200) },
  { id: 's3', name: 'Maison du Cuir & Accessoires', phone: '0770 45 67 89', address: 'Cité 1000 logements, Constantine', createdAt: daysAgo(180) },
  { id: 's4', name: 'Sport & Sneakers Distribution', phone: '0555 33 44 55', address: 'Bab Ezzouar, Alger', createdAt: daysAgo(160) },
]

// ----------------------------------------------------------------------------
// Clients
// ----------------------------------------------------------------------------

export const INITIAL_CLIENTS: Client[] = [
  { id: 'c1', name: 'Karim Benali', phone: '0555 11 22 33', createdAt: daysAgo(140) },
  { id: 'c2', name: 'Amina Cherif', phone: '0666 44 55 66', createdAt: daysAgo(130) },
  { id: 'c3', name: 'Sofiane Mansouri', phone: '0777 77 88 99', createdAt: daysAgo(120) },
  { id: 'c4', name: 'Yasmine Haddad', phone: '0540 10 20 30', createdAt: daysAgo(110) },
  { id: 'c5', name: 'Réda Boukhari', phone: '0660 60 70 80', createdAt: daysAgo(100) },
  { id: 'c6', name: 'Nadia Belkacem', phone: '0771 21 31 41', createdAt: daysAgo(90) },
  { id: 'c7', name: 'Boutique Le Dressing (revendeur)', phone: '0550 90 80 70', createdAt: daysAgo(80) },
  { id: 'c8', name: 'Mohamed Larbi', phone: '0661 15 25 35', createdAt: daysAgo(70) },
  { id: 'c9', name: 'Lina Saadi', phone: '0775 55 45 35', createdAt: daysAgo(50) },
  { id: 'c10', name: 'Atelier Couture Élégance', phone: '0540 33 22 11', createdAt: daysAgo(30) },
]

// ----------------------------------------------------------------------------
// Purchases
// ----------------------------------------------------------------------------

/** A purchase line for one size of a product. */
const pLine = (p: Product, size: string, quantity: number): Purchase['lines'][number] => ({
  productId: p.id,
  productName: p.name,
  barcode: p.barcode,
  size,
  quantity,
  purchasePrice: p.purchasePrice,
  salePrice: p.salePrice,
  minQuantity: p.minQuantity,
})

const mkPurchase = (
  id: string,
  reference: string,
  supplier: Supplier,
  lines: Purchase['lines'],
  date: string,
  paidRatio: number,
): Purchase => {
  const total = round2(lines.reduce((s, l) => s + l.quantity * l.purchasePrice, 0))
  const paid = round2(total * paidRatio)
  return {
    id,
    reference,
    supplierId: supplier.id,
    supplierName: supplier.name,
    lines,
    total,
    paid,
    payments: paid > 0 ? [{ id: `${id}-pay1`, amount: paid, date, note: 'Versement initial' }] : [],
    date,
    createdAt: date,
  }
}

export const INITIAL_PURCHASES: Purchase[] = [
  mkPurchase('pu1', 'ACH-2026-001', INITIAL_SUPPLIERS[0], [
    pLine(byId('p1'), 'S', 10),
    pLine(byId('p1'), 'M', 12),
    pLine(byId('p1'), 'L', 8),
    pLine(byId('p2'), 'M', 14),
    pLine(byId('p2'), 'L', 10),
  ], monthsAgo(4, 8), 1),
  mkPurchase('pu2', 'ACH-2026-002', INITIAL_SUPPLIERS[1], [
    pLine(byId('p3'), '40', 12),
    pLine(byId('p3'), '42', 10),
    pLine(byId('p6'), '38', 10),
  ], monthsAgo(3, 12), 0.5),
  mkPurchase('pu3', 'ACH-2026-003', INITIAL_SUPPLIERS[2], [
    pLine(byId('p4'), 'M', 6),
    pLine(byId('p4'), 'L', 5),
    pLine(byId('p12'), 'TU', 12),
  ], monthsAgo(2, 18), 1),
  mkPurchase('pu4', 'ACH-2026-004', INITIAL_SUPPLIERS[3], [
    pLine(byId('p7'), '41', 10),
    pLine(byId('p7'), '42', 12),
    pLine(byId('p7'), '43', 8),
  ], daysAgo(25), 0.6),
  // The big seasonal buy lands last month; recent restocks are deliberately
  // light so the current month reads as a profitable trading month.
  mkPurchase('pu5', 'ACH-2026-005', INITIAL_SUPPLIERS[0], [
    pLine(byId('p8'), 'M', 6),
    pLine(byId('p9'), 'TU', 20),
  ], daysAgo(38), 1),
  mkPurchase('pu6', 'ACH-2026-006', INITIAL_SUPPLIERS[1], [
    pLine(byId('p10'), '4 ans', 5),
    pLine(byId('p5'), 'M', 10),
  ], daysAgo(9), 1),
]

// ----------------------------------------------------------------------------
// Sales
// ----------------------------------------------------------------------------

const sLine = (p: Product, size: string, quantity: number): Sale['lines'][number] => ({
  productId: p.id,
  productName: p.name,
  barcode: p.barcode,
  size,
  quantity,
  unitPrice: p.salePrice,
})

const mkSale = (
  id: string,
  reference: string,
  client: Client | null,
  lines: Sale['lines'],
  date: string,
  paidRatio: number,
  discount = 0,
): Sale => {
  const subtotal = round2(lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0))
  const total = round2(subtotal - discount)
  const paid = round2(total * paidRatio)
  return {
    id,
    reference,
    clientId: client?.id ?? null,
    clientName: client?.name ?? 'Client de passage',
    lines,
    subtotal,
    discount,
    total,
    paid,
    payments: paid > 0 ? [{ id: `${id}-pay1`, amount: paid, date, note: 'Encaissement' }] : [],
    date,
    createdAt: date,
  }
}

export const INITIAL_SALES: Sale[] = [
  mkSale('sa1', 'VTE-2026-001', INITIAL_CLIENTS[0], [sLine(byId('p2'), 'L', 2)], monthsAgo(11, 6), 1),
  mkSale('sa2', 'VTE-2026-002', INITIAL_CLIENTS[1], [sLine(byId('p1'), 'M', 1), sLine(byId('p9'), 'TU', 1)], monthsAgo(10, 14), 1),
  mkSale('sa3', 'VTE-2026-003', INITIAL_CLIENTS[2], [sLine(byId('p3'), '42', 2), sLine(byId('p5'), 'L', 3)], monthsAgo(9, 20), 1),
  mkSale('sa4', 'VTE-2026-004', null, [sLine(byId('p7'), '42', 1)], monthsAgo(8, 9), 1),
  mkSale('sa5', 'VTE-2026-005', INITIAL_CLIENTS[6], [sLine(byId('p1'), 'S', 4), sLine(byId('p6'), '38', 5)], monthsAgo(7, 22), 0.4),
  mkSale('sa6', 'VTE-2026-006', INITIAL_CLIENTS[3], [sLine(byId('p4'), 'M', 1)], monthsAgo(6, 11), 1),
  mkSale('sa7', 'VTE-2026-007', INITIAL_CLIENTS[4], [sLine(byId('p11'), '42', 1), sLine(byId('p2'), 'M', 1)], monthsAgo(5, 17), 1, 400),
  mkSale('sa8', 'VTE-2026-008', INITIAL_CLIENTS[5], [sLine(byId('p8'), 'M', 1)], monthsAgo(4, 25), 1),
  mkSale('sa9', 'VTE-2026-009', INITIAL_CLIENTS[9], [sLine(byId('p12'), 'TU', 3)], monthsAgo(3, 8), 0.5),
  mkSale('sa10', 'VTE-2026-010', INITIAL_CLIENTS[7], [sLine(byId('p7'), '41', 2), sLine(byId('p7'), '43', 1)], monthsAgo(2, 19), 1),
  mkSale('sa11', 'VTE-2026-011', INITIAL_CLIENTS[8], [sLine(byId('p3'), '40', 2), sLine(byId('p1'), 'M', 1)], monthsAgo(1, 10), 1),
  mkSale('sa12', 'VTE-2026-012', INITIAL_CLIENTS[0], [sLine(byId('p10'), '6 ans', 2)], daysAgo(14), 1),
  mkSale('sa13', 'VTE-2026-013', INITIAL_CLIENTS[2], [sLine(byId('p6'), '36', 2), sLine(byId('p5'), 'M', 2)], daysAgo(6), 0.3),
  mkSale('sa14', 'VTE-2026-014', null, [sLine(byId('p9'), 'TU', 1)], daysAgo(3), 1),
  mkSale('sa15', 'VTE-2026-015', INITIAL_CLIENTS[3], [sLine(byId('p4'), 'L', 1), sLine(byId('p12'), 'TU', 1)], daysAgo(1), 1, 800),
  mkSale('sa16', 'VTE-2026-016', INITIAL_CLIENTS[1], [sLine(byId('p2'), 'XL', 1), sLine(byId('p11'), '40', 1)], daysAgo(0), 1),
  mkSale('sa17', 'VTE-2026-017', null, [sLine(byId('p5'), 'S', 2)], daysAgo(0), 1),
  // A couple of larger, recent baskets keep the current month comfortably in profit.
  mkSale('sa18', 'VTE-2026-018', INITIAL_CLIENTS[5], [sLine(byId('p4'), 'M', 1), sLine(byId('p8'), 'M', 1)], daysAgo(1), 1),
  mkSale('sa19', 'VTE-2026-019', INITIAL_CLIENTS[8], [sLine(byId('p3'), '40', 2), sLine(byId('p1'), 'M', 1), sLine(byId('p9'), 'TU', 1)], daysAgo(2), 1),
  mkSale('sa20', 'VTE-2026-020', INITIAL_CLIENTS[3], [sLine(byId('p7'), '42', 1), sLine(byId('p12'), 'TU', 1)], daysAgo(0), 1),
]

// ----------------------------------------------------------------------------
// Workers
// ----------------------------------------------------------------------------

export const INITIAL_WORKERS: Worker[] = [
  {
    id: 'w1',
    fullName: 'Yasmine Bouzid',
    birthDate: '1990-04-12',
    idCard: '109876543',
    phone: '0551 23 45 67',
    role: 'Conseiller·ère de style',
    hasSalary: true,
    salaryType: 'monthly',
    salaryAmount: 48000,
    hasAccount: true,
    email: 'yasmine@atelier-mode.com',
    username: 'yasmine',
    password: 'yasmine123',
    permissions: {
      dashboard: { enabled: true, actions: ['view'] },
      stock: { enabled: true, actions: ['view'] },
      pos: { enabled: true, actions: ['view', 'create'] },
      sales: { enabled: true, actions: ['view', 'create', 'pay'] },
      clients: { enabled: true, actions: ['view', 'create', 'edit'] },
    },
    startDate: daysAgo(320),
    active: true,
    advances: [{ id: 'w1-a1', date: daysAgo(10), description: 'Avance sur salaire', amount: 12000, deducted: false }],
    absences: [{ id: 'w1-ab1', date: daysAgo(8), description: 'Absence non justifiée', cost: 1800 }],
    payments: [
      { id: 'w1-p1', period: '2026-05', baseSalary: 48000, absencesDeducted: 0, advancesDeducted: 0, amount: 48000, date: monthsAgo(2, 28), note: 'Salaire mai' },
      { id: 'w1-p2', period: '2026-06', baseSalary: 48000, absencesDeducted: 0, advancesDeducted: 0, amount: 48000, date: monthsAgo(1, 28), note: 'Salaire juin' },
    ],
    createdAt: daysAgo(320),
  },
  {
    id: 'w2',
    fullName: 'Salima Toumi',
    birthDate: '1995-09-03',
    idCard: '112233445',
    phone: '0662 34 56 78',
    role: 'Caissier·ère',
    hasSalary: true,
    salaryType: 'monthly',
    salaryAmount: 40000,
    hasAccount: false,
    email: '',
    username: '',
    password: '',
    permissions: {},
    startDate: daysAgo(210),
    active: true,
    advances: [],
    absences: [],
    payments: [
      { id: 'w2-p1', period: '2026-06', baseSalary: 40000, absencesDeducted: 0, advancesDeducted: 0, amount: 40000, date: monthsAgo(1, 28), note: 'Salaire juin' },
    ],
    createdAt: daysAgo(210),
  },
  {
    id: 'w3',
    fullName: 'Nadia Kaci',
    birthDate: '1988-01-25',
    idCard: '998877665',
    phone: '0773 45 67 89',
    role: 'Retoucheur·se',
    hasSalary: true,
    salaryType: 'daily',
    salaryAmount: 2200,
    hasAccount: false,
    email: '',
    username: '',
    password: '',
    permissions: {},
    startDate: daysAgo(160),
    active: false,
    advances: [],
    absences: [{ id: 'w3-ab1', date: daysAgo(3), description: 'Congé maladie', cost: 2200 }],
    payments: [],
    createdAt: daysAgo(160),
  },
]

// ----------------------------------------------------------------------------
// Expenses
// ----------------------------------------------------------------------------

export const INITIAL_EXPENSES: Expense[] = [
  { id: 'e1', name: 'Loyer de la boutique', description: 'Loyer mensuel du local commercial', amount: 65000, date: daysAgo(20), createdAt: daysAgo(20) },
  { id: 'e2', name: 'Électricité & Eau', description: 'Facture SONELGAZ + SEAAL', amount: 15200, date: daysAgo(14), createdAt: daysAgo(14) },
  { id: 'e3', name: 'Cintres & housses', description: 'Réassort cintres bois et housses de protection', amount: 9500, date: daysAgo(9), createdAt: daysAgo(9) },
  { id: 'e4', name: 'Sacs boutique & étiquettes', description: 'Sacs papier logotés et étiquettes de prix', amount: 11000, date: daysAgo(6), createdAt: daysAgo(6) },
  { id: 'e5', name: 'Campagne Instagram', description: 'Promotion de la collection Printemps/Été', amount: 18000, date: daysAgo(2), createdAt: daysAgo(2) },
]

// ----------------------------------------------------------------------------
// Caisse
// ----------------------------------------------------------------------------

export const INITIAL_CAISSE: CaisseTransaction[] = [
  { id: 'cx1', type: 'deposit', amount: 200000, description: 'Fonds de caisse initial', date: monthsAgo(5, 2), createdAt: monthsAgo(5, 2) },
  { id: 'cx2', type: 'deposit', amount: 50000, description: 'Apport du gérant', date: monthsAgo(2, 10), createdAt: monthsAgo(2, 10) },
  { id: 'cx3', type: 'withdrawal', amount: 30000, description: 'Retrait vers compte bancaire', date: daysAgo(21), createdAt: daysAgo(21) },
  { id: 'cx4', type: 'deposit', amount: 25000, description: 'Encaissement retouches sur mesure', date: daysAgo(11), createdAt: daysAgo(11) },
  { id: 'cx5', type: 'withdrawal', amount: 12000, description: 'Frais de transport marchandise', date: daysAgo(5), createdAt: daysAgo(5) },
]

// ----------------------------------------------------------------------------
// Settings
// ----------------------------------------------------------------------------

export const INITIAL_SETTINGS: StoreSettings = {
  logo: '',
  name: 'Atelier Mode',
  description: 'Prêt-à-porter, chaussures et accessoires',
  email: 'contact@atelier-mode.com',
  phone: '0550 00 11 22',
  address: '12 Boulevard des Martyrs, Hydra, Alger',
  nif: '000216001234567',
  nis: '000216009876543',
  article: '16/00-1234567',
  rc: '16/00-9876543 B 24',
  currency: 'DA',
}

/** Accounts that can sign in on a fresh boot. */
export const INITIAL_USERS: AppUser[] = [
  DEMO_ADMIN,
  {
    id: 'user-yasmine',
    fullName: 'Yasmine Bouzid',
    username: 'yasmine',
    email: 'yasmine@atelier-mode.com',
    password: 'yasmine123',
    role: 'Conseiller·ère de style',
    permissions: INITIAL_WORKERS[0].permissions,
  },
]
