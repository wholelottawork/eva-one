import { useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import useSWR from 'swr'
import { api } from '../lib/api'
import { useLanguage } from '../contexts/LanguageContext'
import { useAuth } from '../contexts/AuthContext'
import { t } from '../i18n/translations'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  AlertCircleIcon,
  ChartLineData01Icon,
  DollarCircleIcon,
  PercentSquareIcon,
  ArrowUpRight01Icon,
  ArrowDownRight01Icon,
} from '@hugeicons/core-free-icons'

function getCssVar(name: string): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim()
}

interface EquityPoint {
  timestamp: string
  total_equity: number
  pnl: number
  pnl_pct: number
  cycle_number: number
}

interface EquityChartProps {
  traderId?: string
  embedded?: boolean // 嵌入模式（不显示外层卡片）
}

export function EquityChart({ traderId, embedded = false }: EquityChartProps) {
  const { language } = useLanguage()
  const { user, token } = useAuth()
  const [displayMode, setDisplayMode] = useState<'dollar' | 'percent'>('dollar')

  const {
    data: history,
    error,
    isLoading,
  } = useSWR<EquityPoint[]>(
    user && token && traderId ? `equity-history-${traderId}` : null,
    () => api.getEquityHistory(traderId),
    {
      refreshInterval: 30000, // 30秒刷新（历史数据更新频率较低）
      revalidateOnFocus: false,
      dedupingInterval: 20000,
    }
  )

  const { data: account } = useSWR(
    user && token && traderId ? `account-${traderId}` : null,
    () => api.getAccount(traderId),
    {
      refreshInterval: 15000, // 15秒刷新（配合后端缓存）
      revalidateOnFocus: false,
      dedupingInterval: 10000,
    }
  )

  // Loading state - show skeleton
  if (isLoading) {
    return (
      <div
        className={
          embedded ? '' : 'gl-aurora-panel rounded-2xl overflow-hidden'
        }
      >
        <div className="p-5 sm:p-6">
          {!embedded && (
            <h3 className="gl-metal-shine text-base sm:text-lg font-bold mb-5">
              {t('accountEquityCurve', language)}
            </h3>
          )}
          <div className="animate-pulse space-y-3">
            <div className="gl-panel h-10 w-1/2 rounded-xl" />
            <div className="gl-panel h-64 w-full rounded-2xl" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="gl-panel h-14 rounded-xl" />
              <div className="gl-panel h-14 rounded-xl" />
              <div className="gl-panel h-14 rounded-xl" />
              <div className="gl-panel h-14 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div
        className={
          embedded ? '' : 'gl-aurora-panel rounded-2xl overflow-hidden'
        }
      >
        <div className="p-5 sm:p-6">
          <div
            className="flex items-center gap-3 p-4 rounded-xl"
            style={{
              background: 'rgba(246, 70, 93, 0.08)',
              border: '1px solid rgba(246, 70, 93, 0.25)',
            }}
          >
            <span className="dash-ico shrink-0" style={{ color: '#F6465D' }}>
              <HugeiconsIcon
                icon={AlertCircleIcon}
                size={18}
                strokeWidth={1.9}
              />
            </span>
            <div>
              <div className="font-semibold" style={{ color: '#F6465D' }}>
                {t('loadingError', language)}
              </div>
              <div
                className="text-sm"
                style={{ color: 'var(--text-secondary)' }}
              >
                {error.message}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 过滤掉无效数据：total_equity为0或小于1的数据点（API失败导致）
  const validHistory = history?.filter((point) => point.total_equity > 1) || []

  if (!validHistory || validHistory.length === 0) {
    return (
      <div
        className={
          embedded ? '' : 'gl-aurora-panel rounded-2xl overflow-hidden'
        }
      >
        <div className="p-5 sm:p-6">
          {!embedded && (
            <h3 className="gl-metal-shine text-base sm:text-lg font-bold mb-5">
              {t('accountEquityCurve', language)}
            </h3>
          )}
          <div
            className="text-center py-16"
            style={{ color: 'var(--text-secondary)' }}
          >
            <div className="mb-4 flex justify-center">
              <span className="dash-kpi-ico">
                <HugeiconsIcon
                  icon={ChartLineData01Icon}
                  size={28}
                  strokeWidth={1.7}
                />
              </span>
            </div>
            <div className="gl-metal-text text-lg font-bold mb-2">
              {t('noHistoricalData', language)}
            </div>
            <div className="text-sm">{t('dataWillAppear', language)}</div>
          </div>
        </div>
      </div>
    )
  }

  // 限制显示最近的数据点（性能优化）
  // 如果数据超过2000个点，只显示最近2000个
  const MAX_DISPLAY_POINTS = 2000
  const displayHistory =
    validHistory.length > MAX_DISPLAY_POINTS
      ? validHistory.slice(-MAX_DISPLAY_POINTS)
      : validHistory

  // 计算初始余额（优先从 account 获取配置的初始余额，备选从历史数据反推）
  const initialBalance =
    account?.initial_balance || // 从交易员配置读取真实初始余额
    (validHistory[0]
      ? validHistory[0].total_equity - validHistory[0].pnl
      : undefined) || // 备选：淨值 - 盈亏
    1000 // 默认值（与创建交易员时的默认配置一致）

  // 转换数据格式
  const chartData = displayHistory.map((point) => {
    const pnl = point.total_equity - initialBalance
    const pnlPct = ((pnl / initialBalance) * 100).toFixed(2)
    return {
      time: new Date(point.timestamp).toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      value: displayMode === 'dollar' ? point.total_equity : parseFloat(pnlPct),
      cycle: point.cycle_number,
      raw_equity: point.total_equity,
      raw_pnl: pnl,
      raw_pnl_pct: parseFloat(pnlPct),
    }
  })

  const currentValue = chartData[chartData.length - 1]
  const isProfit = currentValue.raw_pnl >= 0

  // 计算Y轴范围
  const calculateYDomain = () => {
    if (displayMode === 'percent') {
      // 百分比模式：找到最大最小值，留20%余量
      const values = chartData.map((d) => d.value)
      const minVal = Math.min(...values)
      const maxVal = Math.max(...values)
      const range = Math.max(Math.abs(maxVal), Math.abs(minVal))
      const padding = Math.max(range * 0.2, 1) // 至少留1%余量
      return [Math.floor(minVal - padding), Math.ceil(maxVal + padding)]
    } else {
      // 美元模式：以初始余额为基准，上下留10%余量
      const values = chartData.map((d) => d.value)
      const minVal = Math.min(...values, initialBalance)
      const maxVal = Math.max(...values, initialBalance)
      const range = maxVal - minVal
      const padding = Math.max(range * 0.15, initialBalance * 0.01) // 至少留1%余量
      return [Math.floor(minVal - padding), Math.ceil(maxVal + padding)]
    }
  }

  // 自定义Tooltip - Binance Style
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div
          className="rounded-xl p-3"
          style={{
            background:
              'linear-gradient(160deg, rgba(28,33,48,0.96), rgba(14,17,26,0.96))',
            border: '1px solid rgba(120,150,255,0.22)',
            boxShadow:
              '0 10px 30px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)',
            backdropFilter: 'blur(6px)',
          }}
        >
          <div
            className="text-[11px] mb-1 uppercase tracking-wider"
            style={{ color: 'var(--text-tertiary)' }}
          >
            Cycle #{data.cycle}
          </div>
          <div
            className="font-bold tabular-nums gl-metal-text"
            style={{ color: 'var(--text-primary)' }}
          >
            {data.raw_equity.toFixed(2)} USDT
          </div>
          <div
            className="text-sm tabular-nums font-bold"
            style={{ color: data.raw_pnl >= 0 ? '#0ECB81' : '#F6465D' }}
          >
            {data.raw_pnl >= 0 ? '+' : ''}
            {data.raw_pnl.toFixed(2)} USDT ({data.raw_pnl_pct >= 0 ? '+' : ''}
            {data.raw_pnl_pct}%)
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div
      className={
        embedded
          ? ''
          : 'gl-aurora-panel rounded-2xl overflow-hidden animate-fade-in'
      }
    >
      <div className="p-4 sm:p-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div className="flex-1">
            {!embedded && (
              <div className="flex items-center gap-2.5 mb-3">
                <span className="dash-ico">
                  <HugeiconsIcon
                    icon={ChartLineData01Icon}
                    size={16}
                    strokeWidth={1.9}
                  />
                </span>
                <h3 className="gl-metal-shine text-base sm:text-lg font-bold">
                  {t('accountEquityCurve', language)}
                </h3>
              </div>
            )}
            <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-4">
              <span className="gl-metal-text text-2xl sm:text-3xl font-bold tabular-nums">
                {account?.total_equity.toFixed(2) || '0.00'}
                <span
                  className="text-base sm:text-lg ml-1 font-semibold"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  USDT
                </span>
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="text-sm sm:text-base font-bold tabular-nums px-2.5 sm:px-3 py-1 rounded-lg flex items-center gap-1"
                  style={{
                    color: isProfit ? '#0ECB81' : '#F6465D',
                    background: isProfit
                      ? 'rgba(14, 203, 129, 0.1)'
                      : 'rgba(246, 70, 93, 0.1)',
                    border: `1px solid ${
                      isProfit
                        ? 'rgba(14, 203, 129, 0.28)'
                        : 'rgba(246, 70, 93, 0.28)'
                    }`,
                    boxShadow: `inset 0 1px 0 rgba(255,255,255,0.05), 0 2px 10px ${
                      isProfit
                        ? 'rgba(14,203,129,0.12)'
                        : 'rgba(246,70,93,0.12)'
                    }`,
                  }}
                >
                  <HugeiconsIcon
                    icon={isProfit ? ArrowUpRight01Icon : ArrowDownRight01Icon}
                    size={15}
                    strokeWidth={2.2}
                  />
                  {isProfit ? '+' : ''}
                  {currentValue.raw_pnl_pct}%
                </span>
                <span
                  className="text-xs sm:text-sm tabular-nums"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  ({isProfit ? '+' : ''}
                  {currentValue.raw_pnl.toFixed(2)} USDT)
                </span>
              </div>
            </div>
          </div>

          {/* Display Mode Toggle */}
          <div className="gl-seg self-start sm:self-auto">
            <button
              onClick={() => setDisplayMode('dollar')}
              data-active={displayMode === 'dollar'}
              className="gl-seg-item flex items-center gap-1.5"
            >
              <HugeiconsIcon
                icon={DollarCircleIcon}
                size={15}
                strokeWidth={1.9}
              />{' '}
              USDT
            </button>
            <button
              onClick={() => setDisplayMode('percent')}
              data-active={displayMode === 'percent'}
              className="gl-seg-item flex items-center gap-1.5"
            >
              <HugeiconsIcon
                icon={PercentSquareIcon}
                size={15}
                strokeWidth={1.9}
              />{' '}
              %
            </button>
          </div>
        </div>

        {/* Chart */}
        <div
          className="my-2 gl-onyx-panel"
          style={{
            borderRadius: '16px',
            overflow: 'hidden',
            position: 'relative',
            padding: '8px 4px 0',
          }}
        >
          {/* EVA Watermark */}
          <div
            style={{
              position: 'absolute',
              top: '14px',
              right: '16px',
              fontSize: '20px',
              fontWeight: 'bold',
              letterSpacing: '0.18em',
              color: 'rgba(120,150,255,0.16)',
              zIndex: 10,
              pointerEvents: 'none',
              fontFamily: 'monospace',
            }}
          >
            EVA
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 20, left: 5, bottom: 30 }}
            >
              <defs>
                <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6f93ff" stopOpacity={1} />
                  <stop offset="100%" stopColor="#00c853" stopOpacity={0.85} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(120,150,255,0.06)"
                vertical={false}
              />
              <XAxis
                dataKey="time"
                stroke="rgba(120,150,255,0.12)"
                tick={{ fill: getCssVar('--text-tertiary'), fontSize: 11 }}
                tickLine={{ stroke: 'rgba(120,150,255,0.12)' }}
                interval={Math.floor(chartData.length / 10)}
                angle={-15}
                textAnchor="end"
                height={60}
              />
              <YAxis
                stroke="rgba(120,150,255,0.12)"
                tick={{ fill: getCssVar('--text-tertiary'), fontSize: 12 }}
                tickLine={{ stroke: 'rgba(120,150,255,0.12)' }}
                domain={calculateYDomain()}
                tickFormatter={(value) =>
                  displayMode === 'dollar'
                    ? `$${value.toFixed(0)}`
                    : `${value}%`
                }
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{
                  stroke: '#00c853',
                  strokeWidth: 1,
                  strokeDasharray: '4 4',
                  strokeOpacity: 0.5,
                }}
              />
              <ReferenceLine
                y={displayMode === 'dollar' ? initialBalance : 0}
                stroke="rgba(139,156,182,0.4)"
                strokeDasharray="4 4"
                label={{
                  value:
                    displayMode === 'dollar'
                      ? t('initialBalance', language).split(' ')[0]
                      : '0%',
                  fill: getCssVar('--text-tertiary'),
                  fontSize: 12,
                }}
              />
              <Line
                type="natural"
                dataKey="value"
                stroke="url(#colorGradient)"
                strokeWidth={3}
                dot={chartData.length > 50 ? false : { fill: '#00c853', r: 3 }}
                activeDot={{
                  r: 6,
                  fill: '#6f93ff',
                  stroke: '#00c853',
                  strokeWidth: 2,
                }}
                connectNulls={true}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Footer Stats */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <div className="gl-onyx-panel-b rounded-xl p-2.5">
            <div
              className="text-[10px] mb-1 uppercase tracking-wider"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {t('initialBalance', language)}
            </div>
            <div className="gl-metal-text text-xs sm:text-sm font-bold tabular-nums">
              {initialBalance.toFixed(2)} USDT
            </div>
          </div>
          <div className="gl-onyx-panel-b rounded-xl p-2.5">
            <div
              className="text-[10px] mb-1 uppercase tracking-wider"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {t('currentEquity', language)}
            </div>
            <div className="gl-metal-text text-xs sm:text-sm font-bold tabular-nums">
              {currentValue.raw_equity.toFixed(2)} USDT
            </div>
          </div>
          <div className="gl-onyx-panel-b rounded-xl p-2.5">
            <div
              className="text-[10px] mb-1 uppercase tracking-wider"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {t('historicalCycles', language)}
            </div>
            <div className="gl-metal-text text-xs sm:text-sm font-bold tabular-nums">
              {validHistory.length} {t('cycles', language)}
            </div>
          </div>
          <div className="gl-onyx-panel-b rounded-xl p-2.5">
            <div
              className="text-[10px] mb-1 uppercase tracking-wider"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {t('displayRange', language)}
            </div>
            <div className="gl-metal-text text-xs sm:text-sm font-bold tabular-nums">
              {validHistory.length > MAX_DISPLAY_POINTS
                ? `${t('recent', language)} ${MAX_DISPLAY_POINTS}`
                : t('allData', language)}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
