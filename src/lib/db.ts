// ============================================================================
// Data access — in-memory demo store, no database
// ----------------------------------------------------------------------------
// Every database connection was removed from this build. This module used to
// read and write Supabase; it now keeps the whole boutique in memory, seeded
// from the constant records in `src/data/mockData.ts`. The public surface is
// unchanged — the same function names, arguments and return shapes — so the
// stores in `src/store` did not have to change: they still call `fetch*`,
// `create*`, `update*` and `delete*` exactly as before.
//
// State lives for the life of the tab. A refresh re-seeds from the constants,
// which is the behaviour you want for a demo or a test run.
// ============================================================================

import type {
  CaisseTransaction,
  Client,
  CommunePrice,
  ContactLinks,
  DeliveryCompany,
  Expense,
  OfferLine,
  Payment,
  Product,
  Purchase,
  PurchaseLine,
  Sale,
  SaleLine,
  SizeCategory,
  SizeStock,
  SpecialOffer,
  StoreSettings,
  Supplier,
  WebOrder,
  WebOrderStatus,
  WebProductMeta,
  WebsiteSettings,
  Worker,
} from '@/types'
import { compareSizes } from '@/utils/helpers'
import {
  CAISSE,
  CLIENTS,
  CONTACTS,
  DELIVERY_COMPANIES,
  EXPENSES,
  OFFERS,
  PRODUCTS,
  PURCHASES,
  REFERENCE_LISTS,
  SALES,
  STORE_SETTINGS,
  SUPPLIERS,
  uid,
  WEB_ORDERS,
  WEB_PRODUCTS,
  WEBSITE_SETTINGS,
  WORKERS,
} from '@/data/mockData'

// ----------------------------------------------------------------------------
// In-memory state (deep-cloned from the seed so the constants stay pristine)
// ----------------------------------------------------------------------------

const clone = <T>(value: T): T =>
  typeof structuredClone === 'function'
    ? structuredClone(value)
    : (JSON.parse(JSON.stringify(value)) as T)

interface ReferenceState {
  brands: string[]
  categories: string[]
  colors: string[]
  materials: string[]
  roles: string[]
  sizeScales: Record<SizeCategory, string[]>
}

const state = {
  reference: clone<ReferenceState>(REFERENCE_LISTS),
  storeSettings: clone(STORE_SETTINGS),
  contacts: clone(CONTACTS),
  website: clone(WEBSITE_SETTINGS),
  products: clone(PRODUCTS),
  clients: clone(CLIENTS),
  suppliers: clone(SUPPLIERS),
  purchases: clone(PURCHASES),
  sales: clone(SALES),
  workers: clone(WORKERS),
  expenses: clone(EXPENSES),
  caisse: clone(CAISSE),
  webProducts: clone(WEB_PRODUCTS),
  offers: clone(OFFERS),
  deliveryCompanies: clone(DELIVERY_COMPANIES),
  orders: clone(WEB_ORDERS),
}

let purchaseSeq = state.purchases.length
let saleSeq = state.sales.length
let orderSeq = state.orders.length

const nowIso = () => new Date().toISOString()
/** A fresh async return, so callers that `await` behave as before. */
const settle = <T>(value: T): Promise<T> => Promise.resolve(clone(value))

export const isConfigured = (): boolean => true

/** A stored asset — in the demo build the value is already renderable. */
export const assetUrl = (_bucket: string, value: string | null | undefined): string => value ?? ''

// ----------------------------------------------------------------------------
// Stock helpers (mirror the database triggers)
// ----------------------------------------------------------------------------

const syncQuantity = (p: Product) => {
  if (p.sizes.length) p.quantity = p.sizes.reduce((s, x) => s + x.quantity, 0)
}

/** Move stock for one article/size, creating the size row if needed. */
const moveStock = (productId: string, size: string, delta: number) => {
  const product = state.products.find((p) => p.id === productId)
  if (!product) return
  if (product.sizes.length || size) {
    const row = product.sizes.find((s) => s.size === size)
    if (row) row.quantity = Math.max(0, row.quantity + delta)
    else if (delta > 0) product.sizes.push({ size: size || 'Unique', quantity: delta })
    syncQuantity(product)
  } else {
    product.quantity = Math.max(0, product.quantity + delta)
  }
}

