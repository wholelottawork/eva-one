import { useEffect, useRef, useState, memo } from 'react'
import { motion } from 'framer-motion'
import {
  Copy,
  Check,
  ExternalLink,
  Zap,
  Vote,
  TrendingUp,
  Shield,
} from 'lucide-react'
import HeaderBar from '../components/HeaderBar'
import { goTo } from '../lib/nav'
import { useLanguage } from '../contexts/LanguageContext'
import { useAuth } from '../contexts/AuthContext'
import { t, type Language } from '../i18n/translations'
import {
  EVA_BASE_TOKEN_ADDRESS,
  isEvaTokenConfigured,
} from '../lib/upgradeConfig'

// ── Tokenomics data ────────────────────────────────────────────────────────────

const TOTAL_SUPPLY = 100_000_000_000

const ALLOCATION_META = [
  { id: 'publicSale', pct: 55, color: '#00c853' },
  { id: 'treasury', pct: 20, color: '#22c55e' },
  { id: 'liquidity', pct: 15, color: '#15803d' },
  { id: 'ecosystem', pct: 10, color: '#4ade80' },
] as const

const UTILITY_META = [
  {
    id: 'governance',
    color: '#00c853',
    glow: 'rgba(61,107,255,0.12)',
    num: '01',
  },
  {
    id: 'feeDiscounts',
    color: '#22c55e',
    glow: 'rgba(97,137,255,0.12)',
    num: '02',
  },
  {
    id: 'staking',
    color: '#15803d',
    glow: 'rgba(42,84,230,0.12)',
    num: '03',
  },
  {
    id: 'premiumAccess',
    color: '#4ade80',
    glow: 'rgba(88,199,255,0.12)',
    num: '04',
  },
] as const

const RADIUS = 80
const STROKE = 22
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const GAP = 3 // px gap between slices

function buildDonutSlices(
  allocations: Array<{ pct: number; color: string; label: string }>
) {
  let offset = 0
  return allocations.map((a) => {
    const dash = (a.pct / 100) * CIRCUMFERENCE
    const gap = GAP
    const slice = { ...a, dash: dash - gap, gap, offset }
    offset += dash
    return slice
  })
}

// ── Donut Chart ────────────────────────────────────────────────────────────────

function utilityIcon(id: (typeof UTILITY_META)[number]['id']) {
  switch (id) {
    case 'governance':
      return <Vote className="w-5 h-5" />
    case 'feeDiscounts':
      return <TrendingUp className="w-5 h-5" />
    case 'staking':
      return <Zap className="w-5 h-5" />
    case 'premiumAccess':
      return <Shield className="w-5 h-5" />
  }
}

function DonutChartInner({
  animate,
  supplyLabel,
  slices,
}: {
  animate: boolean
  supplyLabel: string
  slices: ReturnType<typeof buildDonutSlices>
}) {

  return (
    <svg
      viewBox="0 0 200 200"
      className="w-full max-w-[260px] mx-auto"
      style={{ overflow: 'visible' }}
    >
      {/* soft glow under the ring */}
      <defs>
        <filter id="tk-donut-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2.4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <circle
        cx="100"
        cy="100"
        r={RADIUS}
        fill="none"
        stroke="rgba(255,255,255,0.05)"
        strokeWidth={STROKE}
      />
      {slices.map((s, i) => (
        <motion.circle
          key={s.label}
          cx="100"
          cy="100"
          r={RADIUS}
          fill="none"
          stroke={s.color}
          strokeWidth={STROKE}
          strokeDasharray={`${animate ? s.dash : 0} ${CIRCUMFERENCE}`}
          strokeDashoffset={-s.offset}
          strokeLinecap="butt"
          transform="rotate(-90 100 100)"
          filter="url(#tk-donut-glow)"
          initial={{ strokeDasharray: `0 ${CIRCUMFERENCE}` }}
          animate={
            animate ? { strokeDasharray: `${s.dash} ${CIRCUMFERENCE}` } : {}
          }
          transition={{ duration: 0.6, delay: i * 0.08, ease: 'easeOut' }}
        />
      ))}
      {/* Center label */}
      <text
        x="100"
        y="96"
        textAnchor="middle"
        fontSize="13"
        fontWeight="700"
        fill="#eef1f7"
      >
        $EVA
      </text>
      <text
        x="100"
        y="112"
        textAnchor="middle"
        fontSize="9"
        fill="var(--text-secondary)"
      >
        {supplyLabel}
      </text>
    </svg>
  )
}

