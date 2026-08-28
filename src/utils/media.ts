// ============================================================================
// Browser-side media & clipboard helpers
// ----------------------------------------------------------------------------
// Images live inside the local database as data URLs, so a picked file is
// downscaled before it is stored: a 4 MB phone photo would otherwise bloat
// every backup and slow the storefront grid down.
// ============================================================================

/** Longest edge, in pixels, that a stored image is allowed to keep. */
const MAX_EDGE = 1280
const JPEG_QUALITY = 0.82

/** Read a picked file as a data URL, unchanged. Used for SVG/ICO favicons. */
export const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })

/**
 * Downscale a picked image to `maxEdge` and re-encode it as JPEG. Formats a
 * canvas cannot rasterise (SVG in some browsers, ICO) fall back to the raw
 * data URL so the user still gets their file.
 */
export const compressImage = async (file: File, maxEdge = MAX_EDGE): Promise<string> => {
  const raw = await fileToDataUrl(file)
  if (file.type === 'image/svg+xml' || file.type === 'image/x-icon') return raw

  try {
    const img = await loadImage(raw)
    const scale = Math.min(1, maxEdge / Math.max(img.width, img.height))
    if (scale === 1 && file.size < 400_000) return raw

    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.width * scale)
    canvas.height = Math.round(img.height * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) return raw
    // Photographs have no transparency to preserve; a white mat keeps PNGs
    // with alpha from turning black once they are encoded as JPEG.
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', JPEG_QUALITY)
  } catch {
    return raw
  }
}

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })

/** Compress a whole picked list, in order. */
export const compressImages = async (files: FileList | File[]): Promise<string[]> => {
  const out: string[] = []
  for (const file of Array.from(files)) {
    if (!file.type.startsWith('image/')) continue
    out.push(await compressImage(file))
  }
  return out
}

// ----------------------------------------------------------------------------
// Clipboard
// ----------------------------------------------------------------------------

/**
 * Copy text, falling back to a hidden textarea when the async Clipboard API is
 * unavailable — it needs a secure context, which a LAN preview often is not.
 */
export const copyText = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* fall through to the legacy path */
  }
  try {
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(area)
    return ok
  } catch {
    return false
  }
}

/** Absolute URL for a storefront route, ready to paste into a message. */
export const shopUrl = (path: string): string => {
  const base = typeof window === 'undefined' ? '' : window.location.origin
  return `${base}${path}`
}

/** Deep link that opens the order page with one article preselected. */
export const productOrderLink = (productId: string): string =>
  shopUrl(`/shop/order?product=${encodeURIComponent(productId)}`)

/** Deep link that opens the order page with a whole offer preselected. */
export const offerOrderLink = (offerId: string): string =>
  shopUrl(`/shop/order?offer=${encodeURIComponent(offerId)}`)
