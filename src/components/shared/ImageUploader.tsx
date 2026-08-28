import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ImagePlus, X, Star } from 'lucide-react'
import toast from 'react-hot-toast'
import { compressImage, compressImages } from '@/utils/media'
import { useTranslation } from '@/i18n/useTranslation'
import { clsx } from '@/utils/clsx'

// ----------------------------------------------------------------------------
// Single image — favicon, hero, offer cover, carrier logo
// ----------------------------------------------------------------------------

interface SingleProps {
  value: string
  onChange: (dataUrl: string) => void
  label?: string
  hint?: string
  /** Aspect ratio of the preview frame. */
  ratio?: 'square' | 'wide' | 'portrait'
  /** Longest edge kept when the picked file is downscaled. */
  maxEdge?: number
  accept?: string
}

const ratios = {
  square: 'aspect-square',
  wide: 'aspect-[16/7]',
  portrait: 'aspect-[3/4]',
}

export const ImageField = ({
  value,
  onChange,
  label,
  hint,
  ratio = 'wide',
  maxEdge,
  accept = 'image/*',
}: SingleProps) => {
  const { t } = useTranslation()
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  const pick = async (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    setBusy(true)
    try {
      onChange(await compressImage(file, maxEdge))
    } catch {
      toast.error(t('required'))
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  return (
    <div className="w-full">
      {label && <label className="label-wood">{label}</label>}
      <div
        className={clsx(
          'group relative w-full overflow-hidden border border-dashed border-wood-light bg-wood-cream transition hover:border-wood-warm',
          ratios[ratio],
        )}
      >
        {value ? (
          <>
            <img src={value} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onChange('')}
              aria-label={t('removeImage')}
              className="absolute end-2 top-2 bg-black/70 p-1.5 text-white opacity-0 transition group-hover:opacity-100"
            >
              <X size={14} />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="flex h-full w-full flex-col items-center justify-center gap-2 text-wood-medium transition hover:text-wood-dark"
          >
            <ImagePlus size={22} />
            <span className="text-[10px] font-bold uppercase tracking-widest">
              {busy ? t('loading') : t('uploadImage')}
            </span>
          </button>
        )}
      </div>
      {value && (
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="mt-2 text-[10px] font-bold uppercase tracking-widest text-wood-medium underline underline-offset-4 transition hover:text-wood-dark"
        >
          {t('uploadImage')}
        </button>
      )}
      {hint && <p className="mt-1.5 text-[11px] text-wood-medium/70">{hint}</p>}
      <input
        ref={input}
        type="file"
        accept={accept}
        hidden
        onChange={(e) => pick(e.target.files)}
      />
    </div>
  )
}

// ----------------------------------------------------------------------------
// Gallery — the article's storefront photos
// ----------------------------------------------------------------------------

interface GalleryProps {
  value: string[]
  onChange: (images: string[]) => void
  label?: string
  hint?: string
  max?: number
}

export const ImageGallery = ({ value, onChange, label, hint, max = 6 }: GalleryProps) => {
  const { t } = useTranslation()
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  const pick = async (files: FileList | null) => {
    if (!files?.length) return
    setBusy(true)
    try {
      const added = await compressImages(files)
      onChange([...value, ...added].slice(0, max))
    } catch {
      toast.error(t('required'))
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  /** Promote a photo to cover by moving it to the front of the list. */
  const makeCover = (index: number) =>
    onChange([value[index], ...value.filter((_, i) => i !== index)])

  return (
    <div>
      {label && <label className="label-wood">{label}</label>}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
        <AnimatePresence initial={false}>
          {value.map((src, i) => (
            <motion.div
              key={`${src.slice(-24)}-${i}`}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className="group relative aspect-[3/4] overflow-hidden border border-wood-light bg-wood-cream"
            >
              <img src={src} alt="" className="h-full w-full object-cover" />
              {i === 0 && (
                <span className="absolute start-1 top-1 bg-wood-btn px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-accentfg">
                  {t('coverImage')}
                </span>
              )}
              <div className="absolute inset-0 flex items-center justify-center gap-1.5 bg-black/55 opacity-0 transition group-hover:opacity-100">
                {i !== 0 && (
                  <button
                    type="button"
                    onClick={() => makeCover(i)}
                    title={t('coverImage')}
                    className="bg-white/90 p-1.5 text-black transition hover:bg-white"
                  >
                    <Star size={13} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onChange(value.filter((_, k) => k !== i))}
                  title={t('removeImage')}
                  className="bg-white/90 p-1.5 text-terracotta transition hover:bg-white"
                >
                  <X size={13} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {value.length < max && (
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="flex aspect-[3/4] flex-col items-center justify-center gap-1.5 border border-dashed border-wood-light bg-wood-cream text-wood-medium transition hover:border-wood-warm hover:text-wood-dark"
          >
            <ImagePlus size={18} />
            <span className="text-[9px] font-bold uppercase tracking-widest">
              {busy ? t('loading') : t('addImage')}
            </span>
          </button>
        )}
      </div>
      {hint && <p className="mt-2 text-[11px] text-wood-medium/70">{hint}</p>}
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => pick(e.target.files)}
      />
    </div>
  )
}
