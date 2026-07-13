import { useState, useEffect, useRef } from 'react'
import useSWR from 'swr'
import { api } from '../lib/api'
import { notify } from '../lib/notify'
import { useLanguage } from '../contexts/LanguageContext'
import { useAuth } from '../contexts/AuthContext'
import { PunkAvatar } from '../components/PunkAvatar'
import type {
  DebateSession,
  DebateSessionWithDetails,
  DebateMessage,
  CreateDebateRequest,
  AIModel,
  Strategy,
  DebatePersonality,
  TraderInfo,
} from '../types'
import { Loader2 } from 'lucide-react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Add01Icon,
  Cancel01Icon,
  TradeUpIcon,
  TradeDownIcon,
  MinusSignIcon,
  Clock01Icon,
  FlashIcon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  ChartBarLineIcon,
  RefreshIcon,
  Shield01Icon,
  Delete02Icon,
  PlayIcon,
  AlertCircleIcon,
  BubbleChatIcon,
  UserGroupIcon,
  JusticeScale01Icon,
  Robot01Icon,
  CheckmarkCircle01Icon,
} from '@hugeicons/core-free-icons'
import { EmptyState } from '../components/dash/DashKit'
import { DeepVoidBackground } from '../components/DeepVoidBackground'
import { ModelAvatar } from '../components/ModelIcons'

// Translations
const T: Record<string, Record<string, string>> = {
  newDebate: { zh: '新建辩论', en: 'New Debate' },
  debateSessions: { zh: '辩论会话', en: 'Sessions' },
  onlineTraders: { zh: '在线交易员', en: 'Online Traders' },
  offline: { zh: '离线', en: 'Offline' },
  noTraders: { zh: '暂无交易员', en: 'No traders' },
  start: { zh: '开始', en: 'Start' },
  delete: { zh: '删除', en: 'Delete' },
  deleteConfirm: {
    zh: '确定删除「{name}」？此操作无法撤销。',
    en: 'Delete "{name}"? This cannot be undone.',
  },
  cannotDeleteRunning: {
    zh: '进行中的辩论无法删除',
    en: 'Cannot delete a running debate',
  },
  notOwner: {
    zh: '只有创建者可以执行此操作',
    en: 'Only the creator can do this',
  },
  deleteFailed: { zh: '删除失败', en: 'Failed to delete' },
  discussionRecords: { zh: '讨论记录', en: 'Discussion' },
  finalVotes: { zh: '最终投票', en: 'Final Votes' },
  consensus: { zh: '共识', en: 'Consensus' },
  confidence: { zh: '信心', en: 'Confidence' },
  leverage: { zh: '杠杆', en: 'Leverage' },
  position: { zh: '仓位', en: 'Position' },
  execute: { zh: '执行', en: 'Execute' },
  executed: { zh: '已执行', en: 'Executed' },
  selectOrCreate: { zh: '选择或创建辩论', en: 'Select or create a debate' },
  clickToStart: { zh: '点击左侧"开始"启动辩论', en: 'Click "Start" to begin' },
  waitingForCreator: {
    zh: '等待创建者开始辩论',
    en: 'Waiting for the creator to start',
  },
  yours: { zh: '我的', en: 'Yours' },
  waitingAI: { zh: '等待AI发言...', en: 'Waiting for AI to start...' },
  debateFailed: {
    zh: '辩论失败 - AI模型调用出错。请检查 配置 → AI模型 中的API密钥与模型名称。',
    en: 'Debate failed - AI provider errors. Check Config → AI Models (API key & model name).',
  },
  createDebate: { zh: '创建辩论', en: 'Create Debate' },
  debateName: { zh: '辩论名称', en: 'Debate Name' },
  tradingPair: { zh: '交易对', en: 'Trading Pair' },
  strategy: { zh: '策略', en: 'Strategy' },
  rounds: { zh: '轮数', en: 'Rounds' },
  participants: { zh: '参与者', en: 'Participants' },
  addAI: { zh: '添加AI', en: 'Add AI' },
  cancel: { zh: '取消', en: 'Cancel' },
  create: { zh: '创建', en: 'Create' },
  creating: { zh: '创建中...', en: 'Creating...' },
  executeTitle: { zh: '执行交易', en: 'Execute Trade' },
  selectTrader: { zh: '选择交易员', en: 'Select Trader' },
  executing: { zh: '执行中...', en: 'Executing...' },
  fillNameAdd2AI: {
    zh: '请填写名称并添加至少2个AI',
    en: 'Please fill name and add at least 2 AI',
  },
  createSuccess: { zh: '创建成功', en: 'Created successfully' },
  startSuccess: { zh: '已开始', en: 'Debate started' },
  deleteSuccess: { zh: '已删除', en: 'Deleted' },
  executeSuccess: { zh: '已执行', en: 'Executed' },
  reasoning: { zh: '思考过程', en: 'Reasoning' },
  decisionSection: { zh: '交易决策', en: 'Decision' },
  symbolLabel: { zh: '币种', en: 'Symbol' },
  direction: { zh: '方向', en: 'Direction' },
  stopLoss: { zh: '止损', en: 'Stop Loss' },
  takeProfit: { zh: '止盈', en: 'Take Profit' },
  fullOutput: { zh: '完整输出', en: 'Full Output' },
  multiCoinDecisions: { zh: '多币种决策', en: 'Multi-coin decisions' },
  tradingPairPlaceholder: {
    zh: '交易对 (如 BTCUSDT，留空自动选择)',
    en: 'Trading pair (e.g. BTCUSDT, empty = auto)',
  },
  pickFromStrategy: { zh: '从策略币种快速选择', en: 'Pick from strategy coins' },
  pickOption: { zh: '选...', en: 'Pick...' },
  roundsSuffix: { zh: '轮', en: 'rounds' },
  executeRealTradeWarning: {
    zh: '将使用账户余额执行真实交易',
    en: 'Will execute real trade with account balance',
  },
}
const t = (key: string, lang: string) => T[key]?.[lang] || T[key]?.en || key

// Personality config - professional Hugeicons, clean (no colors)
const PERS: Record<
  DebatePersonality,
  { icon: typeof TradeUpIcon; name: string; nameEn: string }
