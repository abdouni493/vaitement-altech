import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useReactToPrint } from 'react-to-print'
import {
  format,
  startOfMonth,
  endOfMonth,
  subMonths,
  subDays,
  startOfQuarter,
} from 'date-fns'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { Loader2 } from 'lucide-react'
import {
  IconChart,
  IconPrint,
  IconUp,
  IconDown,
  IconCart,
  IconExpense,
  IconPayroll,
  IconStock,
  IconGender,
  IconCategory,
  IconTreasury,
  IconMargin,
  IconSize,
  IconAlert,
  IconGarment,
} from '@/components/ui/icons'
import { PageHeader } from '@/components/ui/Misc'
import { Button } from '@/components/ui/Button'
import { SizeChip } from '@/components/shared/SizePicker'
import { useSalesStore } from '@/store/useSalesStore'
import { usePurchaseStore } from '@/store/usePurchaseStore'
import { useExpenseStore } from '@/store/useExpenseStore'
import { useWorkerStore } from '@/store/useWorkerStore'
import { useProductStore } from '@/store/useProductStore'
import { useClientStore } from '@/store/useClientStore'
import { useSupplierStore } from '@/store/useSupplierStore'
import { useSettingsStore } from '@/store/useSettingsStore'
import { useCaisseStore } from '@/store/useCaisseStore'
import { useTranslation } from '@/i18n/useTranslation'
import { formatMoney, compareSizes } from '@/utils/helpers'
import {
  sumSales,
  sumPurchases,
  sumExpenses,
  sumSalaries,
  topClients,
  clientStats,
  supplierStats,
  remaining,
  caissePeriodStats,
  categoryBreakdown,
  periodSoldProducts,
  productSalesAnalysis,
  periodSizeSales,
  sizeCategoryBreakdown,
  stockBySizeCategory,
  productsWithMissingSizes,
  attributeBreakdown,
} from '@/utils/calculations'
import type { TranslationKey } from '@/i18n/translations'

/**
 * Chart palette — brass, ink and the accent hues of the boutique. Ordered so
 * neighbouring series stay distinguishable, and each holds ≥3:1 against white.
 */
const CHART_COLORS = [
  '#A16207', // brass
  '#1C1917', // ink
  '#047857', // emerald
  '#BE123C', // couture red
  '#B45309', // amber
  '#0F766E', // teal
  '#7C2D12', // chestnut
  '#57534E', // stone
  '#854D0E', // bronze
]

const AXIS = { fontSize: 11, fill: '#57534E' }
const TOOLTIP_STYLE = {
  borderRadius: 12,
  border: '1px solid #D9C7A3',
  background: '#FFFFFF',
  fontSize: 12,
}

// ----------------------------------------------------------------------------
// Building blocks
// ----------------------------------------------------------------------------