// ============================================================================
//  REFERENCE LISTS
// ============================================================================

export interface ReferenceLists {
  brands: string[]
  categories: string[]
  colors: string[]
  materials: string[]
  roles: string[]
  sizeScales: Record<SizeCategory, string[]>
}

export const fetchReferenceLists = async (): Promise<ReferenceLists> => settle(state.reference)

const addNamed = async (key: keyof ReferenceState, name: string): Promise<void> => {
  const list = state.reference[key] as string[]
  if (!list.includes(name)) {
    list.push(name)
    list.sort()
  }
}

export const addBrand = (name: string) => addNamed('brands', name)
export const addCategory = (name: string) => addNamed('categories', name)
export const addColor = (name: string) => addNamed('colors', name)
export const addMaterial = (name: string) => addNamed('materials', name)
export const addRole = (name: string) => addNamed('roles', name)

export const addSizeToScale = async (category: SizeCategory, label: string): Promise<void> => {
  const scale = (state.reference.sizeScales[category] ??= [])
  if (!scale.includes(label)) scale.push(label)
}

// ============================================================================
//  STORE IDENTITY  (single-row tables)
// ============================================================================

export const fetchStoreSettings = async (): Promise<StoreSettings | null> => settle(state.storeSettings)

export const saveStoreSettings = async (patch: Partial<StoreSettings>): Promise<void> => {
  state.storeSettings = { ...state.storeSettings, ...patch }
}

export const fetchContacts = async (): Promise<ContactLinks | null> => settle(state.contacts)

export const saveContacts = async (patch: Partial<ContactLinks>): Promise<void> => {
  state.contacts = { ...state.contacts, ...patch }
}

export const fetchWebsiteSettings = async (): Promise<WebsiteSettings | null> => settle(state.website)

export const saveWebsiteSettings = async (patch: Partial<WebsiteSettings>): Promise<void> => {
  state.website = { ...state.website, ...patch }
}

// ============================================================================
//  PRODUCTS
// ============================================================================

const sortedSizes = (sizes: SizeStock[]): SizeStock[] =>
  sizes.slice().sort((a, b) => compareSizes(a.size, b.size))

export const fetchProducts = async (): Promise<Product[]> =>
  settle(
    state.products
      .slice()
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
      .map((p) => ({ ...p, sizes: sortedSizes(p.sizes) })),
  )

export const createProduct = async (data: Partial<Product>): Promise<Product> => {
  const sizes = (data.sizes ?? []).map((s) => ({ size: s.size, quantity: Math.max(0, s.quantity) }))
  const product: Product = {
    id: uid('prod'),
    name: data.name ?? '',
    description: data.description ?? '',
    barcode: data.barcode ?? '',
    brand: data.brand ?? '',
    category: data.category ?? '',
    purchasePrice: data.purchasePrice ?? 0,
    salePrice: data.salePrice ?? 0,
    quantity: sizes.length ? sizes.reduce((s, x) => s + x.quantity, 0) : (data.quantity ?? 0),
    minQuantity: data.minQuantity ?? 0,
    sizeCategory: data.sizeCategory ?? 'alpha',
    sizes,
    color: data.color ?? '',
    material: data.material ?? '',
    gender: data.gender ?? 'women',
    season: data.season ?? 'allSeason',
    collection: data.collection ?? '',
    images: data.images ?? [],
    createdAt: nowIso(),
  }
  state.products.unshift(product)
  return settle(product)
}

export const updateProduct = async (id: string, data: Partial<Product>): Promise<Product> => {
  const product = state.products.find((p) => p.id === id)
  if (!product) throw new Error('product-not-found')
  const { sizes, quantity, ...rest } = data
  Object.assign(product, rest)
  if (sizes !== undefined) {
    product.sizes = sizes.map((s) => ({ size: s.size, quantity: Math.max(0, s.quantity) }))
  }
  if (product.sizes.length) syncQuantity(product)
  else if (quantity !== undefined) product.quantity = quantity
  return settle({ ...product, sizes: sortedSizes(product.sizes) })
}

