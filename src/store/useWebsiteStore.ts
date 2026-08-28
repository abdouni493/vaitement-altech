import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  CommunePrice,
  ContactLinks,
  DeliveryCompany,
  OfferLine,
  SpecialOffer,
  WebProductMeta,
  WebsiteSettings,
} from '@/types'
import { uid, round2 } from '@/utils/helpers'
import { idbStorage, onRehydrate, storeKey } from './persist'

// ----------------------------------------------------------------------------
// Defaults
// ----------------------------------------------------------------------------

const EMPTY_CONTACTS: ContactLinks = {
  facebook: '',
  instagram: '',
  tiktok: '',
  snapchat: '',
  whatsapp: '',
  phone: '',
  phone2: '',
  email: '',
  mapsUrl: '',
}

const DEFAULT_SITE: WebsiteSettings = {
  favicon: '',
  heroImage: '',
  description: '',
  tagline: '',
  freeShippingFrom: 0,
}

/** Recompute the money on an offer from its lines — the single source of truth. */
export const priceOffer = (
  lines: OfferLine[],
): Pick<SpecialOffer, 'originalTotal' | 'offerTotal' | 'discountAmount' | 'discountPercent'> => {
  const originalTotal = round2(lines.reduce((s, l) => s + l.originalPrice * l.quantity, 0))
  const offerTotal = round2(lines.reduce((s, l) => s + l.offerPrice * l.quantity, 0))
  const discountAmount = round2(Math.max(0, originalTotal - offerTotal))
  const discountPercent = originalTotal > 0 ? round2((discountAmount / originalTotal) * 100) : 0
  return { originalTotal, offerTotal, discountAmount, discountPercent }
}

/** The key a tariff is filed under. */
export const priceKey = (wilayaCode: string, commune: string): string => `${wilayaCode}::${commune}`

// ----------------------------------------------------------------------------
// Store
// ----------------------------------------------------------------------------

interface WebsiteState {
  /** Storefront overrides per article, keyed by product id. */
  webProducts: Record<string, WebProductMeta>
  offers: SpecialOffer[]
  companies: DeliveryCompany[]
  contacts: ContactLinks
  site: WebsiteSettings

  // ── Catalogue ────────────────────────────────────────────────────────────
  /** `true` unless the owner has explicitly hidden the article. */
  isPublished: (productId: string) => boolean
  toggleProduct: (productId: string) => void
  setProductMeta: (productId: string, patch: Partial<Omit<WebProductMeta, 'productId'>>) => void

  // ── Offers ───────────────────────────────────────────────────────────────
  addOffer: (
    data: Omit<
      SpecialOffer,
      'id' | 'createdAt' | 'originalTotal' | 'offerTotal' | 'discountAmount' | 'discountPercent'
    >,
  ) => SpecialOffer
  updateOffer: (id: string, data: Partial<SpecialOffer>) => void
  deleteOffer: (id: string) => void
  toggleOffer: (id: string) => void

  // ── Delivery ─────────────────────────────────────────────────────────────
  addCompany: (data: Pick<DeliveryCompany, 'name' | 'phone' | 'logo' | 'notes'>) => DeliveryCompany
  updateCompany: (id: string, data: Partial<DeliveryCompany>) => void
  deleteCompany: (id: string) => void
  toggleCompany: (id: string) => void
  /** Write one commune's tariff. */
  setCommunePrice: (companyId: string, price: CommunePrice) => void
  /** Write the same tariff across a whole wilaya in one gesture. */
  setWilayaPrices: (
    companyId: string,
    wilayaCode: string,
    communes: string[],
    home: number,
    desk: number,
    enabled: boolean,
  ) => void
  clearWilayaPrices: (companyId: string, wilayaCode: string) => void

  // ── Identity ─────────────────────────────────────────────────────────────
  updateContacts: (data: Partial<ContactLinks>) => void
  updateSite: (data: Partial<WebsiteSettings>) => void
}

