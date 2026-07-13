import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Wallet } from 'lucide-react'
import { useAppKit } from '@reown/appkit/react'
import HeaderBar from '../components/HeaderBar'
import { goTo } from '../lib/nav'
import { UpgradeDeepThinkPanel } from '../components/UpgradeDeepThinkPanel'
import { UpgradeWhitelistPanel } from '../components/UpgradeWhitelistPanel'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { t } from '../i18n/translations'
import { useOkoHolderGate } from '../hooks/useOkoHolderGate'
import {
  EVA_BASE_TOKEN_ADDRESS,
  isEvaTokenConfigured,
} from '../lib/upgradeConfig'
import {
  getWhitelistEntries,
  type WhitelistEntry,
} from '../lib/upgradeWhitelist'

export function UpgradePage() {
  const { open } = useAppKit()
  const { language, setLanguage } = useLanguage()
  const { user, token, logout } = useAuth()
  const gate = useOkoHolderGate()
  const [whitelistOpen, setWhitelistOpen] = useState(false)
  const [whitelistEntries, setWhitelistEntries] = useState<WhitelistEntry[]>([])
  const tokenConfigured = useMemo(() => isEvaTokenConfigured(), [])

  const tr = (key: string, params?: Record<string, string | number>) =>
    t(`upgradePage.${key}`, language, params)

  useEffect(() => {
    getWhitelistEntries()
      .then(setWhitelistEntries)
      .catch(() => setWhitelistEntries([]))
  }, [])

  const navigate = (path: string) => goTo(path) // SPA nav (no full reload)

  const progressPct = Math.min(
    100,
    gate.threshold > 0 ? (gate.totalBalance / gate.threshold) * 100 : 0
  )

  const gateHeadline =
    gate.status === 'eligible'
      ? tr('gate.eligible')
      : gate.status === 'unconfigured'
        ? tr('gate.unconfigured')
        : gate.status === 'error'
          ? tr('gate.error')
          : gate.status === 'checking'
            ? tr('gate.checking')
            : gate.status === 'disconnected'
              ? tr('gate.disconnected')
              : tr('gate.needMore')

  const gateSubcopy =
    gate.status === 'unconfigured'
      ? tr('gateSub.unconfigured')
      : gate.status === 'error'
        ? gate.error || tr('gateSub.error')
        : gate.status === 'eligible'
          ? tr('gateSub.eligible')
          : tr('gateSub.default')

  const contractAddress = `${EVA_BASE_TOKEN_ADDRESS.slice(0, 6)}…${EVA_BASE_TOKEN_ADDRESS.slice(-4)}`

  return (
    <div
      className="min-h-screen relative gl-data-page"
      style={{ color: 'var(--text-primary)', background: '#000000' }}
    >
      <HeaderBar
        isLoggedIn={!!(user && token)}
        currentPage="upgrade"
        language={language}
        onLanguageChange={setLanguage}
        user={user}
        onLogout={logout}
        onLoginRequired={() => {}}
        onPageChange={(page) => navigate(`/${page}`)}
      />

      <main className="pt-16 relative z-10">
        <section className="relative overflow-hidden px-4 py-20 sm:py-28">
          <div className="absolute inset-0 pointer-events-none" />

          <div className="max-w-6xl mx-auto relative z-10 space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="max-w-3xl"
            >
              <h1
                className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight whitespace-nowrap"
                style={{ letterSpacing: '-0.04em' }}
              >
                {tr('heroTitleBefore')}{' '}
                <span className="eva-shimmer">EVA</span>
                {tr('heroTitleAfter') ? ` ${tr('heroTitleAfter')}` : ''}
              </h1>
              <p
                className="text-lg mt-5 leading-relaxed whitespace-nowrap"
                style={{ color: 'var(--text-secondary)' }}
              >
                {tr('heroSubtitle')}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.08 }}
              className="grid grid-cols-1 gap-6"
            >
              <div className="rounded-2xl p-6 sm:p-7 overflow-hidden bg-[#0d0d0d] border border-[#1f1f1f]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div
                      className="text-xs uppercase tracking-[0.24em] mb-2"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      {tr('eligibility')}
                    </div>
                    <h2 className="text-2xl font-semibold text-white">
                      {gateHeadline}
                    </h2>
                  </div>
                  <div
                    className="rounded-full px-3 py-1.5 text-xs flex items-center gap-1.5"
                    style={{
                      background: gate.isEligible
                        ? 'rgba(16,203,129,0.10)'
                        : 'rgba(255,255,255,0.035)',
                      border: `1px solid ${gate.isEligible ? 'rgba(16,203,129,0.30)' : 'rgba(255,255,255,0.10)'}`,
                    }}
                  >
                    <span
                      className={`gl-gate-label${gate.isEligible ? ' gl-gate-label--unlocked' : ''}`}
                    >
                      {gate.isEligible ? tr('eligible') : tr('locked')}
                    </span>
                  </div>
                </div>

                <p
                  className="text-sm mt-3 leading-relaxed max-w-2xl"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {gateSubcopy}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
                  <MetricCard
                    label={tr('wallet')}
                    value={
                      gate.address
                        ? `${gate.address.slice(0, 6)}…${gate.address.slice(-4)}`
                        : '—'
                    }
                  />
                  <MetricCard
                    label={tr('currentEva')}
                    value={gate.totalBalance.toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}
                  />
                  <MetricCard
                    label={tr('threshold')}
                    value={gate.threshold.toLocaleString()}
                  />
                </div>

                <div className="mt-5">
                  <div
                    className="flex items-center justify-between text-xs mb-2"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    <span>{tr('progress')}</span>
                    <span>{progressPct.toFixed(1)}%</span>
                  </div>
                  <div
                    className="w-full h-2.5 rounded-full overflow-hidden"
                    style={{ background: 'rgba(255,255,255,0.05)' }}
                  >
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${progressPct}%`,
                        background: gate.isEligible
                          ? 'linear-gradient(90deg, #0ea968, #10cb81)'
                          : 'linear-gradient(90deg, #15803d, #10cb81)',
                      }}
                    />
                  </div>
                  {!gate.isEligible && gate.status !== 'unconfigured' ? (
                    <div
                      className="text-xs mt-2"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      {tr('remaining', {
                        amount: gate.missingBalance.toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        }),
                      })}
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-3 mt-6">
                  {!gate.isConnected ? (
                    <button
                      onClick={() => open()}
                      className="rounded-2xl px-4 py-3 text-sm font-semibold inline-flex items-center gap-2 transition-all hover:brightness-110"
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.10)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      <Wallet className="w-4 h-4" />
                      {tr('connectWallet')}
                    </button>
                  ) : null}
                  <span
                    className="text-xs"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    {tokenConfigured
                      ? tr('contractConfigured', { address: contractAddress })
                      : tr('contractPending')}
                  </span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.14 }}
              className="grid grid-cols-1 gap-6"
            >
              <UpgradeDeepThinkPanel
                eligible={gate.isEligible}
                language={language}
                whitelistEntries={whitelistEntries}
                onOpenWhitelist={() => setWhitelistOpen(true)}
              />
            </motion.div>
          </div>
        </section>
      </main>

      <UpgradeWhitelistPanel
        open={whitelistOpen}
        language={language}
        onClose={() => setWhitelistOpen(false)}
        onEntriesChange={setWhitelistEntries}
      />
    </div>
  )
}

function MetricCard({
  label,
  value,
  compact = false,
}: {
  label: string
  value: string
  compact?: boolean
}) {
  return (
    <div className="rounded-2xl px-4 py-3 overflow-hidden bg-[#0d0d0d] border border-[#1f1f1f]">
      <div
        className="text-[11px] uppercase tracking-[0.18em]"
        style={{ color: 'var(--text-tertiary)' }}
      >
        {label}
      </div>
      <div
        className={`${compact ? 'text-sm' : 'text-lg'} font-semibold mt-2 break-words text-white`}
      >
        {value}
      </div>
    </div>
  )
}