> = {
  bull: { icon: TradeUpIcon, name: '多头', nameEn: 'Bull' },
  bear: { icon: TradeDownIcon, name: '空头', nameEn: 'Bear' },
  analyst: { icon: ChartBarLineIcon, name: '分析', nameEn: 'Analyst' },
  contrarian: { icon: RefreshIcon, name: '逆势', nameEn: 'Contrarian' },
  risk_manager: { icon: Shield01Icon, name: '风控', nameEn: 'Risk Mgr' },
}

// Action config
const ACT: Record<
  string,
  { color: string; bg: string; icon: JSX.Element; label: string }
> = {
  open_long: {
    color: 'text-green-400',
    bg: 'bg-green-500/20',
    icon: <HugeiconsIcon icon={TradeUpIcon} size={14} strokeWidth={2} />,
    label: 'LONG',
  },
  open_short: {
    color: 'text-red-400',
    bg: 'bg-red-500/20',
    icon: <HugeiconsIcon icon={TradeDownIcon} size={14} strokeWidth={2} />,
    label: 'SHORT',
  },
  hold: {
    color: 'text-green-400',
    bg: 'bg-green-500/20',
    icon: <HugeiconsIcon icon={MinusSignIcon} size={14} strokeWidth={2} />,
    label: 'HOLD',
  },
  wait: {
    color: 'text-gray-400',
    bg: 'bg-gray-500/20',
    icon: <HugeiconsIcon icon={Clock01Icon} size={14} strokeWidth={2} />,
    label: 'WAIT',
  },
  close_long: {
    color: 'text-green-400',
    bg: 'bg-green-500/20',
    icon: <HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={2} />,
    label: 'CLOSE',
  },
  close_short: {
    color: 'text-green-400',
    bg: 'bg-green-500/20',
    icon: <HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={2} />,
    label: 'CLOSE',
  },
}

// Status colors
const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-gray-500',
  running: 'bg-green-500 animate-pulse',
  voting: 'bg-green-500 animate-pulse',
  completed: 'bg-green-500',
  cancelled: 'bg-red-500',
}

const canDeleteDebate = (status: DebateSession['status']) =>
  status !== 'running' && status !== 'voting'

const isDebateOwner = (
  debate: Pick<DebateSession, 'user_id'>,
  userId?: string | null
) => !!userId && debate.user_id === userId