export const deleteProduct = async (id: string): Promise<void> => {
  state.products = state.products.filter((p) => p.id !== id)
}

export const adjustStock = async (
  productId: string,
  size: string,
  delta: number,
): Promise<void> => {
  moveStock(productId, size, delta)
}

// ============================================================================
//  CLIENTS & SUPPLIERS
// ============================================================================

export const fetchClients = async (): Promise<Client[]> =>
  settle(
    state.clients.slice().sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
  )

export const createClient = async (data: Pick<Client, 'name' | 'phone'>): Promise<Client> => {
  const client: Client = { id: uid('cli'), name: data.name, phone: data.phone ?? '', createdAt: nowIso() }
  state.clients.unshift(client)
  return settle(client)
}

export const updateClient = async (id: string, data: Partial<Client>): Promise<void> => {
  const client = state.clients.find((c) => c.id === id)
  if (client) Object.assign(client, { name: data.name ?? client.name, phone: data.phone ?? client.phone })
}

export const deleteClient = async (id: string): Promise<void> => {
  state.clients = state.clients.filter((c) => c.id !== id)
}

export const fetchSuppliers = async (): Promise<Supplier[]> =>
  settle(
    state.suppliers.slice().sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
  )

export const createSupplier = async (
  data: Pick<Supplier, 'name' | 'phone' | 'address'>,
): Promise<Supplier> => {
  const supplier: Supplier = {
    id: uid('sup'),
    name: data.name,
    phone: data.phone ?? '',
    address: data.address ?? '',
    createdAt: nowIso(),
  }
  state.suppliers.unshift(supplier)
  return settle(supplier)
}

export const updateSupplier = async (id: string, data: Partial<Supplier>): Promise<void> => {
  const supplier = state.suppliers.find((s) => s.id === id)
  if (supplier) Object.assign(supplier, data)
}

export const deleteSupplier = async (id: string): Promise<void> => {
  state.suppliers = state.suppliers.filter((s) => s.id !== id)
}

// ============================================================================
//  PURCHASES
// ============================================================================

const purchaseTotal = (lines: PurchaseLine[]) =>
  lines.reduce((s, l) => s + l.quantity * l.purchasePrice, 0)
const paidTotal = (payments: Payment[]) => payments.reduce((s, p) => s + p.amount, 0)

const applyPurchaseStock = (lines: PurchaseLine[], sign: number) =>
  lines.forEach((l) => l.productId && moveStock(l.productId, l.size, sign * l.quantity))

export const fetchPurchases = async (): Promise<Purchase[]> =>
  settle(state.purchases.slice().sort((a, b) => +new Date(b.date) - +new Date(a.date)))

export const createPurchase = async (data: {
  supplierId: string | null
  supplierName: string
  lines: PurchaseLine[]
  payments: { amount: number; date: string; note?: string }[]
  date: string
}): Promise<Purchase> => {
  purchaseSeq += 1
  const lines = data.lines.map((l) => ({ ...l }))
  const purchase: Purchase = {
    id: uid('pur'),
    reference: `ACH-${String(purchaseSeq).padStart(6, '0')}`,
    supplierId: data.supplierId,
    supplierName: data.supplierName,
    lines,
    total: purchaseTotal(lines),
    paid: 0,
    payments: data.payments
      .filter((p) => p.amount > 0)
      .map((p) => ({ id: uid('pp'), amount: p.amount, date: p.date, note: p.note ?? '' })),
    date: data.date,
    createdAt: nowIso(),
  }
  purchase.paid = paidTotal(purchase.payments)
  applyPurchaseStock(lines, +1)
  state.purchases.unshift(purchase)
  return settle(purchase)
}