const DonutChart = memo(DonutChartInner)

// Premium-panel variety: four DIFFERENT variants for the key-stat cards (so the
// animated border light travels a different way per card — no obvious pattern),
// and an alternating top-glint / bottom-glint pair for the utility grid.

// ── Page ───────────────────────────────────────────────────────────────────────

export function TokenomicsPage() {
  const { language, setLanguage } = useLanguage()
  const { user, token, logout } = useAuth()
  const [copied, setCopied] = useState(false)
  const [chartVisible, setChartVisible] = useState(false)
  const [activeAlloc, setActiveAlloc] = useState<number | null>(null)
  const chartRef = useRef<HTMLDivElement>(null)

  const tr = (key: string, params?: Record<string, string | number>) =>
    t(`tokenomicsPage.${key}`, language, params)

  const fmt = (n: number, lang: Language) =>
    new Intl.NumberFormat(lang === 'zh' ? 'zh-CN' : 'en-US', {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(n)

  const allocations = ALLOCATION_META.map((item) => ({
    ...item,
    label: tr(`allocations.${item.id}.label`),
    desc: tr(`allocations.${item.id}.desc`),
  }))

  const vesting = ALLOCATION_META.map((item) => ({
    id: item.id,
    category: tr(`allocations.${item.id}.label`),
    cliff: tr(`vesting.${item.id}.cliff`),
    vesting: tr(`vesting.${item.id}.vesting`),
    tge: tr(`vesting.${item.id}.tge`),
    color: item.color,
  }))

  const utility = UTILITY_META.map((item) => ({
    ...item,
    icon: utilityIcon(item.id),
    title: tr(`utility.${item.id}.title`),
    desc: tr(`utility.${item.id}.desc`),
  }))

  const donutSlices = buildDonutSlices(allocations)

  const stats = [
    {
      label: tr('stats.totalSupply'),
      value: fmt(TOTAL_SUPPLY, language),
      sub: tr('stats.tokens'),
    },
    {
      label: tr('stats.launchPlatform'),
      value: 'Flap',
      sub: tr('stats.baseEcosystem'),
    },
    { label: tr('stats.launchNetwork'), value: 'Robinhood', sub: tr('stats.layer2') },
    { label: tr('stats.tge'), value: 'Q2 2026', sub: tr('stats.estimated') },
  ]

  const vestingHeaders = [
    tr('vestingHeaders.category'),
    tr('vestingHeaders.cliff'),
    tr('vestingHeaders.vesting'),
    tr('vestingHeaders.tgeUnlock'),
  ]

  const navigate = (path: string) => goTo(path) // SPA nav (no full reload)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setChartVisible(true)
      },
      { threshold: 0.3 }
    )
    if (chartRef.current) observer.observe(chartRef.current)
    return () => observer.disconnect()
  }, [])

  const handleCopy = () => {
    if (!isEvaTokenConfigured()) return
    navigator.clipboard.writeText(EVA_BASE_TOKEN_ADDRESS)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className="min-h-screen relative gl-data-page"
      style={{ color: 'var(--text-primary)', background: '#000000' }}
    >
      <HeaderBar
        isLoggedIn={!!(user && token)}
        currentPage="tokenomics"
        language={language}
        onLanguageChange={setLanguage}
        user={user}
        onLogout={logout}
        onLoginRequired={() => {}}
        onPageChange={(page) => navigate(`/${page}`)}
      />

      <main className="pt-16 relative z-10">
        {/* ── Hero ── */}
        <section className="relative overflow-hidden px-4 py-20 sm:py-28 flex flex-col items-center text-center">
          {/* faint blue halo only — kept subtle + dark so the page reads as dark
              metal (like /data), with blue as an accent rather than a wash */}
          <div className="absolute inset-0 pointer-events-none" />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative z-10 flex flex-col items-center gap-6 max-w-2xl mx-auto"
          >
            <span
              className="text-[11px] font-semibold uppercase tracking-[0.32em] px-3 py-1.5 rounded-full"
              style={{
                color: 'rgba(255,255,255,0.6)',
                background: '#1a1a1a',
                border: '1px solid #2a2a2a',
              }}
            >
              {tr('badge')}
            </span>

            <h1
              className="text-4xl sm:text-6xl font-bold tracking-tight text-white"
              style={{ letterSpacing: '-0.035em', lineHeight: 1.05 }}
            >
              {tr('title')}
            </h1>

            <p
              className="text-lg"
              style={{ color: 'var(--text-secondary)', maxWidth: '480px' }}
            >
              {tr('subtitle')}
            </p>

            {/* Mint address — dark glass chip with a faint electric-blue ring */}
            <div
              className="flex flex-wrap items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-mono max-w-full overflow-hidden"
              style={{
                background: '#0d0d0d',
                border: '1px solid #1f1f1f',
              }}
            >
              <span style={{ color: 'var(--text-tertiary)' }}>{tr('contract')}</span>
              <span style={{ color: 'var(--text-primary)' }}>
                {!isEvaTokenConfigured()
                  ? tr('tba')
                  : `${EVA_BASE_TOKEN_ADDRESS.slice(0, 10)}…${EVA_BASE_TOKEN_ADDRESS.slice(-8)}`}
              </span>
              <span
                className="text-[10px] px-1.5 py-0.5 rounded"
                style={
                  !isEvaTokenConfigured()
                    ? {
                        background: 'rgba(239,68,68,0.12)',
                        color: '#f87171',
                        border: '1px solid rgba(239,68,68,0.2)',
                      }
                    : {
                        background: 'rgba(61,107,255,0.12)',
                        color: '#00c853',
                        border: '1px solid rgba(61,107,255,0.24)',
                      }
                }
              >
                {!isEvaTokenConfigured() ? tr('tba') : tr('live')}
              </span>
              <button
                onClick={handleCopy}
                className="ml-1 transition-opacity hover:opacity-70"
                disabled={!isEvaTokenConfigured()}
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5" style={{ color: '#00c853' }} />
                ) : (
                  <Copy
                    className="w-3.5 h-3.5"
                    style={{ color: 'var(--text-tertiary)' }}
                  />
                )}
              </button>
            </div>
          </motion.div>
        </section>

        {/* ── Key Stats ── */}
        <section className="px-4 pb-16 max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-3"
          >
            {stats.map((s) => (
              // each card a DIFFERENT premium variant → the border light travels a
              // different way per card, so the row reads organic, not patterned
              <div
                key={s.label}
                className="rounded-2xl p-5 flex flex-col gap-1 overflow-hidden bg-[#0d0d0d] border border-[#1f1f1f]"
              >
                <span
                  className="text-[11px] uppercase tracking-widest font-medium"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {s.label}
                </span>
                <span className="text-2xl font-bold text-white">
                  {s.value}
                </span>
                <span
                  className="text-xs"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {s.sub}
                </span>
              </div>
            ))}
          </motion.div>
        </section>

        {/* ── Allocation ── */}
        <section className="px-4 pb-20 max-w-5xl mx-auto">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-2xl font-bold mb-8 text-white inline-block"
            style={{ animationDelay: '-1.2s' }}
          >
            {tr('allocationTitle')}
          </motion.h2>

          <motion.div
            ref={chartRef}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="rounded-2xl overflow-hidden bg-[#0d0d0d] border border-[#1f1f1f] p-6 sm:p-10"
          >
            <div
              className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center"
              style={{ overflow: 'visible' }}
            >
              {/* Donut */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="flex justify-center"
              >
                <DonutChart
                  animate={chartVisible}
                  supplyLabel={tr('donutSupply')}
                  slices={donutSlices}
                />
              </motion.div>

              {/* Bar breakdown */}
              <div className="flex flex-col gap-4">
                {allocations.map((a, i) => (
                  <motion.div
                    key={a.label}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.06, duration: 0.4 }}
                    className="relative cursor-pointer group"
                    onMouseEnter={() => setActiveAlloc(i)}
                    onMouseLeave={() => setActiveAlloc(null)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{
                            background: a.color,
                            }}
                        />
                        <span
                          className="text-sm font-medium"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {a.label}
                        </span>
                      </div>
                      <span
                        className="text-sm font-bold tabular-nums"
                        style={{ color: a.color }}
                      >
                        {a.pct}%
                      </span>
                    </div>
                    {/* Bar */}
                    <div
                      className="h-1.5 rounded-full overflow-hidden"
                      style={{ background: 'rgba(255,255,255,0.04)' }}
                    >
                      <motion.div
                        className="h-full rounded-full"
                        style={{
                          background: `linear-gradient(90deg, ${a.color}, ${a.color}cc)`,
                          boxShadow: `0 0 8px ${a.color}55`,
                        }}
                        initial={{ width: 0 }}
                        whileInView={{ width: `${a.pct}%` }}
                        viewport={{ once: true }}
                        transition={{
                          delay: i * 0.06 + 0.1,
                          duration: 0.6,
                          ease: 'easeOut',
                        }}
                      />
                    </div>
                    {/* Description tooltip — absolutely positioned, no layout shift */}
                    <div
                      className="pointer-events-none absolute left-0 right-0 z-10 transition-opacity duration-150"
                      style={{
                        top: 'calc(100% + 4px)',
                        opacity: activeAlloc === i ? 1 : 0,
                      }}
                    >
                      <span
                        className="inline-block text-[11px] px-2.5 py-1 rounded-lg"
                        style={{
                          background: '#0d0d0d',
                          border: '1px solid #1f1f1f',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {a.desc}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </section>

        {/* ── Vesting Schedule ── */}
        <section className="px-4 pb-20 max-w-5xl mx-auto">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-2xl font-bold mb-8 text-white inline-block"
            style={{ animationDelay: '-2.4s' }}
          >
            {tr('vestingTitle')}
          </motion.h2>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl overflow-hidden bg-[#0d0d0d] border border-[#1f1f1f]"
          >
            {/* Desktop table */}
            <table className="hidden sm:table w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--panel-border)' }}>
                  {vestingHeaders.map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3.5 text-left text-[11px] uppercase tracking-widest font-semibold"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vesting.map((row, i) => {
                  const alloc = allocations.find((a) => a.id === row.id)
                  return (
                    <tr
                      key={row.category}
                      className="transition-colors"
                      style={{
                        borderBottom:
                          i < vesting.length - 1
                            ? '1px solid var(--panel-border)'
                            : 'none',
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background =
                          'rgba(255,255,255,0.04)')
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = 'transparent')
                      }
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{
                              background: alloc?.color ?? '#888',
                                  }}
                          />
                          <span style={{ color: 'var(--text-primary)' }}>
                            {row.category}
                          </span>
                        </div>
                      </td>
                      <td
                        className="px-5 py-3.5"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {row.cliff}
                      </td>
                      <td
                        className="px-5 py-3.5"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {row.vesting}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={{
                            background:
                              row.tge === '100%'
                                ? 'rgba(61,107,255,0.14)'
                                : 'rgba(88,199,255,0.12)',
                            color: row.tge === '100%' ? '#22c55e' : '#4ade80',
                          }}
                        >
                          {row.tge}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Mobile card list */}
            <div
              className="sm:hidden divide-y"
              style={{ borderColor: 'var(--panel-border)' }}
            >
              {vesting.map((row) => {
                const alloc = allocations.find((a) => a.id === row.id)
                return (
                  <div key={row.category} className="px-4 py-3.5">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{
                            background: alloc?.color ?? '#888',
                              }}
                        />
                        <span
                          className="text-sm font-medium"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {row.category}
                        </span>
                      </div>
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-semibold"
                        style={{
                          background:
                            row.tge === '100%'
                              ? 'rgba(61,107,255,0.14)'
                              : 'rgba(88,199,255,0.12)',
                          color: row.tge === '100%' ? '#22c55e' : '#4ade80',
                        }}
                      >
                        {row.tge}
                      </span>
                    </div>
                    <div
                      className="flex gap-4 text-xs"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      <span>
                        {tr('vestingMobile.cliff')}:{' '}
                        <span style={{ color: 'var(--text-secondary)' }}>
                          {row.cliff}
                        </span>
                      </span>
                      <span>
                        {tr('vestingMobile.vesting')}:{' '}
                        <span style={{ color: 'var(--text-secondary)' }}>
                          {row.vesting}
                        </span>
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        </section>

        {/* ── Token Utility ── */}
        <section className="px-4 pb-20 max-w-5xl mx-auto">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-2xl font-bold mb-8 text-white inline-block"
            style={{ animationDelay: '-3.6s' }}
          >
            {tr('utilityTitle')}
          </motion.h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {utility.map((u, i) => (
              <motion.div
                key={u.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07, duration: 0.4 }}
                className="rounded-2xl p-5 flex flex-col gap-4 overflow-hidden bg-[#0d0d0d] border border-[#1f1f1f]"
              >

                {/* Number + icon row */}
                <div className="relative flex items-start justify-between">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{
                      background: '#1a1a1a',
                      color: u.color,
                      border: '1px solid rgba(255,255,255,0.07)',
                    }}
                  >
                    {u.icon}
                  </div>
                  <span
                    className="text-2xl font-black tabular-nums leading-none"
                    style={{ color: u.color, opacity: 0.22 }}
                  >
                    {u.num}
                  </span>
                </div>

                {/* Text */}
                <div className="relative flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ background: u.color }}
                    />
                    <h3
                      className="font-semibold text-[15px]"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {u.title}
                    </h3>
                  </div>
                  <p
                    className="text-xs leading-relaxed pl-3.5"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {u.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="px-4 pb-24 max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl overflow-hidden bg-[#0d0d0d] border border-[#1f1f1f] p-7 sm:p-10 flex flex-col items-center sm:flex-row sm:justify-between gap-5 text-center sm:text-left"
          >
            <div>
              <h2
                className="text-xl sm:text-2xl font-bold mb-2 flex items-center justify-center sm:justify-start gap-2.5"
                style={{ color: 'var(--text-primary)' }}
              >
                {tr('cta.titleBefore')}{' '}
                <span className="eva-shimmer">EVA</span>
                {tr('cta.titleAfter') ? ` ${tr('cta.titleAfter')}` : ''}
              </h2>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {tr('cta.subtitle')}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 flex-shrink-0">
              <a
                href="https://x.com/EvaProtocolBase"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all hover:brightness-110 whitespace-nowrap"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  color: 'var(--text-primary)',
                }}
              >
                {tr('cta.followX')}
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <a
                href="https://github.com/eva-protocol"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all hover:brightness-110 whitespace-nowrap"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  color: 'var(--text-primary)',
                }}
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                >
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                </svg>
                {tr('cta.github')}
              </a>
              <button
                onClick={() => navigate('/docs')}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all hover:brightness-110 whitespace-nowrap"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  color: 'var(--text-primary)',
                }}
              >
                {tr('cta.learnMore')}
              </button>
            </div>
          </motion.div>
        </section>
      </main>
    </div>
  )
}