// Message Card - Full content display like AI Testing
function MessageCard({
  msg,
  language,
}: {
  msg: DebateMessage
  language: string
}) {
  const [open, setOpen] = useState(false)
  const p = PERS[msg.personality] || PERS.analyst
  const a = ACT[msg.decision?.action || 'wait'] || ACT.wait

  // Parse content into sections
  const parseContent = (c: string) => {
    const reasoning = c
      .match(/<reasoning>([\s\S]*?)<\/reasoning>/i)?.[1]
      ?.trim()
    const analysis = c.match(/<analysis>([\s\S]*?)<\/analysis>/i)?.[1]?.trim()
    const argument = c.match(/<argument>([\s\S]*?)<\/argument>/i)?.[1]?.trim()
    const decision = c.match(/<decision>([\s\S]*?)<\/decision>/i)?.[1]?.trim()

    // Clean content - remove XML tags
    const cleanContent = c.replace(/<\/?[^>]+(>|$)/g, '').trim()

    return {
      reasoning: reasoning || analysis || argument,
      decision,
      fullContent: cleanContent,
    }
  }

  const parsed = parseContent(msg.content)
  const previewText =
    parsed.reasoning?.slice(0, 150) || parsed.fullContent.slice(0, 150)

  return (
    <div className="gl-onyx-panel rounded-xl p-3 overflow-hidden hover:bg-[var(--surface-secondary)]/40 transition-all debate-message-card">
      {/* Header - Always visible */}
      <div
        className="flex items-center gap-2 cursor-pointer"
        onClick={() => setOpen(!open)}
      >
        <ModelAvatar
          name={msg.ai_model_name}
          provider={msg.provider}
          size={24}
        />
        <span className="text-sm text-[var(--text-primary)] font-medium">
          {msg.ai_model_name}
        </span>
        <span className="inline-flex items-center gap-1 text-xs text-[var(--text-secondary)]">
          <HugeiconsIcon icon={p.icon} size={12} strokeWidth={1.9} /> {p.nameEn}
        </span>
        <div className="flex-1" />
        {msg.decision && (
          <span
            className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded ${a.bg} ${a.color}`}
          >
            {a.icon} {msg.decision.symbol || ''} {a.label}
          </span>
        )}
        <span className="text-xs debate-accent font-medium tabular-nums">
          {msg.decision?.confidence || msg.confidence}%
        </span>
        <HugeiconsIcon
          icon={open ? ArrowUp01Icon : ArrowDown01Icon}
          size={14}
          strokeWidth={1.9}
          className="text-[var(--text-secondary)]"
        />
      </div>

      {/* Preview when collapsed */}
      {!open && (
        <div className="mt-2 text-xs text-gray-400 line-clamp-2">
          {previewText}...
        </div>
      )}

      {/* Expanded Content - Full display */}
      {open && (
        <div className="mt-3 space-y-3">
          {/* Reasoning/Analysis Section */}
          {parsed.reasoning && (
            <div className="bg-black/20 rounded-lg p-3">
              <div className="flex items-center gap-1.5 text-xs text-green-400 font-medium mb-2">
                <HugeiconsIcon
                  icon={BubbleChatIcon}
                  size={13}
                  strokeWidth={1.9}
                />{' '}
                {t('reasoning', language)}
              </div>
              <div className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto select-text">
                {parsed.reasoning}
              </div>
            </div>
          )}

          {/* Decision Section */}
          {msg.decision && (
            <div className="bg-black/20 rounded-lg p-3">
              <div className="flex items-center gap-1.5 text-xs text-green-400 font-medium mb-2">
                <HugeiconsIcon
                  icon={ChartBarLineIcon}
                  size={13}
                  strokeWidth={1.9}
                />{' '}
                {t('decisionSection', language)}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {msg.decision.symbol && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">
                      {t('symbolLabel', language)}
                    </span>
                    <span className="text-white font-medium">
                      {msg.decision.symbol}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('direction', language)}</span>
                  <span className={a.color}>{a.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">
                    {t('confidence', language)}
                  </span>
                  <span className="text-green-400">
                    {msg.decision.confidence}%
                  </span>
                </div>
                {(msg.decision.leverage ?? 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">
                      {t('leverage', language)}
                    </span>
                    <span className="text-white">{msg.decision.leverage}x</span>
                  </div>
                )}
                {(msg.decision.position_pct ?? 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">
                      {t('position', language)}
                    </span>
                    <span className="text-white">
                      {((msg.decision.position_pct ?? 0) * 100).toFixed(0)}%
                    </span>
                  </div>
                )}
                {(msg.decision.stop_loss ?? 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">
                      {t('stopLoss', language)}
                    </span>
                    <span className="text-red-400">
                      {((msg.decision.stop_loss ?? 0) * 100).toFixed(1)}%
                    </span>
                  </div>
                )}
                {(msg.decision.take_profit ?? 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">
                      {t('takeProfit', language)}
                    </span>
                    <span className="text-green-400">
                      {((msg.decision.take_profit ?? 0) * 100).toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
              {msg.decision.reasoning && (
                <div className="mt-2 pt-2 border-t border-white/10 text-xs text-gray-400">
                  {msg.decision.reasoning}
                </div>
              )}
            </div>
          )}

          {/* Full Raw Content (collapsible) */}
          {!parsed.reasoning && (
            <div className="bg-black/20 rounded-lg p-3">
              <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium mb-2">
                <HugeiconsIcon icon={Robot01Icon} size={13} strokeWidth={1.9}                 />{' '}
                {t('fullOutput', language)}
              </div>
              <div className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto select-text">
                {parsed.fullContent}
              </div>
            </div>
          )}

          {/* Multi-coin decisions if available */}
          {msg.decisions && msg.decisions.length > 1 && (
            <div className="bg-black/20 rounded-lg p-3">
              <div className="flex items-center gap-1.5 text-xs text-purple-400 font-medium mb-2">
                <HugeiconsIcon icon={Robot01Icon} size={13} strokeWidth={1.9}                 />{' '}
                {t('multiCoinDecisions', language)} ({msg.decisions.length})
              </div>
              <div className="space-y-2">
                {msg.decisions.map((d, i) => {
                  const da = ACT[d.action] || ACT.wait
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between text-xs p-2 bg-white/5 rounded"
                    >
                      <span className="text-white font-medium">{d.symbol}</span>
                      <span className={da.color}>
                        {da.icon} {da.label}
                      </span>
                      <span className="text-green-400">{d.confidence}%</span>
                      <span className="text-gray-400">
                        {d.leverage || 0}x /{' '}
                        {((d.position_pct || 0) * 100).toFixed(0)}%
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Personality dropdown with professional icons
function PersonalitySelect({
  value,
  onChange,
  language,
}: {
  value: DebatePersonality
  onChange: (p: DebatePersonality) => void
  language: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('click', onOutside)
    return () => document.removeEventListener('click', onOutside)
  }, [open])
  const p = PERS[value] || PERS.analyst
  return (
    <div ref={ref} className="relative w-1/2 min-w-[160px]">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--surface-primary)] debate-input text-[var(--text-primary)] text-sm outline-none cursor-pointer hover:opacity-90 text-left"
      >
        <HugeiconsIcon
          icon={p.icon}
          size={13}
          strokeWidth={1.9}
          className="text-[var(--text-secondary)] shrink-0"
        />
        {language === 'zh' ? p.name : p.nameEn}
        <HugeiconsIcon
          icon={ArrowDown01Icon}
          size={12}
          strokeWidth={1.9}
          className="opacity-60 ml-auto shrink-0"
        />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full mt-0.5 z-50 py-1 rounded-lg bg-[var(--surface-primary)] border border-[var(--panel-border)] shadow-xl">
          {(Object.entries(PERS) as [DebatePersonality, typeof p][]).map(
            ([k, v]) => {
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => {
                    onChange(k)
                    setOpen(false)
                  }}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 text-xs text-left text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] ${k === value ? 'bg-[var(--surface-secondary)]/50' : ''}`}
                >
                  <HugeiconsIcon
                    icon={v.icon}
                    size={13}
                    strokeWidth={1.9}
                    className="text-[var(--text-secondary)]"
                  />
                  {language === 'zh' ? v.name : v.nameEn}
                </button>
              )
            }
          )}
        </div>
      )}
    </div>
  )
}