const SummaryCard = ({
  label,
  value,
  color,
  icon,
}: {
  label: string
  value: number
  color: string
  icon: React.ReactNode
}) => (
  <div className="card-wood rounded-2xl p-4">
    <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-white ${color}`}>
      {icon}
    </div>
    <p className="mt-3 text-xs text-wood-medium">{label}</p>
    <p className="text-mono text-xl font-bold text-wood-dark">{formatMoney(value)}</p>
  </div>
)

const MiniStat = ({ label, value, tone }: { label: string; value: string; tone?: string }) => (
  <div className="card-wood rounded-xl p-3">
    <p className="text-[11px] text-wood-medium">{label}</p>
    <p className={`text-mono text-lg font-bold ${tone ?? 'text-wood-dark'}`}>{value}</p>
  </div>
)

const Section = ({
  title,
  icon,
  children,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) => (
  <section className="card-wood rounded-2xl p-5">
    <h2 className="mb-4 flex items-center gap-2 text-display text-lg font-bold text-wood-dark">
      <span className="text-wood-warm">{icon}</span>
      {title}
    </h2>
    {children}
  </section>
)

type Align = 'start' | 'end' | 'center'

/**
 * Report table. Alignment is declared per column rather than guessed from the
 * column index, so numbers always sit right and labels always sit left.
 */
const ReportTable = ({
  head,
  align,
  rows,
}: {
  head: string[]
  align?: Align[]
  rows: React.ReactNode[][]
}) => {
  const { t } = useTranslation()
  if (rows.length === 0)
    return <p className="py-6 text-center text-sm text-wood-medium">{t('noData')}</p>

  const alignOf = (i: number): Align => align?.[i] ?? (i === 0 ? 'start' : 'end')
  const cls = (a: Align) =>
    a === 'end' ? 'text-end' : a === 'center' ? 'text-center' : 'text-start'

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-wood-light text-xs uppercase tracking-wide text-wood-medium">
            {head.map((h, i) => (
              <th key={i} className={`py-2 font-semibold ${cls(alignOf(i))}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-wood-cream last:border-0 hover:bg-wood-cream/40">
              {row.map((cell, j) => (
                <td
                  key={j}
                  className={`py-2 ${cls(alignOf(j))} ${
                    j === 0 ? 'font-medium text-wood-dark' : 'text-wood-medium'
                  } ${alignOf(j) === 'end' ? 'text-mono' : ''}`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ----------------------------------------------------------------------------
// Page
// ----------------------------------------------------------------------------

export const ReportsPage = () => {
  const { t } = useTranslation()
  const sales = useSalesStore((s) => s.sales)
  const purchases = usePurchaseStore((s) => s.purchases)
  const expenses = useExpenseStore((s) => s.expenses)
  const workers = useWorkerStore((s) => s.workers)
  const products = useProductStore((s) => s.products)
  const clients = useClientStore((s) => s.clients)
  const suppliers = useSupplierStore((s) => s.suppliers)
  const settings = useSettingsStore((s) => s.settings)
  const transactions = useCaisseStore((s) => s.transactions)

  const [from, setFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
  const [to, setTo] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<ReturnType<typeof buildReport> | null>(null)
  const printRef = useRef<HTMLDivElement>(null)
  const handlePrint = useReactToPrint({ content: () => printRef.current })

  /** One-click ranges — the periods a shop actually reports on. */
  const quickRanges: { label: string; range: () => [Date, Date] }[] = [
    { label: t('thisMonth'), range: () => [startOfMonth(new Date()), new Date()] },
    {
      label: t('lastMonth'),
      range: () => {
        const prev = subMonths(new Date(), 1)
        return [startOfMonth(prev), endOfMonth(prev)]
      },
    },
    { label: t('last30Days'), range: () => [subDays(new Date(), 30), new Date()] },
    { label: t('thisQuarter'), range: () => [startOfQuarter(new Date()), new Date()] },
  ]

  const applyRange = ([s, e]: [Date, Date]) => {
    setFrom(format(s, 'yyyy-MM-dd'))
    setTo(format(e, 'yyyy-MM-dd'))
  }

  function buildReport() {
    const start = new Date(from)
    const end = new Date(to + 'T23:59:59')
    const inRange = (d: string) => new Date(d) >= start && new Date(d) <= end

    const periodSales = sales.filter((s) => inRange(s.date))
    const periodPurchases = purchases.filter((p) => inRange(p.date))
    const periodExpenses = expenses.filter((e) => inRange(e.date))

    const totalSales = sumSales(sales, start, end)
    const totalPurchases = sumPurchases(purchases, start, end)
    const totalExpenses = sumExpenses(expenses, start, end)
    const totalSalaries = sumSalaries(workers, start, end)

    const soldProducts = periodSoldProducts(sales, products, start, end)
    const grossMargin = soldProducts.reduce((s, r) => s + r.gain, 0)
    const cogs = soldProducts.reduce((s, r) => s + r.cost, 0)
    const unitsSold = soldProducts.reduce((s, r) => s + r.quantity, 0)

    const velocity = productSalesAnalysis(sales, products, start, end)
    const bestSellers = velocity.filter((r) => r.quantity > 0).slice(0, 8)
    // Slow movers must not repeat the best sellers: take from the bottom of the
    // list and exclude anything already shown as a top performer.
    const bestIds = new Set(bestSellers.map((r) => r.productId))
    const slowMovers = [...velocity]
      .filter((r) => !bestIds.has(r.productId))
      .sort((a, b) => a.quantity - b.quantity || a.revenue - b.revenue)
      .slice(0, 8)

    return {
      start,
      end,
      totalSales,
      totalPurchases,
      totalExpenses,
      totalSalaries,
      netProfit: totalSales - totalPurchases - totalExpenses - totalSalaries,
      periodSales,
      periodPurchases,
      periodExpenses,
      topClients: topClients(periodSales, 10),
      grossMargin,
      cogs,
      unitsSold,
      marginPct: totalSales > 0 ? (grossMargin / totalSales) * 100 : 0,
      avgBasket: periodSales.length ? totalSales / periodSales.length : 0,
      bestSellers,
      slowMovers,
      cats: categoryBreakdown(sales, purchases, products, start, end),
      caisse: caissePeriodStats(transactions, sales, purchases, expenses, workers, start, end),

      // ── Clothing-specific analytics ──────────────────────────────────────
      sizeSales: periodSizeSales(sales, products, start, end),
      sizeCats: sizeCategoryBreakdown(sales, products, start, end),
      stockBySize: stockBySizeCategory(products),
      missingSizes: productsWithMissingSizes(products),
      byGender: attributeBreakdown(sales, products, 'gender', start, end),
      bySeason: attributeBreakdown(sales, products, 'season', start, end),

      clientDebts: clients
        .map((c) => ({ ...c, ...clientStats(c.id, sales) }))
        .filter((c) => c.totalDebt > 0),
      supplierDebts: suppliers
        .map((s) => ({ ...s, ...supplierStats(s.id, purchases) }))
        .filter((s) => s.totalDebt > 0),
      lowStock: products.filter((p) => p.quantity <= p.minQuantity),
      salaryPayments: workers.flatMap((w) =>
        w.payments.filter((p) => inRange(p.date)).map((p) => ({ ...p, worker: w.fullName })),
      ),
    }
  }

  const generate = () => {
    setLoading(true)
    setReport(null)
    setTimeout(() => {
      setReport(buildReport())
      setLoading(false)
    }, 600)
  }

  const sizeLabel = (c: string) => t(`size_${c}` as TranslationKey)

  return (
    <div>
      <PageHeader
        title={t('reports')}
        subtitle={t('reportsSubtitle')}
        actions={
          report && (
            <Button variant="gold" onClick={handlePrint}>
              <IconPrint size={16} />
              {t('printReport')}
            </Button>
          )
        }
      />

      {/* Period picker */}
      <div className="card-wood mb-5 rounded-2xl p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="label-wood">{t('from')}</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="input-wood"
            />
          </div>
          <div>
            <label className="label-wood">{t('to')}</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="input-wood"
            />
          </div>
          <Button onClick={generate}>
            <IconChart size={16} />
            {t('generateReport')}
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-wood-light/60 pt-3">
          <span className="text-xs font-medium text-wood-medium">{t('quickRanges')}:</span>
          {quickRanges.map((r) => (
            <button
              key={r.label}
              onClick={() => applyRange(r.range())}
              className="rounded-lg border border-wood-light bg-white px-2.5 py-1 text-xs font-medium text-wood-medium transition hover:border-wood-warm hover:text-wood-warm"
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center gap-3 py-20"
          >
            <Loader2 className="animate-spin text-wood-warm" size={40} />
            <p className="text-sm text-wood-medium">{t('loading')}</p>
          </motion.div>
        ) : report ? (
          <motion.div
            key="report"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            ref={printRef}
            className="print-area space-y-6"
          >
            {/* Print-only header */}
            <div className="hidden print:block">
              <h1 className="text-display text-2xl font-bold text-wood-dark">{settings.name}</h1>
              <p className="text-sm text-wood-medium">
                {t('reports')} — {format(report.start, 'dd/MM/yyyy')} →{' '}
                {format(report.end, 'dd/MM/yyyy')}
              </p>
            </div>

            {/* ── Financial summary ──────────────────────────────────────── */}
            <section>
              <h2 className="mb-3 text-display text-xl font-bold text-wood-dark">
                {t('financialSummary')}
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <SummaryCard label={t('totalSales')} value={report.totalSales} color="bg-sage" icon={<IconUp size={18} />} />
                <SummaryCard label={t('totalPurchasesReport')} value={report.totalPurchases} color="bg-wood-warm" icon={<IconCart size={18} />} />
                <SummaryCard label={t('totalExpenses')} value={report.totalExpenses} color="bg-terracotta" icon={<IconExpense size={18} />} />
                <SummaryCard label={t('totalSalaries')} value={report.totalSalaries} color="bg-gold" icon={<IconPayroll size={18} />} />
                <SummaryCard label={t('grossMargin')} value={report.grossMargin} color="bg-wood-dark" icon={<IconMargin size={18} />} />
                <div className="card-wood rounded-2xl bg-wood-btn p-4 text-white">
                  <p className="text-xs opacity-90">{t('netProfit')}</p>
                  <p className="text-mono mt-2 text-xl font-bold">{formatMoney(report.netProfit)}</p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <MiniStat label={t('unitsSold')} value={String(report.unitsSold)} />
                <MiniStat label={t('cogs')} value={formatMoney(report.cogs)} />
                <MiniStat label={t('marginRate')} value={`${report.marginPct.toFixed(1)} %`} tone="text-sage" />
                <MiniStat label={t('avgBasket')} value={formatMoney(report.avgBasket)} />
              </div>
            </section>

            {/* ── SIZE ANALYSIS — the boutique's own view ─────────────────── */}
            <Section title={t('sizeAnalysis')} icon={<IconSize size={18} />}>
              {report.sizeSales.length === 0 ? (
                <p className="py-6 text-center text-sm text-wood-medium">{t('noSales')}</p>
              ) : (
                <>
                  {/* Per size family */}
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <div>
                      <h3 className="mb-2 text-sm font-bold text-wood-medium">
                        {t('salesBySizeCategory')}
                      </h3>
                      {/* Two axes: units (left) and revenue (right) live on very
                          different scales, so a single axis would flatten one. */}
                      <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={report.sizeCats.map((c) => ({ ...c, label: sizeLabel(c.sizeCategory) }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#EADFC8" />
                          <XAxis dataKey="label" tick={{ ...AXIS, fontSize: 10 }} interval={0} />
                          <YAxis yAxisId="qty" tick={AXIS} />
                          <YAxis
                            yAxisId="rev"
                            orientation="right"
                            tick={AXIS}
                            tickFormatter={(v) => `${v / 1000}k`}
                          />
                          <Tooltip
                            formatter={(v: number, n: string) =>
                              n === t('revenue') ? formatMoney(v) : `${v}`
                            }
                            contentStyle={TOOLTIP_STYLE}
                          />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          <Bar yAxisId="qty" dataKey="quantity" name={t('qtySold')} fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
                          <Bar yAxisId="rev" dataKey="revenue" name={t('revenue')} fill={CHART_COLORS[1]} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div>
                      <h3 className="mb-2 text-sm font-bold text-wood-medium">{t('topSizes')}</h3>
                      <ResponsiveContainer width="100%" height={240}>
                        <BarChart
                          data={report.sizeSales.slice(0, 10).map((s) => ({
                            ...s,
                            label: `${s.size} · ${sizeLabel(s.sizeCategory)}`,
                          }))}
                          layout="vertical"
                          margin={{ left: 8, right: 16 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#EADFC8" horizontal={false} />
                          <XAxis type="number" tick={AXIS} />
                          <YAxis type="category" dataKey="label" width={110} tick={{ ...AXIS, fontSize: 10 }} />
                          <Tooltip formatter={(v: number) => `${v}`} contentStyle={TOOLTIP_STYLE} />
                          <Bar dataKey="quantity" name={t('qtySold')} fill={CHART_COLORS[0]} radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Family-by-family detail, with the sizes that actually sold */}
                  <div className="mt-5 space-y-3">
                    {report.sizeCats.map((c) => (
                      <div key={c.sizeCategory} className="rounded-xl border border-wood-light bg-wood-cream/30 p-3">
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                          <h4 className="flex items-center gap-2 text-sm font-bold text-wood-dark">
                            <IconSize size={14} className="text-wood-warm" />
                            {sizeLabel(c.sizeCategory)}
                          </h4>
                          <div className="flex gap-4 text-xs text-wood-medium">
                            <span>
                              {t('qtySold')}: <span className="text-mono font-bold text-wood-dark">{c.quantity}</span>
                            </span>
                            <span>
                              {t('revenue')}: <span className="text-mono font-bold text-wood-dark">{formatMoney(c.revenue)}</span>
                            </span>
                            <span>
                              {t('margin')}: <span className="text-mono font-bold text-sage">{formatMoney(c.gain)}</span>
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {[...c.sizes]
                            .sort((a, b) => compareSizes(a.size, b.size))
                            .map((s) => (
                              <SizeChip
                                key={s.size}
                                size={s.size}
                                quantity={s.quantity}
                                title={`${s.quantity} ${t('unitsSold').toLowerCase()} · ${formatMoney(s.revenue)}`}
                              />
                            ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Sales table by size */}
                  <div className="mt-5">
                    <ReportTable
                      head={[t('size'), t('sizeCategory'), t('qtySold'), t('revenue'), t('margin')]}
                      align={['start', 'start', 'end', 'end', 'end']}
                      rows={report.sizeSales.map((s) => [
                        s.size,
                        sizeLabel(s.sizeCategory),
                        String(s.quantity),
                        formatMoney(s.revenue),
                        formatMoney(s.gain),
                      ])}
                    />
                  </div>
                </>
              )}
            </Section>

            {/* ── Stock held per size family + missing sizes ──────────────── */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Section title={`${t('stockReport')} — ${t('sizeCategory')}`} icon={<IconStock size={18} />}>
                <ReportTable
                  head={[t('sizeCategory'), t('quantity'), t('stockValue')]}
                  align={['start', 'end', 'end']}
                  rows={report.stockBySize.map((s) => [
                    sizeLabel(s.sizeCategory),
                    String(s.units),
                    formatMoney(s.value),
                  ])}
                />
              </Section>

              <Section title={t('missingSizes')} icon={<IconAlert size={18} />}>
                {report.missingSizes.length === 0 ? (
                  <p className="py-6 text-center text-sm text-sage">{t('inStock')}</p>
                ) : (
                  <>
                    <div className="space-y-2">
                      {report.missingSizes.map(({ product, missing }) => (
                        <div
                          key={product.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-terracotta/30 bg-terracotta/5 p-2.5"
                        >
                          <span className="text-sm font-medium text-wood-dark">{product.name}</span>
                          <div className="flex flex-wrap gap-1">
                            {missing.map((m) => (
                              <SizeChip key={m} size={m} quantity={0} />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="mt-3 text-xs text-wood-medium/80">{t('missingSizesHint')}</p>
                  </>
                )}
              </Section>
            </div>

            {/* ── Gender & season ────────────────────────────────────────── */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Section title={t('genderAnalysis')} icon={<IconGender size={18} />}>
                {report.byGender.length === 0 ? (
                  <p className="py-6 text-center text-sm text-wood-medium">{t('noSales')}</p>
                ) : (
                  <ResponsiveContainer width="100%" height={230}>
                    <PieChart>
                      <Pie
                        data={report.byGender.map((g) => ({
                          ...g,
                          label: t(`gender_${g.key}` as TranslationKey),
                        }))}
                        dataKey="revenue"
                        nameKey="label"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={(e) => e.label}
                      >
                        {report.byGender.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatMoney(v)} contentStyle={TOOLTIP_STYLE} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </Section>

              <Section title={t('seasonAnalysis')} icon={<IconGarment size={18} />}>
                <ReportTable
                  head={[t('season'), t('qtySold'), t('revenue')]}
                  align={['start', 'end', 'end']}
                  rows={report.bySeason.map((s) => [
                    t(`season_${s.key}` as TranslationKey),
                    String(s.quantity),
                    formatMoney(s.revenue),
                  ])}
                />
              </Section>
            </div>

            {/* ── Treasury ───────────────────────────────────────────────── */}
            <Section title={`${t('caisse')} — ${t('financialSummary')}`} icon={<IconTreasury size={18} />}>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {[
                  { l: t('cashIn'), v: report.caisse.cashIn, c: 'text-sage' },
                  { l: t('cashOut'), v: report.caisse.cashOut, c: 'text-terracotta' },
                  { l: t('netFlow'), v: report.caisse.netFlow, c: report.caisse.netFlow >= 0 ? 'text-sage' : 'text-terracotta' },
                  { l: `${t('collected')} — ${t('sales')}`, v: report.caisse.salesCollected, c: 'text-wood-dark' },
                  { l: `${t('paid')} — ${t('purchase')}`, v: report.caisse.purchasesPaid, c: 'text-wood-dark' },
                  { l: t('salariesPaid'), v: report.caisse.salaries, c: 'text-wood-dark' },
                ].map((x) => (
                  <div key={x.l} className="rounded-xl bg-wood-cream/50 p-3">
                    <p className="truncate text-[11px] text-wood-medium" title={x.l}>{x.l}</p>
                    <p className={`text-mono text-base font-bold ${x.c}`}>{formatMoney(x.v)}</p>
                  </div>
                ))}
              </div>
            </Section>

            {/* ── Best sellers & slow movers ─────────────────────────────── */}
            <Section title={t('salesAnalysis')} icon={<IconChart size={18} />}>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div>
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-sage">
                    <IconUp size={16} />
                    {t('bestSellers')}
                  </h3>
                  {report.bestSellers.length > 0 && (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={report.bestSellers} layout="vertical" margin={{ left: 8, right: 16 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#EADFC8" horizontal={false} />
                        <XAxis type="number" tick={AXIS} />
                        <YAxis type="category" dataKey="name" width={100} tick={{ ...AXIS, fontSize: 9 }} />
                        <Tooltip formatter={(v: number) => `${v}`} contentStyle={TOOLTIP_STYLE} />
                        <Bar dataKey="quantity" name={t('qtySold')} fill={CHART_COLORS[2]} radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                  <ReportTable
                    head={[t('productName'), t('qtySold'), t('sales'), t('margin')]}
                    align={['start', 'end', 'end', 'end']}
                    rows={report.bestSellers.map((p) => [
                      p.name,
                      String(p.quantity),
                      formatMoney(p.revenue),
                      formatMoney(p.gain),
                    ])}
                  />
                </div>
                <div>
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-terracotta">
                    <IconDown size={16} />
                    {t('slowMovers')}
                  </h3>
                  <ReportTable
                    head={[t('productName'), t('category'), t('qtySold'), t('sales')]}
                    align={['start', 'start', 'end', 'end']}
                    rows={report.slowMovers.map((p) => [
                      p.name,
                      p.category,
                      String(p.quantity),
                      formatMoney(p.revenue),
                    ])}
                  />
                  <p className="mt-2 text-xs text-wood-medium/80">{t('slowMoversHint')}</p>
                </div>
              </div>
            </Section>

            {/* ── Category analysis ──────────────────────────────────────── */}
            <Section title={t('categoryAnalysis')} icon={<IconCategory size={18} />}>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {report.cats.length > 0 && (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={report.cats}
                        dataKey="salesRevenue"
                        nameKey="category"
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        label={(e) => e.category}
                      >
                        {report.cats.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatMoney(v)} contentStyle={TOOLTIP_STYLE} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
                <ReportTable
                  head={[t('category'), t('sales'), t('purchase'), t('margin')]}
                  align={['start', 'end', 'end', 'end']}
                  rows={report.cats.map((c) => [
                    c.category,
                    formatMoney(c.salesRevenue),
                    formatMoney(c.purchasesCost),
                    formatMoney(c.gain),
                  ])}
                />
              </div>
            </Section>

            {/* ── Sales detail (with sizes) ──────────────────────────────── */}
            <Section title={t('salesDetailed')} icon={<IconUp size={18} />}>
              <ReportTable
                head={[t('reference'), t('client'), t('sizes'), t('date'), t('total'), t('status')]}
                align={['start', 'start', 'start', 'start', 'end', 'center']}
                rows={report.periodSales.map((s) => [
                  s.reference,
                  s.clientName,
                  <span key="sz" className="flex flex-wrap gap-1">
                    {s.lines.map((l, i) => (
                      <SizeChip key={i} size={l.size || t('noSize')} title={l.productName} />
                    ))}
                  </span>,
                  format(new Date(s.date), 'dd/MM/yyyy'),
                  formatMoney(s.total),
                  <span
                    key="st"
                    className={s.paid >= s.total ? 'font-semibold text-sage' : 'font-semibold text-terracotta'}
                  >
                    {s.paid >= s.total ? t('statusPaid') : t('inDebt')}
                  </span>,
                ])}
              />
            </Section>

            {/* ── Purchases detail ───────────────────────────────────────── */}
            <Section title={t('purchasesDetailed')} icon={<IconCart size={18} />}>
              <ReportTable
                head={[t('reference'), t('supplier'), t('date'), t('total'), t('paid'), t('remaining')]}
                align={['start', 'start', 'start', 'end', 'end', 'end']}
                rows={report.periodPurchases.map((p) => [
                  p.reference,
                  p.supplierName,
                  format(new Date(p.date), 'dd/MM/yyyy'),
                  formatMoney(p.total),
                  formatMoney(p.paid),
                  formatMoney(remaining(p.total, p.paid)),
                ])}
              />
            </Section>

            {/* ── Top clients & debts ────────────────────────────────────── */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Section title={t('topClients')} icon={<IconGender size={18} />}>
                <ReportTable
                  head={['#', t('client'), t('amount')]}
                  align={['start', 'start', 'end']}
                  rows={report.topClients.map((c, i) => [String(i + 1), c.name, formatMoney(c.amount)])}
                />
              </Section>
              <Section title={t('clientDebts')} icon={<IconAlert size={18} />}>
                <ReportTable
                  head={[t('client'), t('totalDebt')]}
                  align={['start', 'end']}
                  rows={report.clientDebts.map((c) => [c.name, formatMoney(c.totalDebt)])}
                />
              </Section>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Section title={t('supplierDebts')} icon={<IconAlert size={18} />}>
                <ReportTable
                  head={[t('supplier'), t('totalDebt')]}
                  align={['start', 'end']}
                  rows={report.supplierDebts.map((s) => [s.name, formatMoney(s.totalDebt)])}
                />
              </Section>
              <Section title={t('expenses')} icon={<IconExpense size={18} />}>
                <ReportTable
                  head={[t('name'), t('date'), t('amount')]}
                  align={['start', 'start', 'end']}
                  rows={report.periodExpenses.map((e) => [
                    e.name,
                    format(new Date(e.date), 'dd/MM/yyyy'),
                    formatMoney(e.amount),
                  ])}
                />
              </Section>
            </div>

            {/* ── Salaries + low stock ───────────────────────────────────── */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Section title={t('totalSalaries')} icon={<IconPayroll size={18} />}>
                <ReportTable
                  head={[t('workers'), t('period'), t('amount')]}
                  align={['start', 'start', 'end']}
                  rows={report.salaryPayments.map((p) => [p.worker, p.period, formatMoney(p.amount)])}
                />
              </Section>
              <Section title={`${t('stockReport')} — ${t('stockAlerts')}`} icon={<IconStock size={18} />}>
                <ReportTable
                  head={[t('productName'), t('quantity'), t('minQuantity')]}
                  align={['start', 'end', 'end']}
                  rows={report.lowStock.map((p) => [p.name, String(p.quantity), String(p.minQuantity)])}
                />
              </Section>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="card-wood flex flex-col items-center gap-3 rounded-2xl py-20 text-center"
          >
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-wood-cream text-wood-warm">
              <IconChart size={40} />
            </div>
            <p className="text-sm text-wood-medium">{t('selectPeriod')}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
