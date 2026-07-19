import { useEffect, useState, useRef } from 'react'
import { mutate } from 'swr'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Wallet01Icon,
  Coins01Icon,
  Analytics02Icon,
  Layers01Icon,
  Target01Icon,
  Robot01Icon,
  Notebook01Icon,
  ChartLineData01Icon,
  Cancel01Icon,
  ViewIcon,
  ViewOffSlashIcon,
  Copy01Icon,
  Tick02Icon,
} from '@hugeicons/core-free-icons'
import { EmptyState, StatCard, SectionHead } from '../components/dash/DashKit'
import { api } from '../lib/api'
import { ChartTabs } from '../components/ChartTabs'
import { DecisionCard } from '../components/DecisionCard'
import { PositionHistory } from '../components/PositionHistory'
import { PunkAvatar, getTraderAvatar } from '../components/PunkAvatar'
import { confirmToast, notify } from '../lib/notify'
import { formatPrice, formatQuantity } from '../utils/format'
import { t, type Language } from '../i18n/translations'
import { GridRiskPanel } from '../components/strategy/GridRiskPanel'
import type {
  SystemStatus,
  AccountInfo,
  Position,
  DecisionRecord,
  Statistics,
  TraderInfo,
  Exchange,
} from '../types'

// --- Helper Functions ---

function getModelDisplayName(modelId: string): string {
  switch (modelId.toLowerCase()) {
    case 'deepseek':
      return 'DeepSeek'
    case 'qwen':
      return 'Qwen'
    case 'claude':
      return 'Claude'
    default:
      return modelId.toUpperCase()
  }
}

function getExchangeDisplayNameFromList(
  exchangeId: string | undefined,
  exchanges: Exchange[] | undefined
): string {
  if (!exchangeId) return 'Unknown'
  const exchange = exchanges?.find((e) => e.id === exchangeId)
  if (!exchange) return exchangeId.substring(0, 8).toUpperCase() + '...'
  const typeName = exchange.exchange_type?.toUpperCase() || exchange.name
  return exchange.account_name
    ? `${typeName} · ${exchange.account_name}`
    : typeName
}

function getExchangeTypeFromList(
  exchangeId: string | undefined,
  exchanges: Exchange[] | undefined
): string {
  if (!exchangeId) return 'binance'
  const exchange = exchanges?.find((e) => e.id === exchangeId)
  if (!exchange) return 'binance'
  return exchange.exchange_type?.toLowerCase() || 'binance'
}

function isPerpDexExchange(exchangeType: string | undefined): boolean {
  if (!exchangeType) return false
  const perpDexTypes = ['hyperliquid', 'lighter', 'aster']
  return perpDexTypes.includes(exchangeType.toLowerCase())
}

function getWalletAddress(exchange: Exchange | undefined): string | undefined {
  if (!exchange) return undefined
  const type = exchange.exchange_type?.toLowerCase()
  switch (type) {
    case 'hyperliquid':
      return exchange.hyperliquidWalletAddr
    case 'lighter':
      return exchange.lighterWalletAddr
    case 'aster':
      return exchange.asterSigner
    default:
      return undefined
  }
}

function truncateAddress(address: string, startLen = 6, endLen = 4): string {
  if (address.length <= startLen + endLen + 3) return address
  return `${address.slice(0, startLen)}…${address.slice(-endLen)}`
}

// --- Page ---

interface TraderDashboardPageProps {
  selectedTrader?: TraderInfo
  traders?: TraderInfo[]
  tradersError?: Error
  selectedTraderId?: string
  onTraderSelect: (traderId: string) => void
  onNavigateToTraders: () => void
  status?: SystemStatus
  account?: AccountInfo
  positions?: Position[]
  decisions?: DecisionRecord[]
  decisionsLimit: number
  onDecisionsLimitChange: (limit: number) => void
  stats?: Statistics
  lastUpdate: string
  language: Language
  exchanges?: Exchange[]
}

