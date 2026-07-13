import { HugeiconsIcon } from '@hugeicons/react'
import {
  Clock01Icon,
  Activity01Icon,
  TradeUpIcon,
  ChartBarLineIcon,
  InformationCircleIcon,
  SquareLock02Icon,
  LinkSquare02Icon,
  FlashIcon,
  CheckmarkCircle01Icon,
  AlertCircleIcon,
  BitcoinKeyIcon,
  DatabaseIcon,
  ArrowDataTransferHorizontalIcon,
  ChartLineData01Icon,
  StarIcon,
} from '@hugeicons/core-free-icons'
import type { IndicatorConfig } from '../../types'

// Default EVAOS API Key
const DEFAULT_EVA_API_KEY = 'cm_568c67eae410d912c54c'

interface IndicatorEditorProps {
  config: IndicatorConfig
  onChange: (config: IndicatorConfig) => void
  disabled?: boolean
  language: string
}

// 所有可用时间周期
const allTimeframes = [
  { value: '1m', label: '1m', category: 'scalp' },
  { value: '3m', label: '3m', category: 'scalp' },
  { value: '5m', label: '5m', category: 'scalp' },
  { value: '15m', label: '15m', category: 'intraday' },
  { value: '30m', label: '30m', category: 'intraday' },
  { value: '1h', label: '1h', category: 'intraday' },
  { value: '2h', label: '2h', category: 'swing' },
  { value: '4h', label: '4h', category: 'swing' },
  { value: '6h', label: '6h', category: 'swing' },
  { value: '8h', label: '8h', category: 'swing' },
  { value: '12h', label: '12h', category: 'swing' },
  { value: '1d', label: '1D', category: 'position' },
  { value: '3d', label: '3D', category: 'position' },
  { value: '1w', label: '1W', category: 'position' },
]