export const updatePurchase = async (
  id: string,
  data: { supplierId?: string | null; supplierName?: string; date?: string; lines?: PurchaseLine[] },
): Promise<Purchase> => {
  const purchase = state.purchases.find((p) => p.id === id)
  if (!purchase) throw new Error('purchase-not-found')
  if (data.supplierId !== undefined) purchase.supplierId = data.supplierId
  if (data.supplierName !== undefined) purchase.supplierName = data.supplierName
  if (data.date !== undefined) purchase.date = data.date
  if (data.lines) {
    applyPurchaseStock(purchase.lines, -1)
    purchase.lines = data.lines.map((l) => ({ ...l }))
    applyPurchaseStock(purchase.lines, +1)
    purchase.total = purchaseTotal(purchase.lines)
  }
  return settle(purchase)
}

export const deletePurchase = async (id: string): Promise<void> => {
  const purchase = state.purchases.find((p) => p.id === id)
  if (purchase) applyPurchaseStock(purchase.lines, -1)
  state.purchases = state.purchases.filter((p) => p.id !== id)
}

export const addPurchasePayment = async (
  purchaseId: string,
  amount: number,
  date: string,
  note?: string,
): Promise<Purchase> => {
  const purchase = state.purchases.find((p) => p.id === purchaseId)
  if (!purchase) throw new Error('purchase-not-found')
  purchase.payments.push({ id: uid('pp'), amount, date, note: note ?? '' })
  purchase.paid = paidTotal(purchase.payments)
  return settle(purchase)
}

// ============================================================================
//  SALES
// ============================================================================

const saleSubtotal = (lines: SaleLine[]) => lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0)

const applySaleStock = (lines: SaleLine[], sign: number) =>
  lines.forEach((l) => l.productId && moveStock(l.productId, l.size, -sign * l.quantity))

export const fetchSales = async (): Promise<Sale[]> =>
  settle(state.sales.slice().sort((a, b) => +new Date(b.date) - +new Date(a.date)))

export const createSale = async (data: {
  clientId: string | null
  clientName: string
  lines: SaleLine[]
  discount: number
  payments: { amount: number; date: string; note?: string }[]
  date: string
}): Promise<Sale> => {
  saleSeq += 1
  const lines = data.lines.map((l) => ({ ...l }))
  const subtotal = saleSubtotal(lines)
  const sale: Sale = {
    id: uid('sale'),
    reference: `VEN-${String(saleSeq).padStart(6, '0')}`,
    clientId: data.clientId,
    clientName: data.clientName,
    lines,
    subtotal,
    discount: data.discount,
    total: Math.max(0, subtotal - data.discount),
    paid: 0,
    payments: data.payments
      .filter((p) => p.amount > 0)
      .map((p) => ({ id: uid('sp'), amount: p.amount, date: p.date, note: p.note ?? '' })),
    date: data.date,
    createdAt: nowIso(),
  }
  sale.paid = paidTotal(sale.payments)
  applySaleStock(lines, +1)
  state.sales.unshift(sale)
  return settle(sale)
}

export const updateSale = async (
  id: string,
  data: { clientId?: string | null; clientName?: string; discount?: number; date?: string },
): Promise<Sale> => {
  const sale = state.sales.find((s) => s.id === id)
  if (!sale) throw new Error('sale-not-found')
  if (data.clientId !== undefined) sale.clientId = data.clientId
  if (data.clientName !== undefined) sale.clientName = data.clientName
  if (data.discount !== undefined) {
    sale.discount = data.discount
    sale.total = Math.max(0, sale.subtotal - data.discount)
  }
  if (data.date !== undefined) sale.date = data.date
  return settle(sale)
}

export const deleteSale = async (id: string): Promise<void> => {
  const sale = state.sales.find((s) => s.id === id)
  if (sale) applySaleStock(sale.lines, -1)
  state.sales = state.sales.filter((s) => s.id !== id)
}

export const addSalePayment = async (
  saleId: string,
  amount: number,
  date: string,
  note?: string,
): Promise<Sale> => {
  const sale = state.sales.find((s) => s.id === saleId)
  if (!sale) throw new Error('sale-not-found')
  sale.payments.push({ id: uid('sp'), amount, date, note: note ?? '' })
  sale.paid = paidTotal(sale.payments)
  return settle(sale)
}