export function TraderDashboardPage({
  selectedTrader,
  status,
  account,
  positions,
  decisions,
  decisionsLimit,
  onDecisionsLimitChange,
  lastUpdate,
  language,
  traders,
  tradersError,
  selectedTraderId,
  onTraderSelect,
  onNavigateToTraders,
  exchanges,
}: TraderDashboardPageProps) {
  const [closingPosition, setClosingPosition] = useState<string | null>(null)
  const [selectedChartSymbol, setSelectedChartSymbol] = useState<
    string | undefined
  >(undefined)
  const [chartUpdateKey, setChartUpdateKey] = useState<number>(0)
  const chartSectionRef = useRef<HTMLDivElement>(null)
  const [showWalletAddress, setShowWalletAddress] = useState<boolean>(false)
  const [copiedAddress, setCopiedAddress] = useState<boolean>(false)

  // Current positions pagination
  const [positionsPageSize, setPositionsPageSize] = useState<number>(20)
  const [positionsCurrentPage, setPositionsCurrentPage] = useState<number>(1)

  const totalPositions = positions?.length || 0
  const totalPositionPages = Math.ceil(totalPositions / positionsPageSize)
  const paginatedPositions =
    positions?.slice(
      (positionsCurrentPage - 1) * positionsPageSize,
      positionsCurrentPage * positionsPageSize
    ) || []

  useEffect(() => {
    setPositionsCurrentPage(1)
  }, [selectedTraderId, positionsPageSize])

  useEffect(() => {
    if (status?.strategy_type === 'grid_trading' && status?.grid_symbol) {
      setSelectedChartSymbol(status.grid_symbol)
    }
  }, [status?.strategy_type, status?.grid_symbol])

  const currentExchange = exchanges?.find(
    (e) => e.id === selectedTrader?.exchange_id
  )
  const walletAddress = getWalletAddress(currentExchange)
  const isPerpDex = isPerpDexExchange(currentExchange?.exchange_type)

  const handleCopyAddress = async () => {
    if (!walletAddress) return
    try {
      await navigator.clipboard.writeText(walletAddress)
      setCopiedAddress(true)
      setTimeout(() => setCopiedAddress(false), 2000)
    } catch (err) {
      console.error('Failed to copy address:', err)
    }
  }

  const handleSymbolClick = (symbol: string) => {
    setSelectedChartSymbol(symbol)
    setTimeout(() => {
      chartSectionRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }, 100)
  }

  const handleClosePosition = async (symbol: string, side: string) => {
    if (!selectedTraderId) return
    const confirmMsg =
      language === 'zh'
        ? `确定要平仓 ${symbol} ${side === 'LONG' ? '多仓' : '空仓'} 吗？`
        : `Are you sure you want to close ${symbol} ${side === 'LONG' ? 'LONG' : 'SHORT'} position?`
    const confirmed = await confirmToast(confirmMsg, {
      title: language === 'zh' ? '确认平仓' : 'Confirm Close',
      okText: language === 'zh' ? '确认' : 'Confirm',
      cancelText: language === 'zh' ? '取消' : 'Cancel',
    })
    if (!confirmed) return
    setClosingPosition(symbol)
    try {
      await api.closePosition(selectedTraderId, symbol, side)
      notify.success(
        language === 'zh' ? '平仓成功' : 'Position closed successfully'
      )
      await Promise.all([
        mutate(`positions-${selectedTraderId}`),
        mutate(`account-${selectedTraderId}`),
      ])
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : language === 'zh'
            ? '平仓失败'
            : 'Failed to close position'
      notify.error(errorMsg)
    } finally {
      setClosingPosition(null)
    }
  }

  // ── States: error / empty / loading ──────────────────────────────────────
  if (tradersError) {
    return (
      <EmptyState
        icon={Cancel01Icon}
        title={language === 'zh' ? '无法连接到服务器' : 'Connection Failed'}
        description={
          language === 'zh'
            ? '请确认后端服务已启动。'
            : 'Please check if the backend service is running.'
        }
        action={{
          label: language === 'zh' ? '重试' : 'Retry',
          onClick: () => window.location.reload(),
        }}
      />
    )
  }

  if (traders && traders.length === 0) {
    return (
      <EmptyState
        icon={Robot01Icon}
        title={t('dashboardEmptyTitle', language)}
        description={t('dashboardEmptyDescription', language)}
        action={{
          label: t('goToTradersPage', language),
          onClick: onNavigateToTraders,
        }}
      />
    )
  }

  if (!selectedTrader) {
    return (
      <div className="gl-data-page min-h-screen">
        <div className="w-full max-w-[1600px] mx-auto px-4 md:px-8 relative z-10 pt-6 space-y-5">
          <div className="gl-panel rounded-2xl p-6 animate-pulse">
            <div
              className="h-9 w-52 mb-3 rounded"
              style={{ background: 'var(--surface-tertiary)' }}
            />
            <div className="flex gap-3">
              {[32, 24, 28].map((w, i) => (
                <div
                  key={i}
                  className="h-4 rounded"
                  style={{
                    width: w * 4,
                    background: 'var(--surface-tertiary)',
                  }}
                />
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="gl-panel rounded-xl p-5 animate-pulse">
                <div
                  className="h-3 w-20 mb-3 rounded"
                  style={{ background: 'var(--surface-tertiary)' }}
                />
                <div
                  className="h-8 w-28 rounded"
                  style={{ background: 'var(--surface-tertiary)' }}
                />
              </div>
            ))}
          </div>
          <div className="gl-panel rounded-2xl p-6 animate-pulse">
            <div
              className="h-64 w-full rounded"
              style={{ background: 'var(--surface-tertiary)' }}
            />
          </div>
        </div>
      </div>
    )
  }

  const isRunning = status?.is_running ?? false
  const equityPositive = (account?.total_pnl ?? 0) > 0
  const pnlPositive = (account?.total_pnl ?? 0) >= 0

  return (
    <div className="gl-data-page min-h-screen pb-16">
      <div className="w-full max-w-[1600px] mx-auto px-4 md:px-8 relative z-10 pt-6">
        {/* ── Trader identity bar ── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="gl-metal-panel rounded-2xl p-4 sm:p-5 mb-5"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* identity */}
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="relative shrink-0">
                <div
                  className="rounded-xl overflow-hidden"
                  style={{
                    border: '1px solid #1f1f1f',
                    boxShadow: 'none',
                    lineHeight: 0,
                  }}
                >
                  <PunkAvatar
                    seed={getTraderAvatar(
                      selectedTrader.trader_id,
                      selectedTrader.trader_name
                    )}
                    size={52}
                    className="block"
                  />
                </div>
                <span
                  className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2"
                  style={{
                    background: isRunning ? '#0ECB81' : 'var(--text-disabled)',
                    borderColor: 'var(--surface-primary)',
                    boxShadow: isRunning
                      ? '0 0 9px rgba(14,203,129,0.9)'
                      : 'none',
                    animation: isRunning
                      ? 'pulse-glow 1.8s ease-in-out infinite'
                      : 'none',
                  }}
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-xl sm:text-2xl font-bold tracking-tight gl-metal-text leading-none">
                    {selectedTrader.trader_name}
                  </span>
                  <span className="dash-live">
                    <span
                      className="dash-live-dot"
                      style={
                        !isRunning
                          ? {
                              background: 'var(--text-disabled)',
                              boxShadow: 'none',
                              animation: 'none',
                            }
                          : undefined
                      }
                    />
                    {isRunning
                      ? language === 'zh'
                        ? '运行中'
                        : 'Live'
                      : language === 'zh'
                        ? '已停止'
                        : 'Idle'}
                  </span>
                </div>
                <div
                  className="mt-1.5 text-[11px] font-mono"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  ID: {selectedTrader.trader_id.slice(0, 8)}… ·{' '}
                  {language === 'zh' ? '更新' : 'Updated'} {lastUpdate}
                </div>
              </div>
            </div>

            {/* controls */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {exchanges && isPerpDex && (
                <div className="dash-chip" style={{ gap: 8 }}>
                  {walletAddress ? (
                    <>
                      <span
                        className="font-mono"
                        style={{
                          color: 'var(--accent-primary)',
                          maxWidth: 150,
                        }}
                      >
                        {showWalletAddress
                          ? walletAddress
                          : truncateAddress(walletAddress)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowWalletAddress(!showWalletAddress)}
                        className="opacity-70 hover:opacity-100 transition-opacity"
                        title={
                          showWalletAddress
                            ? language === 'zh'
                              ? '隐藏地址'
                              : 'Hide address'
                            : language === 'zh'
                              ? '显示完整地址'
                              : 'Show full address'
                        }
                      >
                        <HugeiconsIcon
                          icon={showWalletAddress ? ViewOffSlashIcon : ViewIcon}
                          size={14}
                          strokeWidth={1.9}
                        />
                      </button>
                      <button
                        type="button"
                        onClick={handleCopyAddress}
                        className="opacity-70 hover:opacity-100 transition-opacity"
                        title={language === 'zh' ? '复制地址' : 'Copy address'}
                      >
                        <HugeiconsIcon
                          icon={copiedAddress ? Tick02Icon : Copy01Icon}
                          size={14}
                          strokeWidth={1.9}
                          style={
                            copiedAddress
                              ? { color: 'var(--binance-green)' }
                              : undefined
                          }
                        />
                      </button>
                    </>
                  ) : (
                    <span style={{ color: 'var(--text-tertiary)' }}>
                      {language === 'zh' ? '未配置地址' : 'No address'}
                    </span>
                  )}
                </div>
              )}
              {traders && traders.length > 0 && (
                <select
                  value={selectedTraderId}
                  onChange={(e) => onTraderSelect(e.target.value)}
                  className="dash-select"
                  aria-label={
                    language === 'zh' ? '选择交易员' : 'Select trader'
                  }
                >
                  {traders.map((trader) => (
                    <option key={trader.trader_id} value={trader.trader_id}>
                      {trader.trader_name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* metadata chips */}
          <div
            className="flex items-center gap-2 flex-wrap mt-4 pt-4"
            style={{ borderTop: '1px solid var(--panel-border)' }}
          >
            <span className="dash-chip">
              <HugeiconsIcon icon={Robot01Icon} size={13} strokeWidth={1.9} />
              {language === 'zh' ? 'AI 模型' : 'AI Model'}
              <span className="dash-chip-val">
                {getModelDisplayName(
                  selectedTrader.ai_model.split('_').pop() ||
                    selectedTrader.ai_model
                )}
              </span>
            </span>
            <span className="dash-chip">
              <HugeiconsIcon icon={Coins01Icon} size={13} strokeWidth={1.9} />
              {language === 'zh' ? '交易所' : 'Exchange'}
              <span className="dash-chip-val">
                {getExchangeDisplayNameFromList(
                  selectedTrader.exchange_id,
                  exchanges
                )}
              </span>
            </span>
            <span className="dash-chip">
              <HugeiconsIcon icon={Target01Icon} size={13} strokeWidth={1.9} />
              {language === 'zh' ? '策略' : 'Strategy'}
              <span
                className="dash-chip-val"
                style={{ color: 'var(--accent-primary)' }}
              >
                {selectedTrader.strategy_name ||
                  (language === 'zh' ? '无' : 'None')}
              </span>
            </span>
            {status && (
              <>
                <span className="dash-chip">
                  {language === 'zh' ? '周期' : 'Cycles'}
                  <span className="dash-chip-val">{status.call_count}</span>
                </span>
                <span className="dash-chip">
                  {language === 'zh' ? '运行' : 'Runtime'}
                  <span className="dash-chip-val">
                    {status.runtime_minutes}m
                  </span>
                </span>
              </>
            )}
          </div>
        </motion.div>

        {/* ── KPI cards ── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-5"
        >
          <StatCard
            title={t('totalEquity', language)}
            value={account?.total_equity?.toFixed(2) || '0.00'}
            unit="USDT"
            change={account?.total_pnl_pct || 0}
            positive={equityPositive}
            icon={Wallet01Icon}
          />
          <StatCard
            title={t('availableBalance', language)}
            value={account?.available_balance?.toFixed(2) || '0.00'}
            unit="USDT"
            subtitle={`${account?.available_balance && account?.total_equity ? ((account.available_balance / account.total_equity) * 100).toFixed(1) : '0.0'}% ${t('free', language)}`}
            icon={Coins01Icon}
          />
          <StatCard
            title={t('totalPnL', language)}
            value={`${account?.total_pnl !== undefined && account.total_pnl >= 0 ? '+' : ''}${account?.total_pnl?.toFixed(2) || '0.00'}`}
            unit="USDT"
            change={account?.total_pnl_pct || 0}
            positive={pnlPositive}
            icon={Analytics02Icon}
          />
          <StatCard
            title={t('positions', language)}
            value={`${account?.position_count || 0}`}
            unit={t('active', language).toUpperCase()}
            subtitle={`${t('margin', language)}: ${account?.margin_used_pct?.toFixed(1) || '0.0'}%`}
            icon={Layers01Icon}
          />
        </motion.div>

        {/* Grid Risk Panel — grid trading only */}
        {status?.strategy_type === 'grid_trading' && selectedTraderId && (
          <div className="mb-5">
            <GridRiskPanel
              traderId={selectedTraderId}
              language={language}
              refreshInterval={5000}
            />
          </div>
        )}

        {/* ── Main content: charts + positions | decisions ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
          {/* Left */}
          <div className="space-y-5 min-w-0">
            {/* Chart */}
            <div
              ref={chartSectionRef}
              className="gl-aurora-panel rounded-2xl overflow-hidden scroll-mt-28"
            >
              <SectionHead
                icon={ChartLineData01Icon}
                title={language === 'zh' ? '权益 & 行情' : 'Equity & Market'}
                delay="-1.2s"
              />
              <div className="p-3 sm:p-4">
                <ChartTabs
                  traderId={selectedTrader.trader_id}
                  selectedSymbol={selectedChartSymbol}
                  updateKey={chartUpdateKey}
                  exchangeId={getExchangeTypeFromList(
                    selectedTrader.exchange_id,
                    exchanges
                  )}
                />
              </div>
            </div>

            {/* Positions */}
            <div className="gl-prism-panel rounded-2xl overflow-hidden">
              <SectionHead
                icon={Target01Icon}
                title={t('currentPositions', language)}
                delay="-2.4s"
                right={
                  positions && positions.length > 0 ? (
                    <span
                      className="text-[11px] font-bold px-2.5 py-1 rounded-lg tabular-nums"
                      style={{
                        color: 'var(--accent-primary)',
                        background: 'var(--accent-primary-bg)',
                        border: '1px solid var(--accent-primary-border)',
                      }}
                    >
                      {positions.length} {t('active', language)}
                    </span>
                  ) : undefined
                }
              />
              {positions && positions.length > 0 ? (
                <div>
                  <div className="overflow-x-auto dash-scroll">
                    <table className="w-full text-xs min-w-[460px]">
                      <thead>
                        <tr
                          style={{
                            borderBottom: '1px solid var(--panel-border)',
                          }}
                        >
                          <th
                            className="px-3 sm:px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider"
                            style={{ color: 'var(--text-tertiary)' }}
                          >
                            {t('symbol', language)}
                          </th>
                          <th
                            className="px-2 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wider"
                            style={{ color: 'var(--text-tertiary)' }}
                          >
                            {t('side', language)}
                          </th>
                          <th
                            className="px-2 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider hidden md:table-cell"
                            style={{ color: 'var(--text-tertiary)' }}
                          >
                            {language === 'zh' ? '入场价' : 'Entry'}
                          </th>
                          <th
                            className="px-2 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider hidden md:table-cell"
                            style={{ color: 'var(--text-tertiary)' }}
                          >
                            {language === 'zh' ? '标记价' : 'Mark'}
                          </th>
                          <th
                            className="px-2 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider"
                            style={{ color: 'var(--text-tertiary)' }}
                          >
                            {language === 'zh' ? '数量' : 'Qty'}
                          </th>
                          <th
                            className="px-2 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wider hidden lg:table-cell"
                            style={{ color: 'var(--text-tertiary)' }}
                          >
                            {language === 'zh' ? '杠杆' : 'Lev.'}
                          </th>
                          <th
                            className="px-2 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider"
                            style={{ color: 'var(--text-tertiary)' }}
                          >
                            {language === 'zh' ? '盈亏' : 'uPnL'}
                          </th>
                          <th
                            className="px-3 sm:px-4 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wider"
                            style={{ color: 'var(--text-tertiary)' }}
                          >
                            {language === 'zh' ? '操作' : 'Action'}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedPositions.map((pos, i) => {
                          const up = pos.unrealized_pnl >= 0
                          return (
                            <tr
                              key={i}
                              className="dash-prow"
                              style={{
                                borderBottom: '1px solid var(--panel-border)',
                              }}
                              onClick={() => {
                                setSelectedChartSymbol(pos.symbol)
                                setChartUpdateKey(Date.now())
                                chartSectionRef.current?.scrollIntoView({
                                  behavior: 'smooth',
                                  block: 'start',
                                })
                              }}
                            >
                              <td
                                className="px-3 sm:px-4 py-3 font-mono font-semibold text-left whitespace-nowrap"
                                style={{ color: 'var(--text-primary)' }}
                              >
                                {pos.symbol}
                              </td>
                              <td className="px-2 py-3 text-center whitespace-nowrap">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${pos.side === 'long' ? 'dash-side-long' : 'dash-side-short'}`}
                                >
                                  {t(
                                    pos.side === 'long' ? 'long' : 'short',
                                    language
                                  )}
                                </span>
                              </td>
                              <td
                                className="px-2 py-3 font-mono text-right whitespace-nowrap hidden md:table-cell"
                                style={{ color: 'var(--text-secondary)' }}
                              >
                                {formatPrice(pos.entry_price)}
                              </td>
                              <td
                                className="px-2 py-3 font-mono text-right whitespace-nowrap hidden md:table-cell"
                                style={{ color: 'var(--text-secondary)' }}
                              >
                                {formatPrice(pos.mark_price)}
                              </td>
                              <td
                                className="px-2 py-3 font-mono text-right whitespace-nowrap"
                                style={{ color: 'var(--text-primary)' }}
                              >
                                {formatQuantity(pos.quantity)}
                              </td>
                              <td
                                className="px-2 py-3 font-mono text-center whitespace-nowrap hidden lg:table-cell"
                                style={{ color: 'var(--accent-primary)' }}
                              >
                                {pos.leverage}x
                              </td>
                              <td
                                className="px-2 py-3 font-mono font-bold text-right whitespace-nowrap tabular-nums"
                                style={{
                                  color: up
                                    ? 'var(--binance-green)'
                                    : 'var(--binance-red)',
                                }}
                              >
                                {up ? '+' : ''}
                                {pos.unrealized_pnl.toFixed(2)}
                              </td>
                              <td className="px-3 sm:px-4 py-3 text-center whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleClosePosition(
                                      pos.symbol,
                                      pos.side.toUpperCase()
                                    )
                                  }}
                                  disabled={closingPosition === pos.symbol}
                                  className="dash-close-btn"
                                  title={
                                    language === 'zh'
                                      ? '平仓'
                                      : 'Close Position'
                                  }
                                >
                                  {closingPosition === pos.symbol ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <HugeiconsIcon
                                      icon={Cancel01Icon}
                                      size={12}
                                      strokeWidth={2.4}
                                    />
                                  )}
                                  {language === 'zh' ? '平仓' : 'Close'}
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  {totalPositions > 10 && (
                    <div
                      className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs"
                      style={{
                        borderTop: '1px solid var(--panel-border)',
                        color: 'var(--text-tertiary)',
                      }}
                    >
                      <span>
                        {language === 'zh'
                          ? `显示 ${paginatedPositions.length} / ${totalPositions}`
                          : `Showing ${paginatedPositions.length} of ${totalPositions}`}
                      </span>
                      <div className="flex items-center gap-3">
                        <select
                          value={positionsPageSize}
                          onChange={(e) =>
                            setPositionsPageSize(Number(e.target.value))
                          }
                          className="dash-select"
                          style={{
                            padding: '5px 28px 5px 10px',
                            fontSize: 11.5,
                          }}
                        >
                          <option value={20}>20</option>
                          <option value={50}>50</option>
                          <option value={100}>100</option>
                        </select>
                        {totalPositionPages > 1 && (
                          <div className="flex items-center gap-1">
                            {[
                              '«',
                              '‹',
                              `${positionsCurrentPage} / ${totalPositionPages}`,
                              '›',
                              '»',
                            ].map((label, idx) => {
                              if (idx === 2)
                                return (
                                  <span
                                    key={idx}
                                    className="px-2 tabular-nums"
                                    style={{ color: 'var(--text-primary)' }}
                                  >
                                    {label}
                                  </span>
                                )
                              let onClick = () => {}
                              let disabled = false
                              if (idx === 0) {
                                onClick = () => setPositionsCurrentPage(1)
                                disabled = positionsCurrentPage === 1
                              }
                              if (idx === 1) {
                                onClick = () =>
                                  setPositionsCurrentPage((p) =>
                                    Math.max(1, p - 1)
                                  )
                                disabled = positionsCurrentPage === 1
                              }
                              if (idx === 3) {
                                onClick = () =>
                                  setPositionsCurrentPage((p) =>
                                    Math.min(totalPositionPages, p + 1)
                                  )
                                disabled =
                                  positionsCurrentPage === totalPositionPages
                              }
                              if (idx === 4) {
                                onClick = () =>
                                  setPositionsCurrentPage(totalPositionPages)
                                disabled =
                                  positionsCurrentPage === totalPositionPages
                              }
                              return (
                                <button
                                  key={idx}
                                  onClick={onClick}
                                  disabled={disabled}
                                  className="dash-page-btn"
                                >
                                  {label}
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-14 px-6">
                  <div
                    className="dash-ico mx-auto mb-4"
                    style={{ width: 52, height: 52, borderRadius: 14 }}
                  >
                    <HugeiconsIcon
                      icon={Target01Icon}
                      size={24}
                      strokeWidth={1.6}
                    />
                  </div>
                  <div
                    className="text-base font-semibold mb-1"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {t('noPositions', language)}
                  </div>
                  <div
                    className="text-sm"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    {t('noActivePositions', language)}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Decisions */}
          <div
            className="gl-onyx-panel rounded-2xl overflow-hidden h-fit lg:sticky lg:top-24 flex flex-col"
            style={{ maxHeight: 'calc(100vh - 110px)' }}
          >
            <SectionHead
              icon={Robot01Icon}
              title={t('recentDecisions', language)}
              delay="-3.6s"
              right={
                <select
                  value={decisionsLimit}
                  onChange={(e) =>
                    onDecisionsLimitChange(Number(e.target.value))
                  }
                  className="dash-select"
                  style={{ padding: '5px 28px 5px 10px', fontSize: 11.5 }}
                >
                  {[5, 10, 20, 50, 100].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              }
            />
            <div className="space-y-3.5 overflow-y-auto p-4 dash-scroll">
              {decisions && decisions.length > 0 ? (
                decisions.map((decision, i) => (
                  <DecisionCard
                    key={i}
                    decision={decision}
                    language={language}
                    onSymbolClick={handleSymbolClick}
                  />
                ))
              ) : (
                <div className="text-center py-14">
                  <div
                    className="dash-ico mx-auto mb-4"
                    style={{ width: 52, height: 52, borderRadius: 14 }}
                  >
                    <HugeiconsIcon
                      icon={Robot01Icon}
                      size={24}
                      strokeWidth={1.6}
                    />
                  </div>
                  <div
                    className="text-base font-semibold mb-1"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {t('noDecisionsYet', language)}
                  </div>
                  <div
                    className="text-sm"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    {t('aiDecisionsWillAppear', language)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Position history ── */}
        {selectedTraderId && (
          <div className="gl-onyx-panel-b rounded-2xl overflow-hidden">
            <SectionHead
              icon={Notebook01Icon}
              title={t('positionHistory.title', language)}
              delay="-4.8s"
            />
            <div className="p-4 sm:p-5">
              <PositionHistory traderId={selectedTraderId} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
