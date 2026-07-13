import { useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  ArrowUpRight01Icon,
  ArrowDownRight01Icon,
  Cancel01Icon,
  PauseIcon,
  Clock01Icon,
  Idea01Icon,
  CancelCircleIcon,
  CheckmarkCircle01Icon,
  Robot01Icon,
  Settings01Icon,
  Copy01Icon,
  Download01Icon,
  InboxIcon,
  AiBrain01Icon,
  BalanceScaleIcon,
} from '@hugeicons/core-free-icons'
import type { DecisionRecord, DecisionAction } from '../types'
import { t, type Language } from '../i18n/translations'

interface DecisionCardProps {
  decision: DecisionRecord
  language: Language
  onSymbolClick?: (symbol: string) => void
}

// Action type configuration - premium ghostlink badges
const ACTION_CONFIG: Record<
  string,
  { color: string; badge: string; Icon: typeof Robot01Icon; label: string }
> = {
  open_long: {
    color: '#0ECB81',
    badge: 'gl-badge--buy',
    Icon: ArrowUpRight01Icon,
    label: 'LONG',
  },
  open_short: {
    color: '#F6465D',
    badge: 'gl-badge--sell',
    Icon: ArrowDownRight01Icon,
    label: 'SHORT',
  },
  close_long: {
    color: 'var(--accent-primary)',
    badge: 'gl-badge--info',
    Icon: Cancel01Icon,
    label: 'CLOSE',
  },
  close_short: {
    color: 'var(--accent-primary)',
    badge: 'gl-badge--info',
    Icon: Cancel01Icon,
    label: 'CLOSE',
  },
  hold: {
    color: '#848E9C',
    badge: 'gl-badge--hold',
    Icon: PauseIcon,
    label: 'HOLD',
  },
  wait: {
    color: '#848E9C',
    badge: 'gl-badge--hold',
    Icon: Clock01Icon,
    label: 'WAIT',
  },
}

// Format price with proper decimals
function formatPrice(price: number | undefined): string {
  if (!price || price === 0) return '-'
  if (price >= 1000) return price.toFixed(2)
  if (price >= 1) return price.toFixed(4)
  return price.toFixed(6)
}

// Calculate percentage change
function calcPctChange(
  entry: number | undefined,
  target: number | undefined,
  isLong: boolean
): string {
  if (!entry || !target || entry === 0) return '-'
  const pct = ((target - entry) / entry) * 100
  const adjustedPct = isLong ? pct : -pct
  return `${adjustedPct >= 0 ? '+' : ''}${adjustedPct.toFixed(2)}%`
}

// Get confidence color
function getConfidenceColor(confidence: number | undefined): string {
  if (!confidence) return '#848E9C'
  if (confidence >= 80) return '#0ECB81'
  if (confidence >= 60) return 'var(--accent-primary)'
  return '#F6465D'
}