// ============================================================================
//  WORKERS
// ============================================================================

export const fetchWorkers = async (): Promise<Worker[]> =>
  settle(state.workers.slice().sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)))

export const createWorker = async (data: Partial<Worker>): Promise<Worker> => {
  const worker: Worker = {
    id: uid('wk'),
    fullName: data.fullName ?? '',
    birthDate: data.birthDate ?? '',
    idCard: data.idCard ?? '',
    phone: data.phone ?? '',
    role: data.role ?? '',
    hasSalary: data.hasSalary ?? true,
    salaryType: data.salaryType ?? 'monthly',
    salaryAmount: data.salaryAmount ?? 0,
    hasAccount: data.hasAccount ?? false,
    email: data.email ?? '',
    username: data.username ?? '',
    password: '',
    permissions: data.permissions ?? {},
    startDate: data.startDate ?? '',
    active: data.active ?? true,
    advances: [],
    absences: [],
    payments: [],
    createdAt: nowIso(),
  }
  state.workers.unshift(worker)
  return settle(worker)
}

export const updateWorker = async (id: string, data: Partial<Worker>): Promise<Worker> => {
  const worker = state.workers.find((w) => w.id === id)
  if (!worker) throw new Error('worker-not-found')
  const { advances, absences, payments, password, ...rest } = data
  Object.assign(worker, rest)
  return settle(worker)
}

export const deleteWorker = async (id: string): Promise<void> => {
  state.workers = state.workers.filter((w) => w.id !== id)
}

export const addWorkerAdvance = async (
  workerId: string,
  advance: { description: string; amount: number; date: string },
): Promise<Worker> => {
  const worker = state.workers.find((w) => w.id === workerId)
  if (!worker) throw new Error('worker-not-found')
  worker.advances.unshift({ id: uid('adv'), deducted: false, ...advance })
  return settle(worker)
}

export const addWorkerAbsence = async (
  workerId: string,
  absence: { description: string; cost: number; date: string },
): Promise<Worker> => {
  const worker = state.workers.find((w) => w.id === workerId)
  if (!worker) throw new Error('worker-not-found')
  worker.absences.unshift({ id: uid('abs'), ...absence })
  return settle(worker)
}

export const addWorkerPayment = async (
  workerId: string,
  payment: {
    period: string
    baseSalary: number
    absencesDeducted: number
    advancesDeducted: number
    amount: number
    date: string
    note?: string
  },
): Promise<Worker> => {
  const worker = state.workers.find((w) => w.id === workerId)
  if (!worker) throw new Error('worker-not-found')
  worker.payments.unshift({ id: uid('wp'), note: '', ...payment })
  worker.advances.forEach((a) => {
    if (!a.deducted) a.deducted = true
  })
  return settle(worker)
}

// ============================================================================
//  EXPENSES & CAISSE
// ============================================================================

export const fetchExpenses = async (): Promise<Expense[]> =>
  settle(state.expenses.slice().sort((a, b) => +new Date(b.date) - +new Date(a.date)))

export const createExpense = async (
  data: Pick<Expense, 'name' | 'description' | 'amount' | 'date'>,
): Promise<Expense> => {
  const expense: Expense = {
    id: uid('exp'),
    name: data.name,
    description: data.description ?? '',
    amount: data.amount,
    date: data.date,
    createdAt: nowIso(),
  }
  state.expenses.unshift(expense)
  return settle(expense)
}

export const updateExpense = async (id: string, data: Partial<Expense>): Promise<void> => {
  const expense = state.expenses.find((e) => e.id === id)
  if (expense) Object.assign(expense, data)
}

export const deleteExpense = async (id: string): Promise<void> => {
  state.expenses = state.expenses.filter((e) => e.id !== id)
}

export const fetchCaisse = async (): Promise<CaisseTransaction[]> =>
  settle(state.caisse.slice().sort((a, b) => +new Date(b.date) - +new Date(a.date)))

