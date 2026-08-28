import { useState, useEffect, useRef } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useReactToPrint } from 'react-to-print'
import toast from 'react-hot-toast'
import {
  IconAdd,
  IconSave,
  IconGenerate,
  IconPrint,
  IconColor,
  IconMaterial,
  IconGender,
  IconSeason,
  IconCollection,
  IconBarcode,
  IconGarment,
} from '@/components/ui/icons'
import { Info } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input, Textarea, Select } from '@/components/ui/Input'
import { Barcode } from '@/components/shared/BarcodeGenerator'
import { SizePicker } from '@/components/shared/SizePicker'
import { ImageGallery } from '@/components/shared/ImageUploader'
import { useProductStore } from '@/store/useProductStore'
import { useTranslation } from '@/i18n/useTranslation'
import { generateEAN13 } from '@/utils/helpers'
import { SIZE_CATEGORIES, GENDERS, SEASONS } from '@/types'
import type { Product, SizeCategory, SizeStock, Gender, Season } from '@/types'
import type { TranslationKey } from '@/i18n/translations'

// Identity + cut of the garment. Prices and the alert threshold are set on the
// first purchase; the stock itself is entered per size right here.
const schema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  barcode: z.string().optional(),
  brand: z.string().min(1),
  category: z.string().min(1),
  sizeCategory: z.enum(['alpha', 'numeric', 'shoes', 'kids', 'oneSize', 'custom']),
  color: z.string().min(1),
  material: z.string().min(1),
  gender: z.enum(['women', 'men', 'kids', 'unisex']),
  season: z.enum(['springSummer', 'fallWinter', 'allSeason']),
  collection: z.string().optional(),
})
type FormData = z.infer<typeof schema>

interface ProductModalProps {
  open: boolean
  onClose: () => void
  product?: Product | null
  onSaved?: (product: Product) => void
  presetName?: string
}

/** A select paired with an inline "create new value" affordance. */
const CreatableSelect = ({
  label,
  icon,
  options,
  value,
  onChange,
  onCreate,
  placeholder,
  error,
}: {
  label: string
  icon?: React.ReactNode
  options: string[]
  value: string
  onChange: (v: string) => void
  onCreate: (v: string) => void
  placeholder: string
  error?: string
}) => {
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')

  const commit = () => {
    const v = draft.trim()
    if (!v) return
    onCreate(v)
    onChange(v)
    setDraft('')
    setAdding(false)
  }

  return (
    <div>
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <label className="label-wood flex items-center gap-1.5">
            {icon}
            {label}
          </label>
          <select value={value} onChange={(e) => onChange(e.target.value)} className="input-wood">
            {options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
          {error && <p className="mt-1 text-xs text-terracotta">{error}</p>}
        </div>
        <Button type="button" variant="outline" size="icon" onClick={() => setAdding((v) => !v)}>
          <IconAdd size={18} />
        </Button>
      </div>
      {adding && (
        <div className="mt-2 flex gap-2">
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                commit()
              }
            }}
            placeholder={placeholder}
            className="input-wood"
          />
          <Button type="button" size="sm" onClick={commit}>
            <IconSave size={15} />
          </Button>
        </div>
      )}
    </div>
  )
}