export function IndicatorEditor({
  config,
  onChange,
  disabled,
  language,
}: IndicatorEditorProps) {
  const t = (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      // Section titles
      marketData: { zh: '市场数据', en: 'Market Data' },
      marketDataDesc: {
        zh: 'AI 分析所需的核心价格数据',
        en: 'Core price data for AI analysis',
      },
      technicalIndicators: { zh: '技术指标', en: 'Technical Indicators' },
      technicalIndicatorsDesc: {
        zh: '可选的技术分析指标，AI 可自行计算',
        en: 'Optional indicators, AI can calculate them',
      },
      marketSentiment: { zh: '市场情绪', en: 'Market Sentiment' },
      marketSentimentDesc: {
        zh: '持仓量、资金费率等市场情绪数据',
        en: 'OI, funding rate and market sentiment data',
      },
      quantData: { zh: '量化数据', en: 'Quant Data' },
      quantDataDesc: {
        zh: '资金流向、大户动向',
        en: 'Netflow, whale movements',
      },

      // Timeframes
      timeframes: { zh: '时间周期', en: 'Timeframes' },
      timeframesDesc: {
        zh: '选择 K 线分析周期，星标为主周期（双击设置）',
        en: 'Select K-line timeframes, star marks primary (double-click)',
      },
      klineCount: { zh: 'K 线数量', en: 'K-line Count' },
      scalp: { zh: '超短', en: 'Scalp' },
      intraday: { zh: '日内', en: 'Intraday' },
      swing: { zh: '波段', en: 'Swing' },
      position: { zh: '趋势', en: 'Position' },

      // Data types
      rawKlines: { zh: 'OHLCV 原始 K 线', en: 'Raw OHLCV K-lines' },
      rawKlinesDesc: {
        zh: '必须 - 开高低收量原始数据，AI 核心分析依据',
        en: 'Required - Open/High/Low/Close/Volume data for AI',
      },
      required: { zh: '必须', en: 'Required' },

      // Indicators
      ema: { zh: 'EMA 均线', en: 'EMA' },
      emaDesc: { zh: '指数移动平均线', en: 'Exponential Moving Average' },
      macd: { zh: 'MACD', en: 'MACD' },
      macdDesc: {
        zh: '异同移动平均线',
        en: 'Moving Average Convergence Divergence',
      },
      rsi: { zh: 'RSI', en: 'RSI' },
      rsiDesc: { zh: '相对强弱指标', en: 'Relative Strength Index' },
      atr: { zh: 'ATR', en: 'ATR' },
      atrDesc: { zh: '真实波幅均值', en: 'Average True Range' },
      boll: { zh: 'BOLL 布林带', en: 'Bollinger Bands' },
      bollDesc: {
        zh: '布林带指标（上中下轨）',
        en: 'Upper/Middle/Lower Bands',
      },
      volume: { zh: '成交量', en: 'Volume' },
      volumeDesc: { zh: '交易量分析', en: 'Trading volume analysis' },
      oi: { zh: '持仓量', en: 'Open Interest' },
      oiDesc: { zh: '合约未平仓量', en: 'Futures open interest' },
      fundingRate: { zh: '资金费率', en: 'Funding Rate' },
      fundingRateDesc: { zh: '永续合约资金费率', en: 'Perpetual funding rate' },

      // OI Ranking
      oiRanking: { zh: 'OI 排行', en: 'OI Ranking' },
      oiRankingDesc: { zh: '持仓量增减排行', en: 'OI change ranking' },
      oiRankingNote: {
        zh: '显示持仓量增加/减少的币种排行，帮助发现资金流向',
        en: 'Shows coins with OI increase/decrease, helps identify capital flow',
      },

      // NetFlow Ranking
      netflowRanking: { zh: '资金流向', en: 'NetFlow' },
      netflowRankingDesc: {
        zh: '机构/散户资金流向',
        en: 'Institution/retail fund flow',
      },
      netflowRankingNote: {
        zh: '显示机构资金流入/流出排行，散户动向对比，发现聪明钱信号',
        en: 'Shows institution inflow/outflow ranking, retail flow comparison, Smart Money signals',
      },

      // Price Ranking
      priceRanking: { zh: '涨跌幅排行', en: 'Price Ranking' },
      priceRankingDesc: { zh: '涨跌幅排行榜', en: 'Gainers/losers ranking' },
      priceRankingNote: {
        zh: '显示涨幅/跌幅排行，结合资金流和持仓变化分析趋势强度',
        en: 'Shows top gainers/losers, combined with fund flow and OI for trend analysis',
      },
      priceRankingMulti: { zh: '多周期', en: 'Multi-period' },

      // Common settings
      duration: { zh: '周期', en: 'Duration' },
      limit: { zh: '数量', en: 'Limit' },

      // Tips
      aiCanCalculate: {
        zh: '提示：AI 可自行计算这些指标，开启可减少 AI 计算量',
        en: 'Tip: AI can calculate these, enabling reduces AI workload',
      },

      // EVA Data Provider
      evaDataTitle: { zh: 'EVA 量化数据源', en: 'EVA Data Provider' },
      evaDataDesc: {
        zh: '专业加密货币量化数据服务',
        en: 'Professional crypto quant data service',
      },
      evaDataFeatures: {
        zh: 'AI500 · OI排行 · 资金流向 · 涨跌榜',
        en: 'AI500 · OI Ranking · Fund Flow · Price Ranking',
      },
      viewApiDocs: { zh: 'API 文档', en: 'API Docs' },
      apiKey: { zh: 'API Key', en: 'API Key' },
      apiKeyPlaceholder: {
        zh: '输入 EVAOS API Key',
        en: 'Enter EVAOS API Key',
      },
      fillDefault: { zh: '填入默认', en: 'Fill Default' },
      connected: { zh: '已配置', en: 'Configured' },
      notConfigured: { zh: '未配置', en: 'Not Configured' },
      evaDataSources: { zh: 'EVA 数据源', en: 'EVAOS Data Sources' },
    }
    return translations[key]?.[language] || key
  }

  // 获取当前选中的时间周期
  const selectedTimeframes = config.klines.selected_timeframes || [
    config.klines.primary_timeframe,
  ]

  // 切换时间周期选择
  const toggleTimeframe = (tf: string) => {
    if (disabled) return
    const current = [...selectedTimeframes]
    const index = current.indexOf(tf)

    if (index >= 0) {
      if (current.length > 1) {
        current.splice(index, 1)
        const newPrimary =
          tf === config.klines.primary_timeframe
            ? current[0]
            : config.klines.primary_timeframe
        onChange({
          ...config,
          klines: {
            ...config.klines,
            selected_timeframes: current,
            primary_timeframe: newPrimary,
            enable_multi_timeframe: current.length > 1,
          },
        })
      }
    } else {
      current.push(tf)
      onChange({
        ...config,
        klines: {
          ...config.klines,
          selected_timeframes: current,
          enable_multi_timeframe: current.length > 1,
        },
      })
    }
  }

  // 设置主时间周期
  const setPrimaryTimeframe = (tf: string) => {
    if (disabled) return
    onChange({
      ...config,
      klines: {
        ...config.klines,
        primary_timeframe: tf,
      },
    })
  }

  const categoryColors: Record<string, string> = {
    scalp: 'var(--text-secondary)',
    intraday: 'var(--text-secondary)',
    swing: 'var(--text-secondary)',
    position: 'var(--text-secondary)',
  }

  // Ensure enable_raw_klines is always true
  const ensureRawKlines = () => {
    if (!config.enable_raw_klines) {
      onChange({ ...config, enable_raw_klines: true })
    }
  }

  // Call on mount if needed
  if (
    config.enable_raw_klines === undefined ||
    config.enable_raw_klines === false
  ) {
    ensureRawKlines()
  }

  // Check if any EVAOS feature is enabled
  const hasEVAosEnabled =
    config.enable_quant_data ||
    config.enable_oi_ranking ||
    config.enable_netflow_ranking ||
    config.enable_price_ranking
  const hasApiKey = !!config.eva_api_key

  return (
    <div className="space-y-5">
      {/* ============================================ */}
      {/* EVA Data Provider - Top Configuration    */}
      {/* ============================================ */}
      <div className="gl-aurora-panel rounded-2xl overflow-hidden">
        <div className="p-4">
          {/* Header Row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="dash-kpi-ico shrink-0">
                <HugeiconsIcon icon={FlashIcon} size={18} strokeWidth={1.9} />
              </div>
              <div>
                <h3 className="text-sm font-semibold gl-metal-text">
                  {t('evaDataTitle')}
                </h3>
                <span
                  className="text-[10px]"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {t('evaDataFeatures')}
                </span>
              </div>
            </div>

            {/* Status & API Docs */}
            <div className="flex items-center gap-2">
              {hasApiKey ? (
                <span className="gl-badge gl-badge--buy">
                  <HugeiconsIcon
                    icon={CheckmarkCircle01Icon}
                    size={13}
                    strokeWidth={1.9}
                  />
                  {t('connected')}
                </span>
              ) : (
                <span className="gl-badge gl-badge--hold">
                  <HugeiconsIcon
                    icon={AlertCircleIcon}
                    size={13}
                    strokeWidth={1.9}
                  />
                  {t('notConfigured')}
                </span>
              )}
              <a
                href="https://evaos.ai/api-docs"
                target="_blank"
                rel="noopener noreferrer"
                className="dash-chip hover:opacity-80 transition-all"
              >
                <HugeiconsIcon
                  icon={LinkSquare02Icon}
                  size={13}
                  strokeWidth={1.9}
                />
                {t('viewApiDocs')}
              </a>
            </div>
          </div>

          {/* API Key Input */}
          <div>
            <label className="gl-field-label flex items-center gap-1.5">
              <HugeiconsIcon
                icon={BitcoinKeyIcon}
                size={13}
                strokeWidth={1.9}
              />
              {t('apiKey')}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={config.eva_api_key || ''}
                onChange={(e) =>
                  !disabled &&
                  onChange({ ...config, eva_api_key: e.target.value })
                }
                disabled={disabled}
                placeholder={t('apiKeyPlaceholder')}
                className="gl-input flex-1 font-mono text-sm"
              />
              {!disabled && !config.eva_api_key && (
                <button
                  type="button"
                  onClick={() =>
                    onChange({ ...config, eva_api_key: DEFAULT_EVA_API_KEY })
                  }
                  className="gl-navbar-btn shrink-0 px-3 py-2 text-xs"
                >
                  {t('fillDefault')}
                </button>
              )}
            </div>
          </div>

          {/* EVAOS Data Sources Grid */}
          <div className="mt-4">
            <div className="gl-field-label flex items-center gap-1.5">
              <HugeiconsIcon icon={DatabaseIcon} size={13} strokeWidth={1.9} />
              {t('evaDataSources')}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {/* Quant Data */}
              <div
                className={`gl-onyx-panel rounded-xl overflow-hidden p-2.5 transition-all cursor-pointer ${config.enable_quant_data ? 'ring-1 ring-[rgba(61,107,255,0.35)]' : ''} ${disabled ? 'opacity-50' : ''}`}
                onClick={() =>
                  !disabled &&
                  onChange({
                    ...config,
                    enable_quant_data: !config.enable_quant_data,
                  })
                }
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HugeiconsIcon
                      icon={ChartBarLineIcon}
                      size={14}
                      strokeWidth={1.9}
                      style={{
                        color: config.enable_quant_data
                          ? '#86efac'
                          : 'var(--text-secondary)',
                      }}
                    />
                    <span
                      className="text-xs font-medium"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {t('quantData')}
                    </span>
                  </div>
                  <div
                    className="gl-switch"
                    data-on={config.enable_quant_data ? 'true' : 'false'}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (!disabled) {
                        onChange({
                          ...config,
                          enable_quant_data: !config.enable_quant_data,
                        })
                      }
                    }}
                  />
                </div>
                <p
                  className="text-[10px] mt-1"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {t('quantDataDesc')}
                </p>
                {config.enable_quant_data && (
                  <div className="flex gap-3 mt-2">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.enable_quant_oi !== false}
                        onChange={(e) => {
                          e.stopPropagation()
                          if (!disabled) {
                            onChange({
                              ...config,
                              enable_quant_oi: e.target.checked,
                            })
                          }
                        }}
                        disabled={disabled}
                        className="w-3 h-3 rounded accent-[var(--accent-primary)]"
                      />
                      <span
                        className="text-[10px]"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        OI
                      </span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.enable_quant_netflow !== false}
                        onChange={(e) => {
                          e.stopPropagation()
                          if (!disabled) {
                            onChange({
                              ...config,
                              enable_quant_netflow: e.target.checked,
                            })
                          }
                        }}
                        disabled={disabled}
                        className="w-3 h-3 rounded accent-[var(--accent-primary)]"
                      />
                      <span
                        className="text-[10px]"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        Netflow
                      </span>
                    </label>
                  </div>
                )}
              </div>

              {/* OI Ranking */}
              <div
                className={`gl-onyx-panel rounded-xl overflow-hidden p-2.5 transition-all cursor-pointer ${config.enable_oi_ranking ? 'ring-1 ring-[rgba(61,107,255,0.35)]' : ''} ${disabled ? 'opacity-50' : ''}`}
                onClick={() =>
                  !disabled &&
                  onChange({
                    ...config,
                    enable_oi_ranking: !config.enable_oi_ranking,
                    ...(!config.enable_oi_ranking && !config.oi_ranking_duration
                      ? { oi_ranking_duration: '1h' }
                      : {}),
                    ...(!config.enable_oi_ranking && !config.oi_ranking_limit
                      ? { oi_ranking_limit: 10 }
                      : {}),
                  })
                }
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HugeiconsIcon
                      icon={ChartLineData01Icon}
                      size={14}
                      strokeWidth={1.9}
                      style={{
                        color: config.enable_oi_ranking
                          ? '#86efac'
                          : 'var(--text-secondary)',
                      }}
                    />
                    <span
                      className="text-xs font-medium"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {t('oiRanking')}
                    </span>
                  </div>
                  <div
                    className="gl-switch"
                    data-on={config.enable_oi_ranking ? 'true' : 'false'}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (!disabled) {
                        onChange({
                          ...config,
                          enable_oi_ranking: !config.enable_oi_ranking,
                          ...(!config.enable_oi_ranking &&
                          !config.oi_ranking_duration
                            ? { oi_ranking_duration: '1h' }
                            : {}),
                          ...(!config.enable_oi_ranking &&
                          !config.oi_ranking_limit
                            ? { oi_ranking_limit: 10 }
                            : {}),
                        })
                      }
                    }}
                  />
                </div>
                <p
                  className="text-[10px] mt-1"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {t('oiRankingDesc')}
                </p>
                {config.enable_oi_ranking && (
                  <div
                    className="flex gap-2 mt-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <select
                      value={config.oi_ranking_duration || '1h'}
                      onChange={(e) =>
                        !disabled &&
                        onChange({
                          ...config,
                          oi_ranking_duration: e.target.value,
                        })
                      }
                      disabled={disabled}
                      className="dash-select flex-1 text-[10px]"
                    >
                      <option value="1h">1h</option>
                      <option value="4h">4h</option>
                      <option value="24h">24h</option>
                    </select>
                    <select
                      value={config.oi_ranking_limit || 10}
                      onChange={(e) =>
                        !disabled &&
                        onChange({
                          ...config,
                          oi_ranking_limit: parseInt(e.target.value),
                        })
                      }
                      disabled={disabled}
                      className="dash-select w-16 text-[10px] tabular-nums"
                    >
                      {[5, 10, 15, 20].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* NetFlow Ranking */}
              <div
                className={`gl-onyx-panel rounded-xl overflow-hidden p-2.5 transition-all cursor-pointer ${config.enable_netflow_ranking ? 'ring-1 ring-[rgba(61,107,255,0.35)]' : ''} ${disabled ? 'opacity-50' : ''}`}
                onClick={() =>
                  !disabled &&
                  onChange({
                    ...config,
                    enable_netflow_ranking: !config.enable_netflow_ranking,
                    ...(!config.enable_netflow_ranking &&
                    !config.netflow_ranking_duration
                      ? { netflow_ranking_duration: '1h' }
                      : {}),
                    ...(!config.enable_netflow_ranking &&
                    !config.netflow_ranking_limit
                      ? { netflow_ranking_limit: 10 }
                      : {}),
                  })
                }
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HugeiconsIcon
                      icon={ArrowDataTransferHorizontalIcon}
                      size={14}
                      strokeWidth={1.9}
                      style={{
                        color: config.enable_netflow_ranking
                          ? '#86efac'
                          : 'var(--text-secondary)',
                      }}
                    />
                    <span
                      className="text-xs font-medium"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {t('netflowRanking')}
                    </span>
                  </div>
                  <div
                    className="gl-switch"
                    data-on={config.enable_netflow_ranking ? 'true' : 'false'}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (!disabled) {
                        onChange({
                          ...config,
                          enable_netflow_ranking:
                            !config.enable_netflow_ranking,
                          ...(!config.enable_netflow_ranking &&
                          !config.netflow_ranking_duration
                            ? { netflow_ranking_duration: '1h' }
                            : {}),
                          ...(!config.enable_netflow_ranking &&
                          !config.netflow_ranking_limit
                            ? { netflow_ranking_limit: 10 }
                            : {}),
                        })
                      }
                    }}
                  />
                </div>
                <p
                  className="text-[10px] mt-1"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {t('netflowRankingDesc')}
                </p>
                {config.enable_netflow_ranking && (
                  <div
                    className="flex gap-2 mt-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <select
                      value={config.netflow_ranking_duration || '1h'}
                      onChange={(e) =>
                        !disabled &&
                        onChange({
                          ...config,
                          netflow_ranking_duration: e.target.value,
                        })
                      }
                      disabled={disabled}
                      className="dash-select flex-1 text-[10px]"
                    >
                      <option value="1h">1h</option>
                      <option value="4h">4h</option>
                      <option value="24h">24h</option>
                    </select>
                    <select
                      value={config.netflow_ranking_limit || 10}
                      onChange={(e) =>
                        !disabled &&
                        onChange({
                          ...config,
                          netflow_ranking_limit: parseInt(e.target.value),
                        })
                      }
                      disabled={disabled}
                      className="dash-select w-16 text-[10px] tabular-nums"
                    >
                      {[5, 10, 15, 20].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Price Ranking */}
              <div
                className={`gl-onyx-panel rounded-xl overflow-hidden p-2.5 transition-all cursor-pointer ${config.enable_price_ranking ? 'ring-1 ring-[rgba(61,107,255,0.35)]' : ''} ${disabled ? 'opacity-50' : ''}`}
                onClick={() =>
                  !disabled &&
                  onChange({
                    ...config,
                    enable_price_ranking: !config.enable_price_ranking,
                    ...(!config.enable_price_ranking &&
                    !config.price_ranking_duration
                      ? { price_ranking_duration: '1h,4h,24h' }
                      : {}),
                    ...(!config.enable_price_ranking &&
                    !config.price_ranking_limit
                      ? { price_ranking_limit: 10 }
                      : {}),
                  })
                }
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HugeiconsIcon
                      icon={TradeUpIcon}
                      size={14}
                      strokeWidth={1.9}
                      style={{
                        color: config.enable_price_ranking
                          ? '#86efac'
                          : 'var(--text-secondary)',
                      }}
                    />
                    <span
                      className="text-xs font-medium"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {t('priceRanking')}
                    </span>
                  </div>
                  <div
                    className="gl-switch"
                    data-on={config.enable_price_ranking ? 'true' : 'false'}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (!disabled) {
                        onChange({
                          ...config,
                          enable_price_ranking: !config.enable_price_ranking,
                          ...(!config.enable_price_ranking &&
                          !config.price_ranking_duration
                            ? { price_ranking_duration: '1h,4h,24h' }
                            : {}),
                          ...(!config.enable_price_ranking &&
                          !config.price_ranking_limit
                            ? { price_ranking_limit: 10 }
                            : {}),
                        })
                      }
                    }}
                  />
                </div>
                <p
                  className="text-[10px] mt-1"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {t('priceRankingDesc')}
                </p>
                {config.enable_price_ranking && (
                  <div
                    className="flex gap-2 mt-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <select
                      value={config.price_ranking_duration || '1h,4h,24h'}
                      onChange={(e) =>
                        !disabled &&
                        onChange({
                          ...config,
                          price_ranking_duration: e.target.value,
                        })
                      }
                      disabled={disabled}
                      className="dash-select flex-1 text-[10px]"
                    >
                      <option value="1h">1h</option>
                      <option value="4h">4h</option>
                      <option value="24h">24h</option>
                      <option value="1h,4h,24h">
                        {t('priceRankingMulti')}
                      </option>
                    </select>
                    <select
                      value={config.price_ranking_limit || 10}
                      onChange={(e) =>
                        !disabled &&
                        onChange({
                          ...config,
                          price_ranking_limit: parseInt(e.target.value),
                        })
                      }
                      disabled={disabled}
                      className="dash-select w-16 text-[10px] tabular-nums"
                    >
                      {[5, 10, 15, 20].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Warning if features enabled but no API key */}
            {hasEVAosEnabled && !hasApiKey && (
              <div
                className="flex items-center gap-2 mt-3 p-2.5 rounded-xl"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(246,70,93,0.12), rgba(246,70,93,0.04))',
                  border: '1px solid rgba(246,70,93,0.28)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
                }}
              >
                <HugeiconsIcon
                  icon={AlertCircleIcon}
                  size={16}
                  strokeWidth={1.9}
                  className="flex-shrink-0"
                  style={{ color: 'var(--binance-red)' }}
                />
                <span className="text-[10px] text-[var(--text-primary)]">
                  {language === 'zh'
                    ? '请配置 API Key 以启用 EVA 数据源'
                    : 'Please configure API Key to enable EVAOS data sources'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* Section 1: Market Data (Required)           */}
      {/* ============================================ */}
      <div className="gl-metal-panel rounded-2xl overflow-hidden">
        <div className="px-4 py-3 flex items-center gap-2 border-b border-[var(--panel-border)]">
          <div className="dash-ico shrink-0">
            <HugeiconsIcon
              icon={ChartBarLineIcon}
              size={16}
              strokeWidth={1.9}
            />
          </div>
          <span className="text-sm font-semibold gl-metal-shine">
            {t('marketData')}
          </span>
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            - {t('marketDataDesc')}
          </span>
        </div>

        <div className="p-3 space-y-4">
          {/* Raw Klines - Required, Always On */}
          <div className="flex items-center justify-between p-3 rounded-xl gl-onyx-panel overflow-hidden">
            <div className="flex items-center gap-3">
              <div className="dash-kpi-ico shrink-0">
                <HugeiconsIcon icon={TradeUpIcon} size={18} strokeWidth={1.9} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className="text-sm font-medium"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {t('rawKlines')}
                  </span>
                  <span className="gl-badge gl-badge--info">
                    <HugeiconsIcon
                      icon={SquareLock02Icon}
                      size={11}
                      strokeWidth={1.9}
                    />
                    {t('required')}
                  </span>
                </div>
                <p
                  className="text-xs mt-0.5"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {t('rawKlinesDesc')}
                </p>
              </div>
            </div>
            <div
              className="gl-switch opacity-70 cursor-not-allowed"
              data-on="true"
            />
          </div>

          {/* Timeframe Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <HugeiconsIcon
                  icon={Clock01Icon}
                  size={14}
                  strokeWidth={1.9}
                  style={{ color: 'var(--text-secondary)' }}
                />
                <span
                  className="text-xs font-medium"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {t('timeframes')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="text-[10px]"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {t('klineCount')}:
                </span>
                <input
                  type="number"
                  value={config.klines.primary_count}
                  onChange={(e) =>
                    !disabled &&
                    onChange({
                      ...config,
                      klines: {
                        ...config.klines,
                        primary_count: parseInt(e.target.value) || 30,
                      },
                    })
                  }
                  disabled={disabled}
                  min={10}
                  max={200}
                  className="gl-input w-16 text-xs text-center tabular-nums"
                />
              </div>
            </div>
            <p
              className="text-[10px] mb-2"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {t('timeframesDesc')}
            </p>

            {/* Timeframe Grid */}
            <div className="space-y-1.5">
              {(['scalp', 'intraday', 'swing', 'position'] as const).map(
                (category) => {
                  const categoryTfs = allTimeframes.filter(
                    (tf) => tf.category === category
                  )
                  return (
                    <div key={category} className="flex items-center gap-2">
                      <span
                        className="text-[10px] w-10 flex-shrink-0"
                        style={{ color: categoryColors[category] }}
                      >
                        {t(category)}
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {categoryTfs.map((tf) => {
                          const isSelected = selectedTimeframes.includes(
                            tf.value
                          )
                          const isPrimary =
                            config.klines.primary_timeframe === tf.value
                          return (
                            <button
                              key={tf.value}
                              onClick={() => toggleTimeframe(tf.value)}
                              onDoubleClick={() =>
                                setPrimaryTimeframe(tf.value)
                              }
                              disabled={disabled}
                              className={`inline-flex items-center gap-0.5 px-2 py-1 rounded-lg text-xs font-medium tabular-nums transition-all active:scale-[0.96] ${
                                isSelected ? '' : 'opacity-40 hover:opacity-70'
                              }`}
                              style={{
                                background: isPrimary
                                  ? 'linear-gradient(180deg, rgba(61,107,255,0.28), rgba(61,107,255,0.10))'
                                  : isSelected
                                    ? 'linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.02))'
                                    : 'transparent',
                                border: `1px solid ${isPrimary ? 'rgba(61,107,255,0.55)' : isSelected ? 'var(--panel-border)' : 'var(--surface-tertiary)'}`,
                                color: isSelected
                                  ? 'var(--text-primary)'
                                  : 'var(--text-secondary)',
                                boxShadow: isPrimary
                                  ? 'inset 0 1px 0 rgba(255,255,255,0.10), 0 0 12px rgba(61,107,255,0.30)'
                                  : isSelected
                                    ? 'inset 0 1px 0 rgba(255,255,255,0.06)'
                                    : undefined,
                              }}
                              title={
                                isPrimary ? `${tf.label} (Primary)` : tf.label
                              }
                            >
                              {tf.label}
                              {isPrimary && (
                                <HugeiconsIcon
                                  icon={StarIcon}
                                  size={9}
                                  strokeWidth={2.2}
                                  style={{ color: '#86efac' }}
                                />
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                }
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* Section 2: Technical Indicators (Optional)  */}
      {/* ============================================ */}
      <div className="gl-metal-panel rounded-2xl overflow-hidden">
        <div className="px-4 py-3 flex items-center gap-2 border-b border-[var(--panel-border)]">
          <div className="dash-ico shrink-0">
            <HugeiconsIcon icon={Activity01Icon} size={16} strokeWidth={1.9} />
          </div>
          <span
            className="text-sm font-semibold gl-metal-shine"
            style={{ animationDelay: '-1.2s' }}
          >
            {t('technicalIndicators')}
          </span>
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            - {t('technicalIndicatorsDesc')}
          </span>
        </div>

        <div className="p-3">
          {/* Tip */}
          <div
            className="flex items-start gap-2 mb-3 p-2.5 rounded-xl"
            style={{
              background:
                'linear-gradient(180deg, rgba(61,107,255,0.10), rgba(61,107,255,0.03))',
              border: '1px solid rgba(61,107,255,0.20)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
            }}
          >
            <HugeiconsIcon
              icon={InformationCircleIcon}
              size={14}
              strokeWidth={1.9}
              className="mt-0.5 flex-shrink-0"
              style={{ color: '#86efac' }}
            />
            <p
              className="text-[10px]"
              style={{ color: 'var(--text-secondary)' }}
            >
              {t('aiCanCalculate')}
            </p>
          </div>

          {/* Indicator Grid */}
          <div className="grid grid-cols-2 gap-2">
            {[
              {
                key: 'enable_ema',
                label: 'ema',
                desc: 'emaDesc',
                periodKey: 'ema_periods',
                defaultPeriods: '20,50',
              },
              { key: 'enable_macd', label: 'macd', desc: 'macdDesc' },
              {
                key: 'enable_rsi',
                label: 'rsi',
                desc: 'rsiDesc',
                periodKey: 'rsi_periods',
                defaultPeriods: '7,14',
              },
              {
                key: 'enable_atr',
                label: 'atr',
                desc: 'atrDesc',
                periodKey: 'atr_periods',
                defaultPeriods: '14',
              },
              {
                key: 'enable_boll',
                label: 'boll',
                desc: 'bollDesc',
                periodKey: 'boll_periods',
                defaultPeriods: '20',
              },
            ].map(({ key, label, desc, periodKey, defaultPeriods }) => {
              const isOn = config[key as keyof IndicatorConfig] as boolean
              return (
                <div
                  key={key}
                  className={`gl-onyx-panel rounded-xl overflow-hidden p-2.5 transition-all ${isOn ? 'ring-1 ring-[rgba(61,107,255,0.35)]' : ''}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <HugeiconsIcon
                        icon={Activity01Icon}
                        size={13}
                        strokeWidth={1.9}
                        style={{
                          color: isOn ? '#86efac' : 'var(--text-secondary)',
                        }}
                      />
                      <span
                        className="text-xs font-medium"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {t(label)}
                      </span>
                    </div>
                    <div
                      className="gl-switch"
                      data-on={isOn ? 'true' : 'false'}
                      onClick={() =>
                        !disabled && onChange({ ...config, [key]: !isOn })
                      }
                    />
                  </div>
                  <p
                    className="text-[10px] mb-1.5"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    {t(desc)}
                  </p>
                  {periodKey && isOn && (
                    <input
                      type="text"
                      value={
                        (
                          config[periodKey as keyof IndicatorConfig] as number[]
                        )?.join(',') || defaultPeriods
                      }
                      onChange={(e) => {
                        if (disabled) return
                        const periods = e.target.value
                          .split(',')
                          .map((s) => parseInt(s.trim()))
                          .filter((n) => !isNaN(n) && n > 0)
                        onChange({ ...config, [periodKey]: periods })
                      }}
                      disabled={disabled}
                      placeholder={defaultPeriods}
                      className="gl-input w-full text-[10px] text-center tabular-nums"
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* Section 3: Market Sentiment                 */}
      {/* ============================================ */}
      <div className="gl-metal-panel rounded-2xl overflow-hidden">
        <div className="px-4 py-3 flex items-center gap-2 border-b border-[var(--panel-border)]">
          <div className="dash-ico shrink-0">
            <HugeiconsIcon icon={TradeUpIcon} size={16} strokeWidth={1.9} />
          </div>
          <span
            className="text-sm font-semibold gl-metal-shine"
            style={{ animationDelay: '-2.4s' }}
          >
            {t('marketSentiment')}
          </span>
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            - {t('marketSentimentDesc')}
          </span>
        </div>

        <div className="p-3">
          <div className="grid grid-cols-3 gap-2">
            {[
              {
                key: 'enable_volume',
                label: 'volume',
                desc: 'volumeDesc',
                icon: ChartBarLineIcon,
              },
              {
                key: 'enable_oi',
                label: 'oi',
                desc: 'oiDesc',
                icon: DatabaseIcon,
              },
              {
                key: 'enable_funding_rate',
                label: 'fundingRate',
                desc: 'fundingRateDesc',
                icon: ArrowDataTransferHorizontalIcon,
              },
            ].map(({ key, label, desc, icon }) => {
              const isOn = config[key as keyof IndicatorConfig] as boolean
              return (
                <div
                  key={key}
                  className={`gl-onyx-panel rounded-xl overflow-hidden p-2.5 transition-all ${isOn ? 'ring-1 ring-[rgba(61,107,255,0.35)]' : ''}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <HugeiconsIcon
                        icon={icon}
                        size={13}
                        strokeWidth={1.9}
                        style={{
                          color: isOn ? '#86efac' : 'var(--text-secondary)',
                        }}
                      />
                      <span
                        className="text-xs font-medium"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {t(label)}
                      </span>
                    </div>
                    <div
                      className="gl-switch"
                      data-on={isOn ? 'true' : 'false'}
                      onClick={() =>
                        !disabled && onChange({ ...config, [key]: !isOn })
                      }
                    />
                  </div>
                  <p
                    className="text-[10px]"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    {t(desc)}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