export const createCaisseTransaction = async (
  data: Pick<CaisseTransaction, 'type' | 'amount' | 'description' | 'date'>,
): Promise<CaisseTransaction> => {
  const tx: CaisseTransaction = {
    id: uid('cx'),
    type: data.type,
    amount: data.amount,
    description: data.description ?? '',
    date: data.date,
    createdAt: nowIso(),
  }
  state.caisse.unshift(tx)
  return settle(tx)
}

export const updateCaisseTransaction = async (
  id: string,
  data: Partial<CaisseTransaction>,
): Promise<void> => {
  const tx = state.caisse.find((t) => t.id === id)
  if (tx) Object.assign(tx, data)
}

export const deleteCaisseTransaction = async (id: string): Promise<void> => {
  state.caisse = state.caisse.filter((t) => t.id !== id)
}

// ============================================================================
//  WEBSITE — catalogue exposure, offers, carriers
// ============================================================================

export const fetchWebProducts = async (): Promise<Record<string, WebProductMeta>> =>
  settle(state.webProducts)

export const saveWebProduct = async (
  productId: string,
  patch: Partial<Omit<WebProductMeta, 'productId'>>,
): Promise<WebProductMeta> => {
  const current = state.webProducts[productId] ?? {
    productId,
    hidden: false,
    featured: false,
    updatedAt: nowIso(),
  }
  const next: WebProductMeta = { ...current, ...patch, productId, updatedAt: nowIso() }
  if (patch.webPrice !== undefined) next.webPrice = patch.webPrice || undefined
  state.webProducts[productId] = next
  return settle(next)
}

const offerTotals = (lines: OfferLine[]) => {
  const originalTotal = lines.reduce((s, l) => s + l.originalPrice * l.quantity, 0)
  const offerTotal = lines.reduce((s, l) => s + l.offerPrice * l.quantity, 0)
  const discountAmount = originalTotal - offerTotal
  const discountPercent = originalTotal ? Math.round((discountAmount / originalTotal) * 100) : 0
  return { originalTotal, offerTotal, discountAmount, discountPercent }
}

export const fetchOffers = async (): Promise<SpecialOffer[]> =>
  settle(state.offers.slice().sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)))

export const createOffer = async (data: Partial<SpecialOffer>): Promise<SpecialOffer> => {
  const lines = (data.lines ?? []).map((l) => ({ ...l }))
  const offer: SpecialOffer = {
    id: uid('off'),
    title: data.title ?? '',
    description: data.description ?? '',
    image: data.image ?? '',
    lines,
    ...offerTotals(lines),
    active: data.active ?? true,
    startDate: data.startDate ?? '',
    endDate: data.endDate ?? '',
    createdAt: nowIso(),
  }
  state.offers.unshift(offer)
  return settle(offer)
}

export const updateOffer = async (id: string, data: Partial<SpecialOffer>): Promise<SpecialOffer> => {
  const offer = state.offers.find((o) => o.id === id)
  if (!offer) throw new Error('offer-not-found')
  const { lines, ...rest } = data
  Object.assign(offer, rest)
  if (lines !== undefined) {
    offer.lines = lines.map((l) => ({ ...l }))
    Object.assign(offer, offerTotals(offer.lines))
  }
  return settle(offer)
}

export const deleteOffer = async (id: string): Promise<void> => {
  state.offers = state.offers.filter((o) => o.id !== id)
}

// ── Delivery ────────────────────────────────────────────────────────────────

export const loadCommuneIndex = async () => ({
  byId: new Map<string, { wilayaCode: string; name: string }>(),
  byKey: new Map<string, string>(),
})

export const fetchDeliveryCompanies = async (): Promise<DeliveryCompany[]> =>
  settle(state.deliveryCompanies.slice().sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)))

export const createDeliveryCompany = async (data: {
  name: string
  phone: string
  logo: string
  notes: string
}): Promise<DeliveryCompany> => {
  const company: DeliveryCompany = {
    id: uid('dc'),
    name: data.name,
    phone: data.phone ?? '',
    logo: data.logo ?? '',
    notes: data.notes ?? '',
    active: true,
    prices: {},
    createdAt: nowIso(),
  }
  state.deliveryCompanies.unshift(company)
  return settle(company)
}

