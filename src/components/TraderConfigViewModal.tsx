import type { TraderConfigData } from '../types'
import { PunkAvatar, getTraderAvatar } from './PunkAvatar'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Robot01Icon,
  Notebook01Icon,
  Cancel01Icon,
  Wallet01Icon,
  Coins01Icon,
  Layers01Icon,
  Settings01Icon,
  Clock01Icon,
  Analytics02Icon,
  Target01Icon,
} from '@hugeicons/core-free-icons'

// 提取下划线后面的名称部分
function getShortName(fullName: string): string {
  const parts = fullName.split('_')
  return parts.length > 1 ? parts[parts.length - 1] : fullName
}

interface TraderConfigViewModalProps {
  isOpen: boolean
  onClose: () => void
  traderData?: TraderConfigData | null
}

export function TraderConfigViewModal({
  isOpen,
  onClose,
  traderData,
}: TraderConfigViewModalProps) {
  if (!isOpen || !traderData) return null

  const InfoRow = ({
    label,
    value,
    icon,
  }: {
    label: string
    value: string | number | boolean
    icon?: typeof Robot01Icon
  }) => (
    <div className="flex justify-between items-center py-2.5 border-b border-white/[0.06] last:border-b-0">
      <span
        className="flex items-center gap-2 text-sm font-medium"
        style={{ color: 'var(--text-secondary)' }}
      >
        {icon && (
          <HugeiconsIcon
            icon={icon}
            size={15}
            strokeWidth={1.9}
            style={{ color: 'var(--text-tertiary)' }}
          />
        )}
        {label}
      </span>
      <span className="text-sm gl-metal-text text-right tabular-nums">
        {typeof value === 'boolean' ? (value ? '是' : '否') : value}
      </span>
    </div>
  )

  return (
    <div className="gl-modal-overlay" onClick={onClose}>
      <div
        className="gl-modal-panel gl-glow-border max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="gl-modal-head flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <PunkAvatar
                seed={getTraderAvatar(
                  traderData.trader_id || '',
                  traderData.trader_name
                )}
                size={48}
                className="rounded-xl"
              />
              <div
                className="absolute -bottom-1 -right-1 w-5 h-5 rounded-md flex items-center justify-center"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(61,107,255,0.22), rgba(61,107,255,0.06))',
                  border: '1px solid rgba(61,107,255,0.30)',
                  boxShadow:
                    'inset 0 1px 0 rgba(255,255,255,0.10), 0 0 10px rgba(61,107,255,0.30)',
                }}
              >
                <HugeiconsIcon
                  icon={Robot01Icon}
                  size={12}
                  strokeWidth={2}
                  style={{ color: '#86efac' }}
                />
              </div>
            </div>
            <div className="min-w-0">
              <h2 className="gl-modal-title gl-metal-text truncate">
                交易员配置
              </h2>
              <p
                className="text-sm mt-0.5 truncate"
                style={{ color: 'var(--text-secondary)' }}
              >
                {traderData.trader_name} 的配置信息
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Running Status */}
            <div
              className={`gl-badge ${traderData.is_running ? 'gl-badge--buy' : 'gl-badge--sell'}`}
            >
              <span
                className="dash-live-dot"
                style={{
                  background: traderData.is_running
                    ? 'var(--binance-green)'
                    : 'var(--binance-red)',
                }}
              />
              {traderData.is_running ? '运行中' : '已停止'}
            </div>
            <button
              onClick={onClose}
              className="gl-modal-close"
              aria-label="关闭"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={18} strokeWidth={1.9} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="gl-modal-scroll dash-scroll p-6 space-y-5">
          {/* Basic Info */}
          <div className="gl-onyx-panel rounded-2xl overflow-hidden p-5">
            <h3 className="flex items-center gap-2.5 mb-4">
              <span className="dash-ico">
                <HugeiconsIcon
                  icon={Settings01Icon}
                  size={16}
                  strokeWidth={1.9}
                />
              </span>
              <span className="text-base font-semibold gl-metal-shine">
                基础信息
              </span>
            </h3>
            <div className="space-y-1">
              <InfoRow
                label="交易员名称"
                value={traderData.trader_name}
                icon={Robot01Icon}
              />
              <InfoRow
                label="AI模型"
                value={getShortName(traderData.ai_model).toUpperCase()}
                icon={Analytics02Icon}
              />
              <InfoRow
                label="交易所"
                value={getShortName(traderData.exchange_id).toUpperCase()}
                icon={Coins01Icon}
              />
              <InfoRow
                label="初始余额"
                value={`$${traderData.initial_balance.toLocaleString()}`}
                icon={Wallet01Icon}
              />
              <InfoRow
                label="保证金模式"
                value={traderData.is_cross_margin ? '全仓' : '逐仓'}
                icon={Layers01Icon}
              />
              <InfoRow
                label="扫描间隔"
                value={`${traderData.scan_interval_minutes || 3} 分钟`}
                icon={Clock01Icon}
              />
            </div>
          </div>

          {/* Strategy Info - only show if strategy is bound */}
          {traderData.strategy_id && (
            <div className="gl-onyx-panel rounded-2xl overflow-hidden p-5">
              <h3 className="flex items-center gap-2.5 mb-4">
                <span className="dash-ico">
                  <HugeiconsIcon
                    icon={Notebook01Icon}
                    size={16}
                    strokeWidth={1.9}
                  />
                </span>
                <span className="text-base font-semibold gl-metal-shine">
                  使用策略
                </span>
              </h3>
              <div className="space-y-1">
                <InfoRow
                  label="策略名称"
                  value={traderData.strategy_name || traderData.strategy_id}
                  icon={Target01Icon}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="gl-modal-foot flex justify-end">
          <button
            onClick={onClose}
            className="gl-modal-btn-ghost px-6 py-3 rounded-xl font-semibold text-sm"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  )
}