export const useWebsiteStore = create<WebsiteState>()(
  persist(
    (set, get) => ({
      webProducts: {},
      offers: [],
      companies: [],
      contacts: EMPTY_CONTACTS,
      site: DEFAULT_SITE,

      // ── Catalogue ──────────────────────────────────────────────────────────
      isPublished: (productId) => !get().webProducts[productId]?.hidden,

      toggleProduct: (productId) =>
        set((s) => {
          const cur = s.webProducts[productId]
          return {
            webProducts: {
              ...s.webProducts,
              [productId]: {
                productId,
                webPrice: cur?.webPrice,
                featured: cur?.featured,
                hidden: !cur?.hidden,
                updatedAt: new Date().toISOString(),
              },
            },
          }
        }),

      setProductMeta: (productId, patch) =>
        set((s) => {
          const cur = s.webProducts[productId]
          return {
            webProducts: {
              ...s.webProducts,
              [productId]: {
                productId,
                hidden: cur?.hidden ?? false,
                webPrice: cur?.webPrice,
                featured: cur?.featured,
                ...patch,
                updatedAt: new Date().toISOString(),
              },
            },
          }
        }),

      // ── Offers ─────────────────────────────────────────────────────────────
      addOffer: (data) => {
        const offer: SpecialOffer = {
          ...data,
          ...priceOffer(data.lines),
          id: uid('offer'),
          createdAt: new Date().toISOString(),
        }
        set((s) => ({ offers: [offer, ...s.offers] }))
        return offer
      },

      updateOffer: (id, data) =>
        set((s) => ({
          offers: s.offers.map((o) => {
            if (o.id !== id) return o
            const merged = { ...o, ...data }
            // Money is derived, never trusted from the caller.
            return { ...merged, ...priceOffer(merged.lines) }
          }),
        })),

      deleteOffer: (id) => set((s) => ({ offers: s.offers.filter((o) => o.id !== id) })),

      toggleOffer: (id) =>
        set((s) => ({
          offers: s.offers.map((o) => (o.id === id ? { ...o, active: !o.active } : o)),
        })),

      // ── Delivery ───────────────────────────────────────────────────────────
      addCompany: (data) => {
        const company: DeliveryCompany = {
          ...data,
          id: uid('dlv'),
          active: true,
          prices: {},
          createdAt: new Date().toISOString(),
        }
        set((s) => ({ companies: [company, ...s.companies] }))
        return company
      },

      updateCompany: (id, data) =>
        set((s) => ({ companies: s.companies.map((c) => (c.id === id ? { ...c, ...data } : c)) })),

      deleteCompany: (id) => set((s) => ({ companies: s.companies.filter((c) => c.id !== id) })),

      toggleCompany: (id) =>
        set((s) => ({
          companies: s.companies.map((c) => (c.id === id ? { ...c, active: !c.active } : c)),
        })),

      setCommunePrice: (companyId, price) =>
        set((s) => ({
          companies: s.companies.map((c) =>
            c.id === companyId ? { ...c, prices: { ...c.prices, [price.key]: price } } : c,
          ),
        })),

      setWilayaPrices: (companyId, wilayaCode, communes, home, desk, enabled) =>
        set((s) => ({
          companies: s.companies.map((c) => {
            if (c.id !== companyId) return c
            const prices = { ...c.prices }
            communes.forEach((commune) => {
              const key = priceKey(wilayaCode, commune)
              prices[key] = { key, wilayaCode, commune, home, desk, enabled }
            })
            return { ...c, prices }
          }),
        })),

      clearWilayaPrices: (companyId, wilayaCode) =>
        set((s) => ({
          companies: s.companies.map((c) => {
            if (c.id !== companyId) return c
            const prices = Object.fromEntries(
              Object.entries(c.prices).filter(([, p]) => p.wilayaCode !== wilayaCode),
            )
            return { ...c, prices }
          }),
        })),

      // ── Identity ───────────────────────────────────────────────────────────
      updateContacts: (data) => set((s) => ({ contacts: { ...s.contacts, ...data } })),
      updateSite: (data) => set((s) => ({ site: { ...s.site, ...data } })),
    }),
    {
      name: storeKey('website'),
      storage: idbStorage(),
      partialize: (s) => ({
        webProducts: s.webProducts,
        offers: s.offers,
        companies: s.companies,
        contacts: s.contacts,
        site: s.site,
      }),
      onRehydrateStorage: onRehydrate('website'),
    },
  ),
)

// ----------------------------------------------------------------------------
// Derived helpers — shared by the dashboard and the storefront
// ----------------------------------------------------------------------------

/** An offer the public should see right now: switched on and inside its window. */
export const isOfferLive = (offer: SpecialOffer, now: Date = new Date()): boolean => {
  if (!offer.active) return false
  const start = offer.startDate ? new Date(offer.startDate) : null
  const end = offer.endDate ? new Date(offer.endDate) : null
  if (start && now < start) return false
  if (end && now > end) return false
  return true
}

/** Milliseconds until the campaign closes; 0 once it has. */
export const msRemaining = (offer: SpecialOffer, now: Date = new Date()): number => {
  if (!offer.endDate) return 0
  return Math.max(0, new Date(offer.endDate).getTime() - now.getTime())
}

/** Split a duration into the four units the storefront counter animates. */
export const splitDuration = (ms: number) => ({
  days: Math.floor(ms / 86_400_000),
  hours: Math.floor((ms % 86_400_000) / 3_600_000),
  minutes: Math.floor((ms % 3_600_000) / 60_000),
  seconds: Math.floor((ms % 60_000) / 1000),
})

/** How many communes a carrier has actually priced. */
export const pricedCommunes = (company: DeliveryCompany): number =>
  Object.values(company.prices).filter((p) => p.enabled).length

/** The tariff to charge, or `null` when the carrier does not serve the commune. */
export const resolveTariff = (
  company: DeliveryCompany | undefined,
  wilayaCode: string,
  commune: string,
): CommunePrice | null => {
  if (!company) return null
  const price = company.prices[priceKey(wilayaCode, commune)]
  return price && price.enabled ? price : null
}
