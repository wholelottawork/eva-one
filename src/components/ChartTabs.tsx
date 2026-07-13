import { useState, useEffect, useRef } from 'react'
import { EquityChart } from './EquityChart'
import { AdvancedChart } from './AdvancedChart'
import { useLanguage } from '../contexts/LanguageContext'
import { t } from '../i18n/translations'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  ChartLineData01Icon,
  ChartCandlestickIcon,
  ArrowDown01Icon,
  Search01Icon,
  Diamond01Icon,
  Bitcoin01Icon,
  ChartUpIcon,
  Money03Icon,
  GoldIcon,
} from '@hugeicons/core-free-icons'
import { motion, AnimatePresence } from 'framer-motion'

interface ChartTabsProps {
  traderId: string
  selectedSymbol?: string // 从外部选择的币种
  updateKey?: number // 强制更新的 key
  exchangeId?: string // 交易所ID
}

type ChartTab = 'equity' | 'kline'
type Interval = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d'
type MarketType = 'hyperliquid' | 'crypto' | 'stocks' | 'forex' | 'metals'

interface SymbolInfo {
  symbol: string
  name: string
  category: string
}

// 市场类型配置
const MARKET_CONFIG = {
  hyperliquid: {
    exchange: 'hyperliquid',
    defaultSymbol: 'BTC',
    icon: Diamond01Icon,
    label: { zh: 'HL', en: 'HL' },
    color: 'cyan',
    hasDropdown: true,
  },
  crypto: {
    exchange: 'binance',
    defaultSymbol: 'BTCUSDT',
    icon: Bitcoin01Icon,
    label: { zh: '加密', en: 'Crypto' },
    color: 'accent',
    hasDropdown: false,
  },
  stocks: {
    exchange: 'alpaca',
    defaultSymbol: 'AAPL',
    icon: ChartUpIcon,
    label: { zh: '美股', en: 'Stocks' },
    color: 'green',
    hasDropdown: false,
  },
  forex: {
    exchange: 'forex',
    defaultSymbol: 'EUR/USD',
    icon: Money03Icon,
    label: { zh: '外汇', en: 'Forex' },
    color: 'green',
    hasDropdown: false,
  },
  metals: {
    exchange: 'metals',
    defaultSymbol: 'XAU/USD',
    icon: GoldIcon,
    label: { zh: '金属', en: 'Metals' },
    color: 'accent',
    hasDropdown: false,
  },
}

const INTERVALS: { value: Interval; label: string }[] = [
  { value: '1m', label: '1m' },
  { value: '5m', label: '5m' },
  { value: '15m', label: '15m' },
  { value: '30m', label: '30m' },
  { value: '1h', label: '1h' },
  { value: '4h', label: '4h' },
  { value: '1d', label: '1d' },
]

// 根据交易所ID推断市场类型
function getMarketTypeFromExchange(exchangeId: string | undefined): MarketType {
  if (!exchangeId) return 'hyperliquid'
  const lower = exchangeId.toLowerCase()
  if (lower.includes('hyperliquid')) return 'hyperliquid'
  // 其他交易所默认使用 crypto 类型
  return 'crypto'
}