// Single Action Card Component
function ActionCard({
  action,
  language,
  onSymbolClick,
}: {
  action: DecisionAction
  language: Language
  onSymbolClick?: (symbol: string) => void
}) {
  const config = ACTION_CONFIG[action.action] || ACTION_CONFIG.wait
  const { Icon } = config
  const isLong = action.action.includes('long')
  const isOpen = action.action.includes('open')

  return (
    <div
      className="gl-onyx-panel rounded-xl p-4 overflow-hidden transition-all duration-200 hover:scale-[1.01]"
      style={{
        boxShadow: `0 6px 18px rgba(0, 0, 0, 0.28), inset 0 0 0 1px ${config.color}26`,
      }}
    >
      {/* Header Row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className={`gl-badge ${config.badge}`}>
            <HugeiconsIcon icon={Icon} size={14} strokeWidth={2} />
            {config.label}
          </span>
          <span
            className="gl-metal-text font-mono font-bold text-lg cursor-pointer transition-all duration-200 hover:scale-110"
            onClick={() => onSymbolClick?.(action.symbol)}
            title="Click to view chart"
          >
            {action.symbol.replace('USDT', '')}
          </span>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2">
          {action.confidence !== undefined && action.confidence > 0 && (
            <div
              className="px-2.5 py-1 rounded-md text-xs font-semibold tabular-nums"
              style={{
                background: `${getConfidenceColor(action.confidence)}1f`,
                color: getConfidenceColor(action.confidence),
                border: `1px solid ${getConfidenceColor(action.confidence)}3d`,
              }}
            >
              {action.confidence.toFixed(0)}%
            </div>
          )}
          <div
            className="w-2 h-2 rounded-full"
            style={{
              background: action.success
                ? 'var(--binance-green)'
                : 'var(--binance-red)',
              boxShadow: `0 0 8px ${action.success ? 'rgba(14,203,129,0.7)' : 'rgba(246,70,93,0.7)'}`,
            }}
          />
        </div>
      </div>

      {/* Trading Details Grid */}
      {isOpen && (
        <div
          className="grid grid-cols-4 gap-3 mt-3 pt-3"
          style={{ borderTop: '1px solid var(--panel-border)' }}
        >
          {/* Entry Price */}
          <div className="text-center">
            <div
              className="text-[10px] uppercase tracking-wider mb-1"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {t('entryPrice', language)}
            </div>
            <div className="gl-metal-text font-mono font-semibold tabular-nums">
              {formatPrice(action.price)}
            </div>
          </div>

          {/* Stop Loss */}
          <div className="text-center">
            <div
              className="text-[10px] uppercase tracking-wider mb-1"
              style={{ color: 'var(--binance-red)' }}
            >
              {t('stopLoss', language)}
            </div>
            <div
              className="font-mono font-semibold tabular-nums"
              style={{ color: 'var(--binance-red)' }}
            >
              {formatPrice(action.stop_loss)}
            </div>
            {action.stop_loss && action.price && (
              <div
                className="text-xs mt-0.5 tabular-nums"
                style={{ color: 'var(--text-secondary)' }}
              >
                {calcPctChange(action.price, action.stop_loss, isLong)}
              </div>
            )}
          </div>

          {/* Take Profit */}
          <div className="text-center">
            <div
              className="text-[10px] uppercase tracking-wider mb-1"
              style={{ color: 'var(--binance-green)' }}
            >
              {t('takeProfit', language)}
            </div>
            <div
              className="font-mono font-semibold tabular-nums"
              style={{ color: 'var(--binance-green)' }}
            >
              {formatPrice(action.take_profit)}
            </div>
            {action.take_profit && action.price && (
              <div
                className="text-xs mt-0.5 tabular-nums"
                style={{ color: 'var(--text-secondary)' }}
              >
                {calcPctChange(action.price, action.take_profit, isLong)}
              </div>
            )}
          </div>

          {/* Leverage */}
          <div className="text-center">
            <div
              className="text-[10px] uppercase tracking-wider mb-1"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {t('leverage', language)}
            </div>
            <div
              className="font-mono font-semibold tabular-nums"
              style={{ color: 'var(--eva-gold)' }}
            >
              {action.leverage}x
            </div>
          </div>
        </div>
      )}

      {/* Risk/Reward Ratio for open positions */}
      {isOpen && action.stop_loss && action.take_profit && action.price && (
        <div
          className="mt-3 pt-3 flex items-center justify-between"
          style={{ borderTop: '1px solid var(--panel-border)' }}
        >
          <span
            className="text-xs flex items-center gap-1.5 uppercase tracking-wider"
            style={{ color: 'var(--text-tertiary)' }}
          >
            <HugeiconsIcon
              icon={BalanceScaleIcon}
              size={14}
              strokeWidth={1.9}
            />
            {t('riskReward', language)}
          </span>
          <div className="flex items-center gap-2">
            {(() => {
              const slDist = Math.abs(action.price - action.stop_loss)
              const tpDist = Math.abs(action.take_profit - action.price)
              const ratio = slDist > 0 ? tpDist / slDist : 0
              const ratioColor =
                ratio >= 3
                  ? 'var(--binance-green)'
                  : ratio >= 2
                    ? 'var(--eva-gold)'
                    : 'var(--binance-red)'
              return (
                <>
                  <div className="flex gap-1 font-mono font-semibold tabular-nums">
                    <span style={{ color: 'var(--binance-red)' }}>1</span>
                    <span style={{ color: 'var(--text-secondary)' }}>:</span>
                    <span style={{ color: 'var(--binance-green)' }}>
                      {ratio.toFixed(1)}
                    </span>
                  </div>
                  <div
                    className="h-1.5 rounded-full overflow-hidden"
                    style={{
                      width: '60px',
                      background: 'var(--surface-primary)',
                      boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.4)',
                    }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min((ratio / 5) * 100, 100)}%`,
                        background: ratioColor,
                        boxShadow: `0 0 8px ${ratioColor}`,
                      }}
                    />
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      )}

      {/* Reasoning */}
      {action.reasoning && (
        <div
          className="mt-3 pt-3"
          style={{ borderTop: '1px solid var(--panel-border)' }}
        >
          <div
            className="text-xs line-clamp-2 flex items-start gap-2"
            style={{ color: 'var(--text-secondary)' }}
          >
            <HugeiconsIcon
              icon={Idea01Icon}
              size={14}
              strokeWidth={1.9}
              className="shrink-0 mt-0.5"
              style={{ color: 'var(--accent-primary)' }}
            />
            {action.reasoning}
          </div>
        </div>
      )}

      {/* Error Message */}
      {action.error && (
        <div
          className="mt-3 rounded-lg p-2.5 text-xs"
          style={{
            background: 'var(--binance-red-bg)',
            border: '1px solid rgba(246, 70, 93, 0.3)',
            color: 'var(--binance-red)',
          }}
        >
          <span className="flex items-center gap-2">
            <HugeiconsIcon
              icon={CancelCircleIcon}
              size={14}
              strokeWidth={1.9}
              className="shrink-0"
            />
            {action.error}
          </span>
        </div>
      )}
    </div>
  )
}

// Collapsible prompt section — toggle + actions are sibling controls (valid DOM nesting)
function PromptSection({
  title,
  icon,
  accentColor,
  accentBg,
  accentBorder,
  content,
  expanded,
  onToggle,
  onCopy,
  onDownload,
  language,
}: {
  title: string
  icon: typeof Settings01Icon
  accentColor: string
  accentBg: string
  accentBorder: string
  content: string
  expanded: boolean
  onToggle: () => void
  onCopy: () => void
  onDownload: () => void
  language: Language
}) {
  return (
    <div>
      <div className="flex items-center gap-2 w-full p-2.5 rounded-lg hover:bg-white/5">
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center gap-2 flex-1 min-w-0 text-sm text-left transition-colors"
        >
          <HugeiconsIcon
            icon={icon}
            size={16}
            strokeWidth={1.9}
            className="shrink-0"
            style={{ color: accentColor }}
          />
          <span className="font-semibold" style={{ color: accentColor }}>
            {title}
          </span>
          <span
            className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-md ml-auto"
            style={{ background: accentBg, color: accentColor }}
          >
            {expanded ? t('collapse', language) : t('expand', language)}
          </span>
        </button>
        <button
          type="button"
          onClick={onCopy}
          className="text-xs px-2 py-1.5 rounded-md hover:opacity-80 active:scale-95 transition-all flex items-center gap-1 shrink-0"
          style={{
            background: accentBg,
            color: accentColor,
            border: `1px solid ${accentBorder}`,
          }}
          title="Copy to clipboard"
        >
          <HugeiconsIcon icon={Copy01Icon} size={14} strokeWidth={1.9} />
        </button>
        <button
          type="button"
          onClick={onDownload}
          className="text-xs px-2 py-1.5 rounded-md hover:opacity-80 active:scale-95 transition-all flex items-center gap-1 shrink-0"
          style={{
            background: accentBg,
            color: accentColor,
            border: `1px solid ${accentBorder}`,
          }}
          title="Download as file"
        >
          <HugeiconsIcon icon={Download01Icon} size={14} strokeWidth={1.9} />
        </button>
      </div>
      {expanded && (
        <div
          className="dash-scroll mt-2 rounded-lg p-4 text-sm font-mono whitespace-pre-wrap max-h-96 overflow-y-auto"
          style={{
            background: 'var(--surface-primary)',
            border: '1px solid var(--panel-border)',
            color: 'var(--text-secondary)',
          }}
        >
          {content}
        </div>
      )}
    </div>
  )
}

export function DecisionCard({
  decision,
  language,
  onSymbolClick,
}: DecisionCardProps) {
  const [showSystemPrompt, setShowSystemPrompt] = useState(false)
  const [showInputPrompt, setShowInputPrompt] = useState(false)
  const [showCoT, setShowCoT] = useState(false)

  // Copy text to clipboard
  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      alert(`${label} copied!`)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  // Download text as file
  const downloadAsFile = (text: string, filename: string) => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="gl-metal-panel rounded-2xl p-5 overflow-hidden transition-all duration-300 hover:translate-y-[-2px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="dash-kpi-ico">
            <HugeiconsIcon icon={Robot01Icon} size={20} strokeWidth={1.9} />
          </div>
          <div>
            <div className="gl-metal-text font-bold tabular-nums">
              {t('cycle', language)} #{decision.cycle_number}
            </div>
            <div
              className="text-xs flex items-center gap-1.5"
              style={{ color: 'var(--text-tertiary)' }}
            >
              <HugeiconsIcon icon={Clock01Icon} size={12} strokeWidth={1.9} />
              {new Date(decision.timestamp).toLocaleString()}
            </div>
          </div>
        </div>
        <div
          className={`gl-badge ${decision.success ? 'gl-badge--buy' : 'gl-badge--sell'}`}
        >
          <HugeiconsIcon
            icon={decision.success ? CheckmarkCircle01Icon : CancelCircleIcon}
            size={13}
            strokeWidth={2}
          />
          {t(decision.success ? 'success' : 'failed', language)}
        </div>
      </div>

      {/* Decision Actions - Beautiful Grid */}
      {decision.decisions && decision.decisions.length > 0 && (
        <div className="space-y-3 mb-4">
          {decision.decisions.map((action, index) => (
            <ActionCard
              key={`${action.symbol}-${index}`}
              action={action}
              language={language}
              onSymbolClick={onSymbolClick}
            />
          ))}
        </div>
      )}

      {/* Collapsible Sections */}
      <div className="space-y-2">
        {/* System Prompt */}
        {decision.system_prompt && (
          <PromptSection
            title="System Prompt"
            icon={Settings01Icon}
            accentColor="#a78bfa"
            accentBg="rgba(167, 139, 250, 0.12)"
            accentBorder="rgba(167, 139, 250, 0.3)"
            content={decision.system_prompt}
            expanded={showSystemPrompt}
            onToggle={() => setShowSystemPrompt(!showSystemPrompt)}
            onCopy={() =>
              copyToClipboard(decision.system_prompt, 'System Prompt')
            }
            onDownload={() =>
              downloadAsFile(
                decision.system_prompt,
                `system-prompt-cycle-${decision.cycle_number}.txt`
              )
            }
            language={language}
          />
        )}

        {decision.input_prompt && (
          <PromptSection
            title="User Prompt"
            icon={InboxIcon}
            accentColor="#4ade80"
            accentBg="rgba(74, 222, 128, 0.12)"
            accentBorder="rgba(74, 222, 128, 0.3)"
            content={decision.input_prompt}
            expanded={showInputPrompt}
            onToggle={() => setShowInputPrompt(!showInputPrompt)}
            onCopy={() => copyToClipboard(decision.input_prompt, 'User Prompt')}
            onDownload={() =>
              downloadAsFile(
                decision.input_prompt,
                `user-prompt-cycle-${decision.cycle_number}.txt`
              )
            }
            language={language}
          />
        )}

        {/* AI Thinking */}
        {decision.cot_trace && (
          <div>
            <button
              onClick={() => setShowCoT(!showCoT)}
              className="flex items-center gap-2 text-sm transition-colors w-full justify-between p-2.5 rounded-lg hover:bg-white/5"
            >
              <div className="flex items-center gap-2">
                <HugeiconsIcon
                  icon={AiBrain01Icon}
                  size={16}
                  strokeWidth={1.9}
                  className="shrink-0"
                  style={{ color: 'var(--eva-gold)' }}
                />
                <span
                  className="font-semibold"
                  style={{ color: 'var(--eva-gold)' }}
                >
                  {t('aiThinking', language)}
                </span>
              </div>
              <span
                className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-md"
                style={{
                  background: 'var(--eva-border)',
                  color: 'var(--eva-gold)',
                }}
              >
                {showCoT ? t('collapse', language) : t('expand', language)}
              </span>
            </button>
            {showCoT && (
              <div
                className="dash-scroll mt-2 rounded-lg p-4 text-sm font-mono whitespace-pre-wrap max-h-96 overflow-y-auto"
                style={{
                  background: 'var(--surface-primary)',
                  border: '1px solid var(--panel-border)',
                  color: 'var(--text-secondary)',
                }}
              >
                {decision.cot_trace}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Execution Log */}
      {decision.execution_log && decision.execution_log.length > 0 && (
        <div
          className="dash-scroll rounded-lg p-3 mt-4 text-xs font-mono space-y-1 max-h-60 overflow-y-auto"
          style={{
            background: 'var(--surface-primary)',
            border: '1px solid var(--panel-border)',
          }}
        >
          {decision.execution_log.map((log, index) => (
            <div
              key={`${log}-${index}`}
              style={{ color: 'var(--text-secondary)' }}
            >
              {log}
            </div>
          ))}
        </div>
      )}

      {/* Error Message */}
      {decision.error_message && (
        <div
          className="rounded-lg p-3 mt-4 text-sm flex items-center gap-2"
          style={{
            background: 'var(--binance-red-bg)',
            border: '1px solid rgba(246, 70, 93, 0.4)',
            color: 'var(--binance-red)',
          }}
        >
          <HugeiconsIcon
            icon={CancelCircleIcon}
            size={16}
            strokeWidth={1.9}
            className="shrink-0"
          />
          {decision.error_message}
        </div>
      )}
    </div>
  )
}