export const updateDeliveryCompany = async (
  id: string,
  data: Partial<DeliveryCompany>,
): Promise<void> => {
  const company = state.deliveryCompanies.find((c) => c.id === id)
  if (!company) return
  const { prices, ...rest } = data
  Object.assign(company, rest)
}

export const deleteDeliveryCompany = async (id: string): Promise<void> => {
  state.deliveryCompanies = state.deliveryCompanies.filter((c) => c.id !== id)
}

export const saveDeliveryPrices = async (
  companyId: string,
  prices: CommunePrice[],
): Promise<void> => {
  const company = state.deliveryCompanies.find((c) => c.id === companyId)
  if (!company) return
  prices.forEach((p) => {
    const key = p.key || `${p.wilayaCode}::${p.commune}`
    company.prices[key] = { ...p, key }
  })
}

export const clearDeliveryPrices = async (
  companyId: string,
  wilayaCode: string,
): Promise<void> => {
  const company = state.deliveryCompanies.find((c) => c.id === companyId)
  if (!company) return
  Object.keys(company.prices).forEach((key) => {
    if (company.prices[key].wilayaCode === wilayaCode) delete company.prices[key]
  })
}

// ============================================================================
//  WEB ORDERS
// ============================================================================

const sortByDate = (list: WebOrder[]) =>
  list.slice().sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))

export const fetchOrders = async (): Promise<WebOrder[]> => settle(sortByDate(state.orders))

export const fetchOrder = async (id: string): Promise<WebOrder | null> => {
  const order = state.orders.find((o) => o.id === id)
  return order ? settle(order) : null
}

export const fetchOrderReceipt = async (id: string): Promise<WebOrder | null> => fetchOrder(id)

export const placeOrder = async (input: {
  customerName: string
  phone: string
  wilayaCode: string
  commune: string
  address: string
  mode: 'home' | 'desk'
  companyId: string | null
  lines: { productId: string; size: string; quantity: number; offerId?: string }[]
  note?: string
}): Promise<WebOrder> => {
  orderSeq += 1
  const company = state.deliveryCompanies.find((c) => c.id === input.companyId)
  const price = company?.prices[`${input.wilayaCode}::${input.commune}`]
  const deliveryPrice = price ? (input.mode === 'home' ? price.home : price.desk) : 0

  const lines = input.lines.map((l) => {
    const product = state.products.find((p) => p.id === l.productId)
    const meta = state.webProducts[l.productId]
    const unitPrice = meta?.webPrice ?? product?.salePrice ?? 0
    return {
      productId: l.productId,
      productName: product?.name ?? '',
      size: l.size ?? '',
      quantity: l.quantity,
      unitPrice,
      offerId: l.offerId,
      image: product?.images?.[0],
    }
  })
  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0)

  const order: WebOrder = {
    id: uid('wo'),
    reference: `WEB-${String(orderSeq).padStart(6, '0')}`,
    customerName: input.customerName,
    phone: input.phone,
    wilayaCode: input.wilayaCode,
    wilaya: '',
    commune: input.commune,
    address: input.address,
    deliveryMode: input.mode,
    deliveryCompanyId: input.companyId,
    deliveryCompanyName: company?.name ?? '',
    deliveryPrice,
    lines,
    subtotal,
    total: subtotal + deliveryPrice,
    status: 'pending',
    note: input.note ?? '',
    history: [{ status: 'pending', at: nowIso() }],
    createdAt: nowIso(),
  }
  state.orders.unshift(order)
  return settle(order)
}

const setStatus = (order: WebOrder, status: WebOrderStatus, note?: string) => {
  order.status = status
  order.history.push({ status, at: nowIso(), note: note || undefined })
}

export const acceptOrder = async (id: string): Promise<WebOrder> => {
  const order = state.orders.find((o) => o.id === id)
  if (!order) throw new Error('order-not-found')
  setStatus(order, 'accepted')
  return settle(order)
}

