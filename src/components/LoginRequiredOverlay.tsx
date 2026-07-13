import { motion, AnimatePresence } from 'framer-motion'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Login03Icon,
  UserAdd01Icon,
  Cancel01Icon,
  SquareLock02Icon,
  CheckmarkCircle01Icon,
} from '@hugeicons/core-free-icons'
import { useLanguage } from '../contexts/LanguageContext'

interface LoginRequiredOverlayProps {
  isOpen: boolean
  onClose: () => void
  featureName?: string
}

export function LoginRequiredOverlay({
  isOpen,
  onClose,
  featureName,
}: LoginRequiredOverlayProps) {
  const { language } = useLanguage()

  const texts = {
    zh: {
      title: '需要登录',
      subtitle: featureName
        ? `访问「${featureName}」需要登录`
        : '此功能需要登录后使用',
      description:
        '登录后即可使用 AI 交易员配置、策略市场、回测模拟等完整功能。',
      benefits: [
        'AI 交易员控制',
        '策略市场数据',
        '历史回测引擎',
        '全系统数据可视化',
      ],
      login: '登录',
      register: '注册账户',
      later: '稍后再说',
    },
    en: {
      title: 'Sign in required',
      subtitle: featureName
        ? `"${featureName}" requires sign in`
        : 'This feature requires sign in',
      description:
        'Sign in to access AI Trader configuration, Strategy Market, backtest simulation, and more.',
      benefits: [
        'AI Trader Control',
        'Strategy Market Data',
        'Historical Backtest Engine',
        'Full System Visualization',
      ],
      login: 'Sign in',
      register: 'Create account',
      later: 'Maybe later',
    },
  }

  const t = texts[language]

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop — mostly TRANSPARENT + strong blur, so the page behind shows
              through (blurred) with no colour wash. Click to dismiss. */}
          <div
            className="absolute inset-0"
            onClick={onClose}
            style={{
              background: 'rgba(6, 8, 14, 0.30)',
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
            }}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: 'spring', damping: 24, stiffness: 300 }}
            className="gl-modal-panel gl-glow-border relative w-full max-w-md rounded-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header — icon chip + metallic title + close */}
            <div className="gl-modal-head flex items-center gap-3">
              <div className="dash-ico shrink-0">
                <HugeiconsIcon
                  icon={SquareLock02Icon}
                  size={18}
                  strokeWidth={1.9}
                />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="gl-modal-title gl-metal-text truncate">
                  {t.title}
                </h2>
                <p
                  className="text-xs truncate"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {t.subtitle}
                </p>
              </div>
              <button
                onClick={onClose}
                className="gl-modal-close shrink-0"
                aria-label={language === 'zh' ? '关闭' : 'Close'}
              >
                <HugeiconsIcon
                  icon={Cancel01Icon}
                  size={18}
                  strokeWidth={1.9}
                />
              </button>
            </div>

            {/* Body */}
            <div className="gl-modal-scroll px-6 py-5">
              <p
                className="text-sm mb-5"
                style={{ color: 'var(--text-secondary)' }}
              >
                {t.description}
              </p>

              <ul
                className="space-y-2.5"
                style={{ color: 'var(--text-secondary)' }}
              >
                {t.benefits.map((benefit, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm">
                    <HugeiconsIcon
                      icon={CheckmarkCircle01Icon}
                      size={18}
                      strokeWidth={1.9}
                      className="shrink-0"
                      style={{ color: '#86efac' }}
                    />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Footer — primary + ghost actions */}
            <div className="gl-modal-foot flex flex-col gap-3">
              <a
                href="/login"
                className="gl-modal-btn-primary flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl font-semibold text-sm"
              >
                <HugeiconsIcon icon={Login03Icon} size={18} strokeWidth={1.9} />
                {t.login}
              </a>

              <a
                href="/register"
                className="gl-modal-btn-ghost flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl font-semibold text-sm"
              >
                <HugeiconsIcon
                  icon={UserAdd01Icon}
                  size={18}
                  strokeWidth={1.9}
                />
                {t.register}
              </a>

              <button
                onClick={onClose}
                className="gl-text-link text-sm text-center mt-1 mx-auto px-5 py-1.5 rounded-lg transition-colors hover:opacity-80"
                style={{ color: 'var(--text-tertiary)' }}
              >
                {t.later}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