// Strategy dropdown - custom styled list matching model dropdown
function StrategySelect({
  value,
  onChange,
  strategies,
  className,
}: {
  value: string
  onChange: (id: string) => void
  strategies: Strategy[]
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('click', onOutside)
    return () => document.removeEventListener('click', onOutside)
  }, [open])
  const selected = strategies.find((s) => s.id === value)
  return (
    <div ref={ref} className={`relative ${className || 'w-full'}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[var(--surface-primary)] debate-input text-[var(--text-primary)] text-sm outline-none cursor-pointer hover:opacity-90 text-left"
      >
        <span className="truncate">
          {selected?.name || 'Select strategy...'}
        </span>
        <HugeiconsIcon
          icon={ArrowDown01Icon}
          size={14}
          strokeWidth={1.9}
          className="opacity-60 shrink-0"
        />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full mt-0.5 z-[100] py-1 rounded-lg bg-[var(--surface-primary)] border border-[var(--panel-border)] shadow-xl debate-input max-h-60 overflow-y-auto">
          {strategies.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                onChange(s.id)
                setOpen(false)
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] ${s.id === value ? 'bg-[var(--surface-secondary)]/50' : ''}`}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// AI Model dropdown - custom styled to match strategy dropdown list
function ModelSelect({
  value,
  onChange,
  aiModels,
  className,
}: {
  value: string
  onChange: (id: string) => void
  aiModels: AIModel[]
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('click', onOutside)
    return () => document.removeEventListener('click', onOutside)
  }, [open])
  const selected = aiModels.find((m) => m.id === value)
  return (
    <div ref={ref} className={`relative ${className || 'w-1/2 min-w-[160px]'}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[var(--surface-primary)] debate-input text-[var(--text-primary)] text-sm outline-none cursor-pointer hover:opacity-90 text-left"
      >
        <span className="truncate">{selected?.name || 'Select...'}</span>
        <HugeiconsIcon
          icon={ArrowDown01Icon}
          size={14}
          strokeWidth={1.9}
          className="opacity-60 shrink-0"
        />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full mt-0.5 z-[100] py-1 rounded-lg bg-[var(--surface-primary)] border border-[var(--panel-border)] shadow-xl debate-input max-h-60 overflow-y-auto">
          {aiModels.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                onChange(m.id)
                setOpen(false)
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] ${m.id === value ? 'bg-[var(--surface-secondary)]/50' : ''}`}
            >
              {m.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Vote Card - Beautiful detailed version
function VoteCard({
  vote,
}: {
  vote: {
    ai_model_name: string
    provider?: string
    action: string
    symbol?: string
    confidence: number
    leverage?: number
    position_pct?: number
    stop_loss_pct?: number
    take_profit_pct?: number
    reasoning: string
  }
}) {
  const a = ACT[vote.action] || ACT.wait
  const confColor =
    vote.confidence >= 70
      ? 'bg-green-500'
      : vote.confidence >= 50
        ? 'bg-green-500'
        : 'bg-gray-500'
  return (
    <div className="bg-[var(--surface-secondary)]/40 backdrop-blur-md rounded-xl p-4 debate-vote-card transition-all shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ModelAvatar
            name={vote.ai_model_name}
            provider={vote.provider}
            size={28}
          />
          <div>
            <span className="text-[var(--text-primary)] font-semibold block">
              {vote.ai_model_name}
            </span>
            {vote.symbol && (
              <span className="text-xs text-[var(--text-secondary)]">
                {vote.symbol}
              </span>
            )}
          </div>
        </div>
        <span
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${a.bg} ${a.color}`}
        >
          {a.icon} {vote.action.replace('_', ' ').toUpperCase()}
        </span>
      </div>
      <div className="mb-3">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-400">Confidence</span>
          <span className="text-white font-bold">{vote.confidence}%</span>
        </div>
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${confColor} rounded-full transition-all`}
            style={{ width: `${vote.confidence}%` }}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-[var(--text-secondary)]">Leverage</span>
          <span className="text-[var(--text-primary)] font-semibold">
            {vote.leverage || '-'}x
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--text-secondary)]">Position</span>
          <span className="text-[var(--text-primary)] font-semibold">
            {vote.position_pct
              ? `${(vote.position_pct * 100).toFixed(0)}%`
              : '-'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--text-secondary)]">SL</span>
          <span className="text-red-400 font-semibold">
            {vote.stop_loss_pct
              ? `${(vote.stop_loss_pct * 100).toFixed(1)}%`
              : '-'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--text-secondary)]">TP</span>
          <span className="text-green-400 font-semibold">
            {vote.take_profit_pct
              ? `${(vote.take_profit_pct * 100).toFixed(1)}%`
              : '-'}
          </span>
        </div>
      </div>
      {vote.reasoning && (
        <p className="mt-3 text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-2 border-t border-[var(--panel-border)] pt-2">
          {vote.reasoning}
        </p>
      )}
    </div>
  )
}

