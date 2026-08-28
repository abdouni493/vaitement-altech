import { useMemo } from 'react'
import { useProductStore } from '@/store/useProductStore'
import { useWebsiteStore, isOfferLive } from '@/store/useWebsiteStore'
import { useSettingsStore } from '@/store/useSettingsStore'
import type { Product, SpecialOffer, WebProductMeta } from '@/types'

/** A catalogue article as the storefront sees it. */
export interface ShopProduct extends Product {
  /** `webPrice` when the owner set one, otherwise the boutique's sale price. */
  price: number
  featured: boolean
  cover?: string
}

const decorate = (p: Product, meta?: WebProductMeta): ShopProduct => ({
  ...p,
  price: meta?.webPrice && meta.webPrice > 0 ? meta.webPrice : p.salePrice,
  featured: !!meta?.featured,
  cover: p.images?.[0],
})

/**
 * Everything the public may see. An article is published unless it was hidden
 * explicitly, and it must carry a price — an article still waiting for its
 * first purchase has none and would show "0" on the grid.
 */
export const usePublishedProducts = (): ShopProduct[] => {
  const products = useProductStore((s) => s.products)
  const webProducts = useWebsiteStore((s) => s.webProducts)

  return useMemo(
    () =>
      products
        .filter((p) => !webProducts[p.id]?.hidden)
        .map((p) => decorate(p, webProducts[p.id]))
        .filter((p) => p.price > 0)
        .sort((a, b) => {
          if (a.featured !== b.featured) return a.featured ? -1 : 1
          return +new Date(b.createdAt) - +new Date(a.createdAt)
        }),
    [products, webProducts],
  )
}

export const usePublishedProduct = (id: string | null | undefined): ShopProduct | null => {
  const products = usePublishedProducts()
  return useMemo(() => products.find((p) => p.id === id) ?? null, [products, id])
}

/** Campaigns that are switched on and inside their date window. */
export const useLiveOffers = (): SpecialOffer[] => {
  const offers = useWebsiteStore((s) => s.offers)
  return useMemo(
    () =>
      offers
        .filter((o) => isOfferLive(o))
        .sort((a, b) => +new Date(a.endDate || 0) - +new Date(b.endDate || 0)),
    [offers],
  )
}

export const useLiveOffer = (id: string | null | undefined): SpecialOffer | null => {
  const offers = useLiveOffers()
  const all = useWebsiteStore((s) => s.offers)
  return useMemo(() => {
    if (!id) return null
    // A copied link may point at a campaign that has since closed; the order
    // page still needs the record so it can say so rather than 404.
    return offers.find((o) => o.id === id) ?? all.find((o) => o.id === id) ?? null
  }, [offers, all, id])
}

/** Store identity for the storefront chrome. */
export const useShopIdentity = () => {
  const settings = useSettingsStore((s) => s.settings)
  const site = useWebsiteStore((s) => s.site)
  return {
    name: settings.name || 'Boutique',
    logo: settings.logo,
    currency: settings.currency || 'DA',
    description: site.description || settings.description,
    tagline: site.tagline,
    heroImage: site.heroImage,
    favicon: site.favicon,
    freeShippingFrom: site.freeShippingFrom,
  }
}

/** Sizes a customer may actually pick: only those still in stock. */
export const availableSizes = (p: Product): string[] =>
  p.sizes.filter((s) => s.quantity > 0).map((s) => s.size)

export const isSellable = (p: Product): boolean => p.quantity > 0