export const deliverOrder = async (
  id: string,
  companyId: string,
  price?: number,
): Promise<WebOrder> => {
  const order = state.orders.find((o) => o.id === id)
  if (!order) throw new Error('order-not-found')
  const company = state.deliveryCompanies.find((c) => c.id === companyId)
  if (company) {
    order.deliveryCompanyId = company.id
    order.deliveryCompanyName = company.name
  }
  if (price !== undefined) {
    order.deliveryPrice = price
    order.total = order.subtotal + price
  }
  if (!order.stockAppliedAt) {
    order.lines.forEach((l) => l.productId && moveStock(l.productId, l.size, -l.quantity))
    order.stockAppliedAt = nowIso()
  }
  setStatus(order, 'delivered')
  return settle(order)
}

export const returnOrder = async (id: string, reason = ''): Promise<WebOrder> => {
  const order = state.orders.find((o) => o.id === id)
  if (!order) throw new Error('order-not-found')
  if (order.stockAppliedAt) {
    order.lines.forEach((l) => l.productId && moveStock(l.productId, l.size, +l.quantity))
    order.stockAppliedAt = undefined
  }
  setStatus(order, 'returned', reason)
  return settle(order)
}

export const cashOrder = async (id: string): Promise<WebOrder> => {
  const order = state.orders.find((o) => o.id === id)
  if (!order) throw new Error('order-not-found')
  if (!order.cashedAt) {
    order.cashedAt = nowIso()
    state.caisse.unshift({
      id: uid('cx'),
      type: 'deposit',
      amount: order.total,
      description: `Commande ${order.reference}`,
      date: nowIso().slice(0, 10),
      createdAt: nowIso(),
    })
  }
  setStatus(order, 'completed')
  return settle(order)
}

export const cancelOrder = async (id: string, reason = ''): Promise<WebOrder> => {
  const order = state.orders.find((o) => o.id === id)
  if (!order) throw new Error('order-not-found')
  if (order.stockAppliedAt) {
    order.lines.forEach((l) => l.productId && moveStock(l.productId, l.size, +l.quantity))
    order.stockAppliedAt = undefined
  }
  setStatus(order, 'canceled', reason)
  return settle(order)
}

export const updateOrder = async (id: string, data: Partial<WebOrder>): Promise<WebOrder> => {
  const order = state.orders.find((o) => o.id === id)
  if (!order) throw new Error('order-not-found')
  const { lines, history, ...rest } = data
  Object.assign(order, rest)
  if (lines) {
    order.lines = lines.map((l) => ({ ...l }))
    order.subtotal = order.lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0)
    order.total = order.subtotal + order.deliveryPrice
  } else {
    order.total = order.subtotal + order.deliveryPrice
  }
  return settle(order)
}

export const deleteOrder = async (id: string): Promise<void> => {
  state.orders = state.orders.filter((o) => o.id !== id)
}

// ============================================================================
//  STOREFRONT  (anonymous reads)
// ============================================================================

export interface ShopProductRow extends Product {
  price: number
  featured: boolean
}

/** Published articles, priced and sorted as the shopper sees them. */
export const fetchShopProducts = async (): Promise<ShopProductRow[]> => {
  const list = state.products
    .filter((p) => !state.webProducts[p.id]?.hidden)
    .map((p) => {
      const meta = state.webProducts[p.id]
      const price = meta?.webPrice ?? p.salePrice
      return { ...p, sizes: sortedSizes(p.sizes), price, salePrice: price, featured: meta?.featured ?? false }
    })
    .sort((a, b) => {
      if (a.featured !== b.featured) return a.featured ? -1 : 1
      return +new Date(b.createdAt) - +new Date(a.createdAt)
    })
  return settle(list)
}

/** Offers that are active and within their campaign window. */
export const fetchLiveOffers = async (): Promise<SpecialOffer[]> => {
  const today = nowIso().slice(0, 10)
  const list = state.offers.filter((o) => {
    if (!o.active) return false
    if (o.startDate && o.startDate > today) return false
    if (o.endDate && o.endDate < today) return false
    return true
  })
  return settle(list)
}