export const ProductModal = ({ open, onClose, product, onSaved, presetName }: ProductModalProps) => {
  const { t } = useTranslation()
  const {
    brands,
    categories,
    colors,
    materials,
    sizeScales,
    addProduct,
    updateProduct,
    addBrand,
    addCategory,
    addColor,
    addMaterial,
    addSize,
  } = useProductStore()
  const printRef = useRef<HTMLDivElement>(null)

  /** Per-size stock lives outside the zod form — it is a list, not a field. */
  const [sizes, setSizes] = useState<SizeStock[]>([])
  /** Storefront photos, likewise a list rather than a field. */
  const [images, setImages] = useState<string[]>([])

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      description: '',
      barcode: '',
      brand: brands[0] ?? '',
      category: categories[0] ?? '',
      sizeCategory: 'alpha',
      color: colors[0] ?? '',
      material: materials[0] ?? '',
      gender: 'women',
      season: 'allSeason',
      collection: '',
    },
  })

  useEffect(() => {
    if (!open) return
    if (product) {
      reset({
        name: product.name,
        description: product.description ?? '',
        barcode: product.barcode ?? '',
        brand: product.brand,
        category: product.category,
        sizeCategory: product.sizeCategory,
        color: product.color,
        material: product.material,
        gender: product.gender,
        season: product.season,
        collection: product.collection ?? '',
      })
      setSizes(product.sizes)
      setImages(product.images ?? [])
    } else {
      reset({
        name: presetName ?? '',
        description: '',
        barcode: '',
        brand: brands[0] ?? '',
        category: categories[0] ?? '',
        sizeCategory: 'alpha',
        color: colors[0] ?? '',
        material: materials[0] ?? '',
        gender: 'women',
        season: 'allSeason',
        collection: '',
      })
      setSizes([])
      setImages([])
    }
  }, [open, product, presetName]) // eslint-disable-line react-hooks/exhaustive-deps

  const barcode = watch('barcode')
  const sizeCategory = watch('sizeCategory') as SizeCategory
  const handlePrint = useReactToPrint({ content: () => printRef.current })

  // Switching size family clears sizes drawn from the previous scale.
  const changeSizeCategory = (next: SizeCategory) => {
    setValue('sizeCategory', next)
    const scale = sizeScales[next] ?? []
    setSizes((prev) => prev.filter((s) => scale.includes(s.size)))
  }

  const onSubmit = (data: FormData) => {
    const common = {
      name: data.name,
      description: data.description ?? '',
      barcode: data.barcode ?? '',
      brand: data.brand,
      category: data.category,
      sizeCategory: data.sizeCategory,
      sizes,
      images,
      color: data.color,
      material: data.material,
      gender: data.gender as Gender,
      season: data.season as Season,
      collection: data.collection ?? '',
    }

    if (product) {
      updateProduct(product.id, common)
      toast.success(t('saved'))
      onSaved?.({ ...product, ...common })
    } else {
      const created = addProduct({
        ...common,
        purchasePrice: 0,
        salePrice: 0,
        minQuantity: 0,
      })
      toast.success(t('saved'))
      onSaved?.(created)
    }
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={product ? t('editProduct') : t('newProduct')}
      subtitle={t('productModalSubtitle')}
      size="xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button onClick={handleSubmit(onSubmit)}>
            <IconSave size={16} />
            {t('save')}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* ── Identity ───────────────────────────────────────────────────── */}
        <section className="space-y-4">
          <h4 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-wood-warm">
            <IconGarment size={16} />
            {t('articleIdentity')}
          </h4>
          <Input label={t('productName')} {...register('name')} error={errors.name && t('required')} />
          <Textarea label={t('description')} {...register('description')} />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Controller
              control={control}
              name="brand"
              render={({ field }) => (
                <CreatableSelect
                  label={t('brand')}
                  options={brands}
                  value={field.value}
                  onChange={field.onChange}
                  onCreate={addBrand}
                  placeholder={t('newBrand')}
                  error={errors.brand && t('required')}
                />
              )}
            />
            <Controller
              control={control}
              name="category"
              render={({ field }) => (
                <CreatableSelect
                  label={t('category')}
                  options={categories}
                  value={field.value}
                  onChange={field.onChange}
                  onCreate={addCategory}
                  placeholder={t('newCategory')}
                  error={errors.category && t('required')}
                />
              )}
            />
          </div>
        </section>

        {/* ── Storefront photos ──────────────────────────────────────────── */}
        <section className="space-y-3">
          <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-wood-warm">
            <IconGarment size={15} />
            {t('images')}{' '}
            <span className="font-normal normal-case tracking-normal text-wood-medium">
              ({t('optional')})
            </span>
          </h4>
          <ImageGallery value={images} onChange={setImages} hint={t('imagesHint')} />
        </section>

        {/* ── Sizes ──────────────────────────────────────────────────────── */}
        <section className="space-y-3">
          <h4 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-wood-warm">
            <IconSeason size={16} />
            {t('sizesAndStock')}
          </h4>

          <div>
            <label className="label-wood">{t('sizeCategory')}</label>
            <div className="flex flex-wrap gap-2">
              {SIZE_CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => changeSizeCategory(c)}
                  className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                    sizeCategory === c
                      ? 'border-wood-warm bg-wood-btn text-accentfg shadow-gold'
                      : 'border-wood-light bg-white text-wood-medium hover:border-wood-warm hover:text-wood-warm'
                  }`}
                >
                  {t(`size_${c}` as TranslationKey)}
                </button>
              ))}
            </div>
          </div>

          <SizePicker
            scale={sizeScales[sizeCategory] ?? []}
            value={sizes}
            onChange={setSizes}
            onCreateSize={(s) => addSize(sizeCategory, s)}
            category={sizeCategory}
          />
        </section>

        {/* ── Garment details ────────────────────────────────────────────── */}
        <section className="space-y-4">
          <h4 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-wood-warm">
            <IconMaterial size={16} />
            {t('garmentDetails')}
          </h4>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Controller
              control={control}
              name="color"
              render={({ field }) => (
                <CreatableSelect
                  label={t('color')}
                  icon={<IconColor size={15} className="text-wood-warm" />}
                  options={colors}
                  value={field.value}
                  onChange={field.onChange}
                  onCreate={addColor}
                  placeholder={t('newColor')}
                  error={errors.color && t('required')}
                />
              )}
            />
            <Controller
              control={control}
              name="material"
              render={({ field }) => (
                <CreatableSelect
                  label={t('material')}
                  icon={<IconMaterial size={15} className="text-wood-warm" />}
                  options={materials}
                  value={field.value}
                  onChange={field.onChange}
                  onCreate={addMaterial}
                  placeholder={t('newMaterial')}
                  error={errors.material && t('required')}
                />
              )}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="label-wood flex items-center gap-1.5">
                <IconGender size={15} className="text-wood-warm" />
                {t('gender')}
              </label>
              <Select {...register('gender')}>
                {GENDERS.map((g) => (
                  <option key={g} value={g}>
                    {t(`gender_${g}` as TranslationKey)}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="label-wood flex items-center gap-1.5">
                <IconSeason size={15} className="text-wood-warm" />
                {t('season')}
              </label>
              <Select {...register('season')}>
                {SEASONS.map((s) => (
                  <option key={s} value={s}>
                    {t(`season_${s}` as TranslationKey)}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="label-wood flex items-center gap-1.5">
                <IconCollection size={15} className="text-wood-warm" />
                {t('collection')}
              </label>
              <input
                className="input-wood"
                placeholder={t('collectionPlaceholder')}
                {...register('collection')}
              />
            </div>
          </div>
        </section>

        {/* ── Barcode ────────────────────────────────────────────────────── */}
        <section className="rounded-xl border border-wood-light bg-wood-cream/40 p-4">
          <h4 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-wood-warm">
            <IconBarcode size={16} />
            {t('barcode')} <span className="font-normal normal-case">({t('optional')})</span>
          </h4>
          <div className="flex flex-wrap items-end gap-3">
            <Input label={t('barcode')} className="font-mono" {...register('barcode')} />
            <Button type="button" variant="outline" onClick={() => setValue('barcode', generateEAN13())}>
              <IconGenerate size={15} />
              {t('generateBarcode')}
            </Button>
            <Button type="button" variant="gold" onClick={handlePrint} disabled={!barcode}>
              <IconPrint size={15} />
              {t('printBarcode')}
            </Button>
          </div>
          {barcode ? (
            <div className="mt-3 flex justify-center rounded-lg bg-white p-2">
              <Barcode value={barcode} />
            </div>
          ) : (
            <p className="mt-3 flex items-center gap-1.5 text-xs text-wood-medium/80">
              <Info size={13} /> {t('barcodeOptionalHint')}
            </p>
          )}
          <div className="hidden">
            <div ref={printRef} className="print-area flex flex-col items-center p-6">
              <p className="mb-2 text-center text-lg font-bold">{watch('name')}</p>
              {barcode && <Barcode value={barcode} height={80} />}
            </div>
          </div>
        </section>

        {/* Pricing is captured on the first purchase of the article */}
        <div className="flex items-start gap-2 rounded-xl border border-wood-light bg-gradient-to-br from-wood-cream/60 to-white px-4 py-3 text-xs text-wood-medium">
          <Info size={15} className="mt-0.5 shrink-0 text-wood-warm" />
          <span>{t('pricingLaterHint')}</span>
        </div>
      </form>
    </Modal>
  )
}