// Create Modal (simplified)
function CreateModal({
  isOpen,
  onClose,
  onCreate,
  aiModels,
  strategies,
  language,
}: {
  isOpen: boolean
  onClose: () => void
  onCreate: (r: CreateDebateRequest) => Promise<void>
  aiModels: AIModel[]
  strategies: Strategy[]
  language: string
}) {
  const [name, setName] = useState('')
  const [symbol, setSymbol] = useState('')
  const [strategyId, setStrategyId] = useState('')
  const [maxRounds, setMaxRounds] = useState(3)
  const [participants, setParticipants] = useState<
    { ai_model_id: string; personality: DebatePersonality }[]
  >([])
  const [creating, setCreating] = useState(false)

  // Get the selected strategy's coin source config
  const selectedStrategy = strategies.find((s) => s.id === strategyId)
  const coinSource = selectedStrategy?.config?.coin_source
  const sourceType = coinSource?.source_type || 'static'
  const staticCoins = coinSource?.static_coins || []
  // Only show coin selector for static type with coins defined
  const isStaticWithCoins = sourceType === 'static' && staticCoins.length > 0

  useEffect(() => {
    if (isOpen && strategies && strategies.length > 0) {
      const firstStrategy = strategies[0]
      const firstStrategyId = firstStrategy?.id || ''
      const firstCoinSource = firstStrategy?.config?.coin_source
      const firstSourceType = firstCoinSource?.source_type || 'static'
      const firstStaticCoins = firstCoinSource?.static_coins || []
      setName('')
      setStrategyId(firstStrategyId)
      // Only set symbol for static type, otherwise leave empty (backend will choose)
      setSymbol(
        firstSourceType === 'static' && firstStaticCoins.length > 0
          ? firstStaticCoins[0]
          : ''
      )
      setMaxRounds(3)
      setParticipants([])
    }
  }, [isOpen, strategies])

  // Update symbol when strategy changes (not when user types)
  const prevStrategyId = useRef(strategyId)
  useEffect(() => {
    if (prevStrategyId.current !== strategyId) {
      prevStrategyId.current = strategyId
      if (isStaticWithCoins && staticCoins.length > 0) {
        setSymbol(staticCoins[0])
      } else {
        setSymbol('')
      }
    }
  }, [strategyId, isStaticWithCoins, staticCoins])

  const addP = () => {
    if (participants.length >= 10 || aiModels.length === 0) return
    // Allow same AI model to be used multiple times with different personalities
    const order: DebatePersonality[] = [
      'bull',
      'bear',
      'analyst',
      'contrarian',
      'risk_manager',
    ]
    // Cycle through personalities
    const nextPersonality = order[participants.length % order.length]
    setParticipants([
      ...participants,
      { ai_model_id: aiModels[0].id, personality: nextPersonality },
    ])
  }

  const submit = async () => {
    if (!name || !strategyId || participants.length < 2) {
      notify.error(t('fillNameAdd2AI', language))
      return
    }
    setCreating(true)
    try {
      await onCreate({
        name,
        symbol,
        strategy_id: strategyId,
        max_rounds: maxRounds,
        participants,
      })
      onClose()
    } finally {
      setCreating(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-[var(--surface-secondary)] shadow-xl rounded-xl w-full max-w-2xl mx-4 p-6 sm:p-8 debate-modal">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold gl-metal-text">
            {t('createDebate', language)}
          </h3>
          <button onClick={onClose} className="dash-close-btn">
            <HugeiconsIcon icon={Cancel01Icon} size={18} strokeWidth={2} />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('debateName', language)}
            className="w-full block px-3 py-2 rounded-lg bg-[var(--surface-primary)] debate-input text-[var(--text-primary)] text-sm"
          />

          <StrategySelect
            value={strategyId}
            onChange={setStrategyId}
            strategies={strategies || []}
          />

          <input
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            placeholder={t('tradingPairPlaceholder', language)}
            className="w-full block px-3 py-2 rounded-lg bg-[var(--surface-primary)] debate-input text-[var(--text-primary)] text-sm"
          />

          {isStaticWithCoins && (
            <select
              value={staticCoins.includes(symbol) ? symbol : ''}
              onChange={(e) => {
                const v = e.target.value
                if (v) setSymbol(v)
              }}
              className="w-full block px-3 py-2 rounded-lg bg-[var(--surface-primary)] debate-input text-[var(--text-primary)] text-sm"
              title={t('pickFromStrategy', language)}
            >
              <option value="">{t('pickOption', language)}</option>
              {staticCoins.map((coin) => (
                <option key={coin} value={coin}>
                  {coin}
                </option>
              ))}
            </select>
          )}

          <select
            value={maxRounds}
            onChange={(e) => setMaxRounds(+e.target.value)}
            className="w-full block px-3 py-2 rounded-lg bg-[var(--surface-primary)] debate-input text-[var(--text-primary)] text-sm"
          >
            {[2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n} {t('roundsSuffix', language)}
              </option>
            ))}
          </select>

          <div className="flex flex-col gap-2">
            {participants.map((p, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--surface-secondary)]/50 border border-[var(--panel-border)] w-full"
              >
                {/* Personality selector - custom dropdown with icons */}
                <PersonalitySelect
                  value={p.personality}
                  onChange={(per) => {
                    const up = [...participants]
                    up[i].personality = per
                    setParticipants(up)
                  }}
                  language={language}
                />
                {/* AI model selector */}
                <ModelSelect
                  value={p.ai_model_id}
                  onChange={(id) => {
                    const up = [...participants]
                    up[i].ai_model_id = id
                    setParticipants(up)
                  }}
                  aiModels={aiModels || []}
                />
                <button
                  onClick={() =>
                    setParticipants(participants.filter((_, j) => j !== i))
                  }
                  className="ml-auto text-[var(--binance-red)] hover:text-red-300 shrink-0"
                >
                  <HugeiconsIcon
                    icon={Cancel01Icon}
                    size={13}
                    strokeWidth={2}
                  />
                </button>
              </div>
            ))}
            <button
              onClick={addP}
              className="self-start inline-flex items-center gap-1 px-2 py-1 text-xs debate-accent hover:bg-[var(--debate-accent-bg)] rounded"
            >
              <HugeiconsIcon icon={Add01Icon} size={13} strokeWidth={2} />{' '}
              {t('addAI', language)}
            </button>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg bg-[var(--surface-primary)] debate-input text-[var(--text-primary)] text-sm font-medium hover:bg-[var(--surface-secondary)] transition-colors text-center"
          >
            {t('cancel', language)}
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={creating}
            className="flex-1 px-4 py-2.5 rounded-lg debate-btn text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {creating && (
              <Loader2 size={16} className="animate-spin shrink-0" />
            )}
            {creating ? t('creating', language) : t('create', language)}
          </button>
        </div>
      </div>
    </div>
  )
}