export function ChartTabs({
  traderId,
  selectedSymbol,
  updateKey,
  exchangeId,
}: ChartTabsProps) {
  const { language } = useLanguage()
  const [activeTab, setActiveTab] = useState<ChartTab>('equity')
  const [chartSymbol, setChartSymbol] = useState<string>('BTC')
  const [interval, setInterval] = useState<Interval>('5m')
  const [symbolInput, setSymbolInput] = useState('')
  const [marketType, setMarketType] = useState<MarketType>(() =>
    getMarketTypeFromExchange(exchangeId)
  )
  const [availableSymbols, setAvailableSymbols] = useState<SymbolInfo[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [searchFilter, setSearchFilter] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  // 当交易所ID变化时，自动切换市场类型
  useEffect(() => {
    const newMarketType = getMarketTypeFromExchange(exchangeId)
    setMarketType(newMarketType)
  }, [exchangeId])

  // 根据市场类型确定交易所
  const marketConfig = MARKET_CONFIG[marketType]
  // 优先使用传入的 exchangeId（非 hyperliquid 时）
  const currentExchange =
    marketType === 'hyperliquid'
      ? 'hyperliquid'
      : exchangeId || marketConfig.exchange

  // 获取可用币种列表
  useEffect(() => {
    if (marketConfig.hasDropdown) {
      fetch(`/api/symbols?exchange=${marketConfig.exchange}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.symbols) {
            // 按类别排序: crypto > stock > forex > commodity > index
            const categoryOrder: Record<string, number> = {
              crypto: 0,
              stock: 1,
              forex: 2,
              commodity: 3,
              index: 4,
            }
            const sorted = [...data.symbols].sort(
              (a: SymbolInfo, b: SymbolInfo) => {
                const orderA = categoryOrder[a.category] ?? 5
                const orderB = categoryOrder[b.category] ?? 5
                if (orderA !== orderB) return orderA - orderB
                return a.symbol.localeCompare(b.symbol)
              }
            )
            setAvailableSymbols(sorted)
          }
        })
        .catch((err) => console.error('Failed to fetch symbols:', err))
    }
  }, [marketType, marketConfig.exchange, marketConfig.hasDropdown])

  // 点击外部关闭下拉
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 切换市场类型时更新默认符号
  const handleMarketTypeChange = (type: MarketType) => {
    setMarketType(type)
    setChartSymbol(MARKET_CONFIG[type].defaultSymbol)
    setShowDropdown(false)
  }

  // 过滤后的币种列表
  const filteredSymbols = availableSymbols.filter((s) =>
    s.symbol.toLowerCase().includes(searchFilter.toLowerCase())
  )

  // 当从外部选择币种时，自动切换到K线图
  useEffect(() => {
    if (selectedSymbol) {
      console.log(
        '[ChartTabs] 收到币种选择:',
        selectedSymbol,
        'updateKey:',
        updateKey
      )
      setChartSymbol(selectedSymbol)
      setActiveTab('kline')
    }
  }, [selectedSymbol, updateKey])

  // 处理手动输入符号
  const handleSymbolSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (symbolInput.trim()) {
      let symbol = symbolInput.trim().toUpperCase()
      // 加密货币自动加 USDT 后缀
      if (marketType === 'crypto' && !symbol.endsWith('USDT')) {
        symbol = symbol + 'USDT'
      }
      setChartSymbol(symbol)
      setSymbolInput('')
    }
  }

  console.log('[ChartTabs] rendering, activeTab:', activeTab)

  return (
    <div
      className={`gl-onyx-panel rounded-2xl overflow-hidden relative z-10 w-full flex flex-col transition-all duration-300 ${
        typeof window !== 'undefined' && window.innerWidth < 768
          ? 'h-[500px]'
          : 'h-[600px]'
      }`}
    >
      {/*
        Premium Professional Toolbar
        Mobile: Single row, horizontal scroll with gradient mask
        Desktop: Standard flex-wrap/nowrap
      */}
      <div
        className="relative z-20 flex flex-wrap md:flex-nowrap items-center justify-between gap-y-2 px-3 py-2.5 shrink-0 backdrop-blur-md"
        style={{
          borderBottom: '1px solid var(--panel-border)',
          background:
            'linear-gradient(180deg, rgba(20,26,38,0.55), rgba(11,14,17,0.35))',
        }}
      >
        {/* Left: Tab Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="gl-seg">
            <button
              onClick={() => setActiveTab('equity')}
              data-active={activeTab === 'equity'}
              className="gl-seg-item flex items-center gap-1.5"
            >
              <HugeiconsIcon
                icon={ChartLineData01Icon}
                size={15}
                strokeWidth={1.9}
              />
              <span className="hidden md:inline">
                {t('accountEquityCurve', language)}
              </span>
              <span className="md:hidden">Eq</span>
            </button>
            <button
              onClick={() => setActiveTab('kline')}
              data-active={activeTab === 'kline'}
              className="gl-seg-item flex items-center gap-1.5"
            >
              <HugeiconsIcon
                icon={ChartCandlestickIcon}
                size={15}
                strokeWidth={1.9}
              />
              <span className="hidden md:inline">
                {t('marketChart', language)}
              </span>
              <span className="md:hidden">Kline</span>
            </button>
          </div>

          {/* Market Type Pills - Only when kline active, HIDDEN on mobile to save space */}
          {activeTab === 'kline' && (
            <div className="hidden md:flex items-center gap-1 ml-1 border-l border-[var(--panel-border)] pl-2">
              {(Object.keys(MARKET_CONFIG) as MarketType[]).map((type) => {
                const config = MARKET_CONFIG[type]
                const isActive = marketType === type
                return (
                  <button
                    key={type}
                    onClick={() => handleMarketTypeChange(type)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide rounded-lg transition-all border active:scale-[0.97] ${
                      isActive
                        ? 'bg-[rgba(61,107,255,0.14)] text-[var(--text-primary)] border-[rgba(61,107,255,0.4)] shadow-[0_0_12px_rgba(61,107,255,0.25)]'
                        : 'text-[var(--text-tertiary)] border-transparent hover:text-[var(--text-primary)] hover:bg-white/5'
                    }`}
                  >
                    <HugeiconsIcon
                      icon={config.icon}
                      size={13}
                      strokeWidth={1.9}
                      className={
                        isActive ? 'text-[var(--accent-primary)]' : 'opacity-70'
                      }
                    />
                    {language === 'zh' ? config.label.zh : config.label.en}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Right: Symbol + Interval */}
        {activeTab === 'kline' && (
          <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto min-w-0">
            {/* Symbol Dropdown */}
            <div className="shrink-0 relative" ref={dropdownRef}>
              {marketConfig.hasDropdown ? (
                <>
                  <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[var(--surface-tertiary)] border border-[var(--panel-border)] rounded-lg text-[11px] font-bold gl-metal-text tabular-nums hover:border-[rgba(61,107,255,0.4)] transition-all active:scale-[0.97]"
                  >
                    <span>{chartSymbol}</span>
                    <HugeiconsIcon
                      icon={ArrowDown01Icon}
                      size={13}
                      strokeWidth={2}
                      className={`text-[var(--text-tertiary)] transition-transform ${showDropdown ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {showDropdown && (
                    <div className="gl-onyx-panel-b absolute top-full right-0 mt-2 w-64 rounded-xl shadow-[0_18px_48px_-12px_rgba(0,0,0,0.65)] z-50 overflow-hidden">
                      <div className="p-2 border-b border-[var(--panel-border)]">
                        <div className="flex items-center gap-2 px-2.5 py-1.5 bg-[var(--surface-tertiary)] rounded-lg border border-[var(--panel-border)] focus-within:border-[rgba(61,107,255,0.5)] focus-within:shadow-[0_0_12px_rgba(61,107,255,0.18)] transition-all">
                          <HugeiconsIcon
                            icon={Search01Icon}
                            size={14}
                            strokeWidth={1.9}
                            className="text-[var(--text-tertiary)]"
                          />
                          <input
                            type="text"
                            value={searchFilter}
                            onChange={(e) => setSearchFilter(e.target.value)}
                            placeholder="Search symbol..."
                            className="flex-1 bg-transparent text-[11px] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none font-mono"
                            autoFocus
                          />
                        </div>
                      </div>
                      <div className="overflow-y-auto max-h-60 dash-scroll">
                        {['crypto', 'stock', 'forex', 'commodity', 'index'].map(
                          (category) => {
                            const categorySymbols = filteredSymbols.filter(
                              (s) => s.category === category
                            )
                            if (categorySymbols.length === 0) return null
                            const labels: Record<string, string> = {
                              crypto: 'Crypto',
                              stock: 'Stocks',
                              forex: 'Forex',
                              commodity: 'Commodities',
                              index: 'Index',
                            }
                            return (
                              <div key={category}>
                                <div className="px-3 py-1.5 text-[9px] font-bold text-[var(--text-tertiary)] bg-white/[0.03] uppercase tracking-wider">
                                  {labels[category]}
                                </div>
                                {categorySymbols.map((s) => (
                                  <button
                                    key={s.symbol}
                                    onClick={() => {
                                      setChartSymbol(s.symbol)
                                      setShowDropdown(false)
                                      setSearchFilter('')
                                    }}
                                    className={`w-full px-3 py-2 text-left text-[11px] font-mono tabular-nums hover:bg-white/[0.04] transition-all flex items-center justify-between ${chartSymbol === s.symbol ? 'bg-[rgba(61,107,255,0.12)] text-[var(--accent-primary)]' : 'text-[var(--text-secondary)]'}`}
                                  >
                                    <span>{s.symbol}</span>
                                    <span className="text-[9px] opacity-50">
                                      {s.name}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            )
                          }
                        )}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <span className="px-2.5 py-1.5 bg-[var(--surface-tertiary)] border border-[var(--panel-border)] rounded-lg text-[11px] font-bold gl-metal-text font-mono tabular-nums">
                  {chartSymbol}
                </span>
              )}
            </div>

            {/* Interval Selector - Allow scrolling if needed */}
            <div className="flex items-center gap-0.5 bg-[var(--surface-tertiary)] rounded-lg border border-[var(--panel-border)] p-0.5 overflow-x-auto no-scrollbar max-w-[200px] md:max-w-none">
              {INTERVALS.map((int) => (
                <button
                  key={int.value}
                  onClick={() => setInterval(int.value)}
                  className={`px-2 py-1 text-[10px] font-semibold tabular-nums rounded-md transition-all active:scale-[0.95] ${
                    interval === int.value
                      ? 'bg-[rgba(61,107,255,0.16)] text-[var(--accent-primary)] shadow-[0_0_10px_rgba(61,107,255,0.2)]'
                      : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-white/5'
                  }`}
                >
                  {int.label}
                </button>
              ))}
            </div>

            {/* Quick Input - Hidden on mobile, dropdown search is enough */}
            <form
              onSubmit={handleSymbolSubmit}
              className="hidden md:flex items-center shrink-0"
            >
              <input
                type="text"
                value={symbolInput}
                onChange={(e) => setSymbolInput(e.target.value)}
                placeholder="Sym"
                className="w-16 px-2 py-1.5 bg-[var(--surface-tertiary)] border border-[var(--panel-border)] rounded-l-lg text-[10px] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[rgba(61,107,255,0.5)] focus:shadow-[0_0_12px_rgba(61,107,255,0.18)] font-mono transition-all"
              />
              <button
                type="submit"
                className="px-2.5 py-1.5 bg-white/[0.04] border border-[var(--panel-border)] border-l-0 rounded-r-lg text-[10px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-white/[0.08] transition-all active:scale-[0.97]"
              >
                Go
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Tab Content - Chart autosizes to this container */}
      <div
        className="relative flex-1 overflow-hidden h-full min-h-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(11,14,17,0.35), rgba(8,10,14,0.55))',
        }}
      >
        <AnimatePresence mode="wait">
          {activeTab === 'equity' ? (
            <motion.div
              key="equity"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="h-full w-full absolute inset-0"
            >
              <EquityChart traderId={traderId} embedded />
            </motion.div>
          ) : (
            <motion.div
              key={`kline-${chartSymbol}-${interval}-${currentExchange}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="h-full w-full absolute inset-0"
            >
              <AdvancedChart
                symbol={chartSymbol}
                interval={interval}
                traderID={traderId}
                // Dynamic auto-sizing via ResizeObserver
                exchange={currentExchange}
                onSymbolChange={setChartSymbol}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