// Main Page
export function DebateArenaPage() {
  const { language } = useLanguage()
  const { user } = useAuth()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [execId, setExecId] = useState<string | null>(null)
  const [traderId, setTraderId] = useState('')
  const [executing, setExecuting] = useState(false)

  const { data: debates, mutate: mutateList } = useSWR<DebateSession[]>(
    'debates',
    api.getDebates,
    { refreshInterval: 5000 }
  )
  const { data: aiModels } = useSWR<AIModel[]>('ai-models', api.getModelConfigs)
  const { data: strategies } = useSWR<Strategy[]>(
    'strategies',
    api.getStrategies
  )
  const { data: traders } = useSWR<TraderInfo[]>('traders', api.getTraders)
  const { data: detail, mutate: mutateDetail } =
    useSWR<DebateSessionWithDetails>(
      selectedId ? `debate-${selectedId}` : null,
      () => api.getDebate(selectedId!),
      { refreshInterval: selectedId ? 3000 : 0 }
    )

  useEffect(() => {
    if (debates?.length && !selectedId) setSelectedId(debates[0].id)
  }, [debates, selectedId])

  const onCreate = async (r: CreateDebateRequest) => {
    const d = await api.createDebate(r)
    notify.success(t('createSuccess', language))
    mutateList()
    setSelectedId(d.id)
  }

  const onStart = async (id: string) => {
    await api.startDebate(id)
    notify.success(t('startSuccess', language))
    mutateList()
    mutateDetail()
  }

  const onDelete = async (id: string, name?: string) => {
    const debate = debates?.find((d) => d.id === id)
    if (debate && !isDebateOwner(debate, user?.id)) {
      notify.error(t('notOwner', language))
      return
    }
    if (debate && !canDeleteDebate(debate.status)) {
      notify.error(t('cannotDeleteRunning', language))
      return
    }

    const label = name || debate?.name || id
    const confirmText = t('deleteConfirm', language).replace('{name}', label)
    if (!window.confirm(confirmText)) return

    try {
      await api.deleteDebate(id)
      notify.success(t('deleteSuccess', language))
      if (selectedId === id) {
        const remaining = debates?.filter((d) => d.id !== id) ?? []
        setSelectedId(remaining[0]?.id ?? null)
      }
      mutateList()
    } catch (e: any) {
      notify.error(e?.message || t('deleteFailed', language))
    }
  }

  const onExecute = async () => {
    if (!execId || !traderId) return
    setExecuting(true)
    try {
      await api.executeDebate(execId, traderId)
      notify.success(t('executeSuccess', language))
      mutateDetail()
      mutateList()
      setExecId(null)
      setTraderId('')
    } catch (e: any) {
      notify.error(e.message)
    } finally {
      setExecuting(false)
    }
  }

  // Process data
  const messages = detail?.messages || []
  const participants = detail?.participants || []
  const votes = detail?.votes || []
  const decision = detail?.final_decision

  // Get strategy name
  const strategyName =
    strategies?.find((s) => s.id === detail?.strategy_id)?.name || ''

  // Group by round
  const rounds: Record<number, DebateMessage[]> = {}
  messages.forEach((m) => {
    if (!rounds[m.round]) rounds[m.round] = []
    rounds[m.round].push(m)
  })

  // Vote summary
  const voteSum = votes.reduce(
    (a, v) => {
      a[v.action] = (a[v.action] || 0) + 1
      return a
    },
    {} as Record<string, number>
  )

  return (
    <DeepVoidBackground
      className="flex overflow-hidden relative"
      style={{ height: 'calc(100vh - 64px)' }}
      contentDirection="row"
      disableAnimation
    >
      {/* Left - Debate List + Online Traders */}
      <div className="hidden md:flex w-56 flex-shrink-0 bg-[var(--surface-primary)]/80 backdrop-blur-md border-r debate-panel-border flex-col z-10">
        {/* New Debate Button */}
        <button
          onClick={() => setShowCreate(true)}
          className="m-2 py-2 rounded-lg debate-btn text-sm flex items-center justify-center gap-1"
        >
          <HugeiconsIcon icon={Add01Icon} size={16} strokeWidth={2} />{' '}
          {t('newDebate', language)}
        </button>

        {/* Debate List */}
        <div className="px-2 py-1 text-[11px] uppercase tracking-wider text-[var(--text-secondary)] font-semibold flex items-center gap-1.5">
          <HugeiconsIcon
            icon={BubbleChatIcon}
            size={12}
            strokeWidth={1.9}
            className="debate-accent"
          />
          {t('debateSessions', language)}
        </div>
        <div className="overflow-y-auto" style={{ maxHeight: '30%' }}>
          {debates?.map((d) => (
            <div
              key={d.id}
              onClick={() => setSelectedId(d.id)}
              className={`group p-2 cursor-pointer border-l-2 transition-all ${selectedId === d.id ? 'debate-selected' : 'border-transparent hover:bg-[var(--surface-secondary)]/50'}`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_COLOR[d.status]}`}
                />
                <span className="text-sm text-[var(--text-primary)] truncate flex-1 min-w-0">
                  {d.name}
                </span>
                {canDeleteDebate(d.status) && isDebateOwner(d, user?.id) && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDelete(d.id, d.name)
                    }}
                    className={`flex-shrink-0 p-1 rounded-md text-red-400/80 hover:text-red-300 hover:bg-red-500/15 transition-all ${
                      selectedId === d.id
                        ? 'opacity-100'
                        : 'opacity-0 group-hover:opacity-100'
                    }`}
                    title={t('delete', language)}
                    aria-label={t('delete', language)}
                  >
                    <HugeiconsIcon icon={Delete02Icon} size={14} strokeWidth={2} />
                  </button>
                )}
              </div>
              <div className="text-xs text-[var(--text-secondary)] mt-1 flex items-center gap-2">
                <span>
                  {d.symbol} · R{d.current_round}/{d.max_rounds}
                </span>
                {isDebateOwner(d, user?.id) ? (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--debate-accent-bg)] text-[var(--debate-accent)]">
                    {t('yours', language)}
                  </span>
                ) : null}
              </div>
              {d.status === 'pending' &&
                selectedId === d.id &&
                isDebateOwner(d, user?.id) && (
                <div className="flex gap-1 mt-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onStart(d.id)
                    }}
                    className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded"
                  >
                    {t('start', language)}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Online Traders Section */}
        <div className="flex-1 border-t debate-panel-border mt-2 overflow-hidden flex flex-col">
          <div className="px-2 py-2 text-[11px] uppercase tracking-wider text-[var(--text-secondary)] font-semibold flex items-center gap-1.5">
            <HugeiconsIcon
              icon={UserGroupIcon}
              size={12}
              strokeWidth={1.9}
              className="text-[var(--binance-green)]"
            />
            {t('onlineTraders', language)}
          </div>
          <div className="flex-1 overflow-y-auto px-2 space-y-2">
            {traders
              ?.filter((tr) => tr.is_running)
              .map((tr) => (
                <div
                  key={tr.trader_id}
                  onClick={() => {
                    setTraderId(tr.trader_id)
                    if (decision && !decision.executed)
                      setExecId(detail?.id || null)
                  }}
                  className={`p-2 rounded-lg cursor-pointer transition-all ${traderId === tr.trader_id ? 'bg-[var(--binance-green-bg)] ring-1 ring-[var(--binance-green)]' : 'bg-[var(--surface-secondary)] hover:bg-[var(--surface-tertiary)]'}`}
                >
                  <div className="flex items-center gap-2">
                    <PunkAvatar
                      seed={tr.trader_id}
                      size={32}
                      className="rounded-lg"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-[var(--text-primary)] font-medium truncate">
                        {tr.trader_name}
                      </div>
                      <div className="text-xs text-[var(--text-secondary)] truncate">
                        {tr.ai_model}
                      </div>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-[var(--binance-green)] animate-pulse" />
                  </div>
                </div>
              ))}
            {traders
              ?.filter((tr) => !tr.is_running)
              .slice(0, 3)
              .map((tr) => (
                <div
                  key={tr.trader_id}
                  className="p-2 rounded-lg bg-[var(--surface-secondary)] opacity-50"
                >
                  <div className="flex items-center gap-2">
                    <div className="grayscale">
                      <PunkAvatar
                        seed={tr.trader_id}
                        size={32}
                        className="rounded-lg"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-[var(--text-primary)] font-medium truncate">
                        {tr.trader_name}
                      </div>
                      <div className="text-xs text-[var(--text-secondary)]">
                        {t('offline', language)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            {(!traders || traders.length === 0) && (
              <div className="text-xs text-[var(--text-secondary)] text-center py-4">
                {t('noTraders', language)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {detail ? (
          <>
            {/* Header Bar - Compact */}
            <div className="px-3 py-2 border-b debate-panel-border bg-[var(--surface-primary)]/60 backdrop-blur-md flex items-center gap-3 flex-shrink-0 shadow-sm">
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_COLOR[detail.status]}`}
              />
              <span className="font-bold text-[var(--text-primary)] truncate">
                {detail.name}
              </span>
              <span className="debate-accent font-semibold">
                {detail.symbol}
              </span>
              {strategyName && (
                <span className="text-xs px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded">
                  {strategyName}
                </span>
              )}
              <span className="text-xs text-[var(--text-secondary)]">
                R{detail.current_round}/{detail.max_rounds}
              </span>

              {/* Participants */}
              <div className="flex gap-1 ml-2">
                {participants.map((p) => {
                  const vote = votes.find(
                    (v) => v.ai_model_id === p.ai_model_id
                  )
                  const act = vote ? ACT[vote.action] || ACT.wait : null
                  return (
                    <div
                      key={p.id}
                      className="flex items-center gap-1 px-1 py-0.5 rounded bg-[var(--surface-secondary)] text-xs"
                    >
                      <ModelAvatar
                        name={p.ai_model_name}
                        provider={p.provider}
                        size={14}
                      />
                      {act && (
                        <span className={`${act.color}`}>{act.icon}</span>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="flex-1" />

              {canDeleteDebate(detail.status) &&
                isDebateOwner(detail, user?.id) && (
                <button
                  type="button"
                  onClick={() => onDelete(detail.id, detail.name)}
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-red-400/90 hover:text-red-300 hover:bg-red-500/15 transition-colors"
                  title={t('delete', language)}
                >
                  <HugeiconsIcon icon={Delete02Icon} size={14} strokeWidth={2} />
                  {t('delete', language)}
                </button>
              )}

              {/* Vote Summary */}
              {votes.length > 0 && (
                <div className="flex gap-1">
                  {Object.entries(voteSum).map(([action, count]) => {
                    const cfg = ACT[action] || ACT.wait
                    return (
                      <div
                        key={action}
                        className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.color} text-xs font-semibold`}
                      >
                        {cfg.icon} {cfg.label}×{count}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Main Content Area - Two Column Layout */}
            <div className="flex-1 flex overflow-hidden">
              {Object.keys(rounds).length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  {detail.status === 'pending' ? (
                    <EmptyState
                      compact
                      icon={PlayIcon}
                      title={
                        isDebateOwner(detail, user?.id)
                          ? t('clickToStart', language)
                          : t('waitingForCreator', language)
                      }
                    />
                  ) : detail.status === 'completed' ? (
                    <EmptyState
                      compact
                      icon={AlertCircleIcon}
                      title={t('debateFailed', language)}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-[var(--text-secondary)]">
                      <Loader2
                        size={64}
                        className="animate-spin text-[var(--debate-accent)] mb-4"
                        strokeWidth={1.5}
                      />
                      <div className="text-lg text-center max-w-md">
                        {t('waitingAI', language)}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {/* Left - Rounds */}
                  <div className="flex-1 overflow-y-auto p-4 border-r debate-panel-border dash-scroll">
                    <div className="mb-3 flex items-center gap-2.5">
                      <span className="dash-ico">
                        <HugeiconsIcon
                          icon={BubbleChatIcon}
                          size={15}
                          strokeWidth={1.9}
                        />
                      </span>
                      <h2
                        className="text-sm font-semibold uppercase tracking-wider gl-metal-shine"
                        style={{ animationDelay: '-1.2s' }}
                      >
                        {t('discussionRecords', language)}
                      </h2>
                    </div>
                    <div className="space-y-3">
                      {Object.entries(rounds).map(([round, msgs]) => (
                        <div
                          key={round}
                          className="gl-onyx-panel-b rounded-xl p-3 overflow-hidden"
                        >
                          <div className="text-xs debate-accent font-bold mb-2 uppercase tracking-wider tabular-nums">
                            Round {round}
                          </div>
                          <div className="space-y-2">
                            {msgs.map((m) => (
                              <MessageCard key={m.id} msg={m} language={language} />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right - Votes */}
                  {votes.length > 0 && (
                    <div className="w-[420px] flex-shrink-0 overflow-y-auto p-4 bg-[var(--surface-primary)]/30 backdrop-blur-sm dash-scroll">
                      <div className="mb-3 flex items-center gap-2.5">
                        <span className="dash-ico">
                          <HugeiconsIcon
                            icon={JusticeScale01Icon}
                            size={15}
                            strokeWidth={1.9}
                          />
                        </span>
                        <h2
                          className="text-sm font-semibold uppercase tracking-wider gl-metal-shine"
                          style={{ animationDelay: '-2.4s' }}
                        >
                          {t('finalVotes', language)}
                        </h2>
                      </div>
                      <div className="space-y-3">
                        {votes.map((v) => {
                          const participant = detail.participants?.find(
                            (p) => p.ai_model_id === v.ai_model_id
                          )
                          return (
                          <VoteCard
                            key={v.id}
                            vote={{
                              ai_model_name: v.ai_model_name,
                              provider: participant?.provider,
                              action: v.action,
                              symbol: v.symbol,
                              confidence: v.confidence,
                              leverage: v.leverage,
                              position_pct: v.position_pct,
                              stop_loss_pct: v.stop_loss_pct,
                              take_profit_pct: v.take_profit_pct,
                              reasoning: v.reasoning,
                            }}
                          />
                          )
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Consensus Bar - Show when votes exist */}
            {(decision || votes.length > 0) && (
              <div className="p-3 border-t debate-panel-border debate-consensus-bar backdrop-blur-md flex items-center gap-4 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <span className="dash-ico">
                    <HugeiconsIcon
                      icon={JusticeScale01Icon}
                      size={16}
                      strokeWidth={1.9}
                    />
                  </span>
                  <span className="text-sm text-[var(--text-secondary)]">
                    {t('consensus', language)}:
                  </span>
                  {decision ? (
                    <>
                      {decision.symbol && (
                        <span className="debate-accent font-bold mr-1">
                          {decision.symbol}
                        </span>
                      )}
                      <span
                        className={`flex items-center gap-1 px-2 py-1 rounded font-bold ${(ACT[decision.action] || ACT.wait).bg} ${(ACT[decision.action] || ACT.wait).color}`}
                      >
                        {(ACT[decision.action] || ACT.wait).icon}
                        {decision.action.replace('_', ' ').toUpperCase()}
                      </span>
                    </>
                  ) : (
                    <span className="flex items-center gap-1 px-2 py-1 rounded font-bold bg-[var(--surface-tertiary)] text-[var(--text-secondary)]">
                      <HugeiconsIcon
                        icon={Clock01Icon}
                        size={14}
                        strokeWidth={2}
                      />{' '}
                      VOTING...
                    </span>
                  )}
                </div>
                {decision && (
                  <div className="flex items-center gap-4 text-sm">
                    <span>
                      <span className="text-[var(--text-secondary)]">
                        {t('confidence', language)}
                      </span>{' '}
                      <span className="debate-accent font-bold">
                        {decision.confidence || 0}%
                      </span>
                    </span>
                    {(decision.leverage ?? 0) > 0 && (
                      <span>
                        <span className="text-[var(--text-secondary)]">
                          {t('leverage', language)}
                        </span>{' '}
                        <span className="text-[var(--text-primary)] font-bold">
                          {decision.leverage}x
                        </span>
                      </span>
                    )}
                    {(decision.position_pct ?? 0) > 0 && (
                      <span>
                        <span className="text-[var(--text-secondary)]">
                          {t('position', language)}
                        </span>{' '}
                        <span className="text-[var(--text-primary)] font-bold">
                          {((decision.position_pct ?? 0) * 100).toFixed(0)}%
                        </span>
                      </span>
                    )}
                    {(decision.stop_loss ?? 0) > 0 && (
                      <span>
                        <span className="text-[var(--text-secondary)]">SL</span>{' '}
                        <span className="text-red-400 font-bold">
                          {((decision.stop_loss ?? 0) * 100).toFixed(1)}%
                        </span>
                      </span>
                    )}
                    {(decision.take_profit ?? 0) > 0 && (
                      <span>
                        <span className="text-[var(--text-secondary)]">TP</span>{' '}
                        <span className="text-green-400 font-bold">
                          {((decision.take_profit ?? 0) * 100).toFixed(1)}%
                        </span>
                      </span>
                    )}
                  </div>
                )}
                <div className="flex-1" />
                {decision &&
                  !decision.executed &&
                  isDebateOwner(detail, user?.id) &&
                  (decision.action === 'open_long' ||
                    decision.action === 'open_short') && (
                    <button
                      onClick={() => setExecId(detail.id)}
                      className="px-4 py-1.5 rounded-lg debate-btn text-sm flex items-center gap-1"
                    >
                      <HugeiconsIcon
                        icon={FlashIcon}
                        size={14}
                        strokeWidth={2}
                      />{' '}
                      {t('execute', language)}
                    </button>
                  )}
                {decision?.executed && (
                  <span className="text-green-400 text-sm font-semibold inline-flex items-center gap-1">
                    <HugeiconsIcon
                      icon={CheckmarkCircle01Icon}
                      size={15}
                      strokeWidth={2}
                    />{' '}
                    {t('executed', language)}
                  </span>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <EmptyState
              icon={BubbleChatIcon}
              title={t('selectOrCreate', language)}
              action={{
                label: t('newDebate', language),
                onClick: () => setShowCreate(true),
              }}
            />
          </div>
        )}
      </div>

      {/* Create Modal */}
      <CreateModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={onCreate}
        aiModels={aiModels || []}
        strategies={strategies || []}
        language={language}
      />

      {/* Execute Modal */}
      {execId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-[var(--surface-secondary)]/90 backdrop-blur-xl rounded-xl w-full max-w-sm p-6 debate-modal">
            <h3 className="text-lg font-bold gl-metal-text mb-4 flex items-center gap-2">
              <span className="dash-ico">
                <HugeiconsIcon icon={FlashIcon} size={16} strokeWidth={1.9} />
              </span>
              {t('executeTitle', language)}
            </h3>
            <select
              value={traderId}
              onChange={(e) => setTraderId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[var(--surface-primary)] debate-input text-[var(--text-primary)] text-sm mb-3"
            >
              <option value="">{t('selectTrader', language)}...</option>
              {traders
                ?.filter((tr) => tr.is_running)
                .map((tr) => (
                  <option key={tr.trader_id} value={tr.trader_id}>
                    {tr.trader_name}
                  </option>
                ))}
              {traders
                ?.filter((tr) => !tr.is_running)
                .map((tr) => (
                  <option key={tr.trader_id} value={tr.trader_id} disabled>
                    {tr.trader_name} ({t('offline', language)})
                  </option>
                ))}
            </select>
            <div className="flex items-center gap-1.5 text-xs text-green-300 bg-[var(--debate-accent-bg)] p-2 rounded mb-3">
              <HugeiconsIcon
                icon={AlertCircleIcon}
                size={14}
                strokeWidth={1.9}
                className="shrink-0"
              />
              {t('executeRealTradeWarning', language)}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setExecId(null)
                  setTraderId('')
                }}
                className="flex-1 py-2 rounded-lg bg-[var(--surface-primary)] debate-input text-[var(--text-primary)] text-sm hover:bg-[var(--surface-tertiary)] transition-colors"
              >
                {t('cancel', language)}
              </button>
              <button
                onClick={onExecute}
                disabled={
                  !traderId ||
                  executing ||
                  !traders?.find((tr) => tr.trader_id === traderId)?.is_running
                }
                className="flex-1 py-2 rounded-lg debate-btn text-sm disabled:opacity-50"
              >
                {executing ? (
                  <Loader2 size={16} className="animate-spin mx-auto" />
                ) : (
                  t('execute', language)
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </DeepVoidBackground>
  )
}
