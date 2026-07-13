import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Shield,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Settings,
} from 'lucide-react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Cancel01Icon } from '@hugeicons/core-free-icons'
import { useAuth } from '../contexts/AuthContext'
import { type Language } from '../i18n/translations'
import { isOnboardingComplete, markOnboardingComplete } from '../lib/onboarding'
import { goTo } from '../lib/nav'
import { useAccountUiStore } from '../stores/accountUiStore'

interface OnboardingDialogProps {
  language: Language
}

const STEPS = ['security', 'welcome'] as const

export function OnboardingDialog({ language }: OnboardingDialogProps) {
  const { user, getAccountSecurity } = useAuth()
  const openSettings = useAccountUiStore((s) => s.openSettings)
  const settingsOpen = useAccountUiStore((s) => s.settingsOpen)
  const isEn = language !== 'zh'

  const [visible, setVisible] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [otpEnabled, setOtpEnabled] = useState(false)
  const [loadingSecurity, setLoadingSecurity] = useState(true)

  const refreshSecurity = useCallback(async () => {
    if (!user?.id) return
    setLoadingSecurity(true)
    const result = await getAccountSecurity()
    if (result.success) {
      setOtpEnabled(Boolean(result.otpEnabled))
    }
    setLoadingSecurity(false)
  }, [getAccountSecurity, user?.id])

  useEffect(() => {
    if (!user?.id) {
      setVisible(false)
      return
    }
    if (isOnboardingComplete(user.id)) {
      setVisible(false)
      return
    }
    setVisible(true)
    refreshSecurity()
  }, [user?.id, refreshSecurity])

  useEffect(() => {
    if (!visible || settingsOpen) return
    refreshSecurity()
  }, [settingsOpen, visible, refreshSecurity])

  const finish = useCallback(() => {
    if (user?.id) markOnboardingComplete(user.id)
    setVisible(false)
  }, [user?.id])

  const skipTour = () => finish()

  const goNext = () => {
    if (stepIndex >= STEPS.length - 1) {
      finish()
      return
    }
    setStepIndex((i) => i + 1)
  }

  const goBack = () => setStepIndex((i) => Math.max(0, i - 1))

  if (!visible || !user) return null

  const step = STEPS[stepIndex]

  return createPortal(
    <div className="gl-modal-overlay" style={{ zIndex: 55 }}>
      <div
        className="gl-modal-panel gl-glow-border max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="gl-modal-head">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <span className="dash-ico shrink-0">
              <Sparkles
                className="w-[18px] h-[18px]"
                style={{ color: '#bcd0ff' }}
              />
            </span>
            <div className="min-w-0">
              <p
                className="text-[10px] font-mono tracking-[0.2em] mb-0.5"
                style={{ color: 'var(--text-tertiary)' }}
              >
                {isEn ? 'GETTING STARTED' : '入门引导'}
              </p>
              <h2 className="gl-modal-title gl-metal-text truncate">
                {isEn ? 'Welcome to EVA' : '欢迎使用 EVA'}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={skipTour}
            className="gl-modal-close"
            aria-label={isEn ? 'Skip tour' : '跳过引导'}
          >
            <HugeiconsIcon icon={Cancel01Icon} size={18} strokeWidth={1.9} />
          </button>
        </div>

        <div className="px-5 pt-4 pb-2">
          <div className="flex items-center gap-2">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className="h-1 flex-1 rounded-full transition-all duration-300"
                style={{
                  background:
                    i <= stepIndex ? '#00c853' : 'rgba(255,255,255,0.08)',
                  boxShadow:
                    i === stepIndex ? '0 0 12px rgba(61,107,255,0.45)' : 'none',
                }}
              />
            ))}
          </div>
          <p
            className="text-[11px] font-mono mt-2"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {isEn
              ? `Step ${stepIndex + 1} of ${STEPS.length}`
              : `第 ${stepIndex + 1} / ${STEPS.length} 步`}
          </p>
        </div>

        <div className="gl-modal-scroll space-y-4">
          {step === 'security' && (
            <div className="gl-onyx-panel rounded-xl p-5 space-y-4">
              <div className="flex flex-col items-center text-center py-2">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                  style={{
                    background: otpEnabled
                      ? 'rgba(14, 203, 129, 0.12)'
                      : 'rgba(61,107,255,0.12)',
                    border: otpEnabled
                      ? '1px solid rgba(14, 203, 129, 0.28)'
                      : '1px solid rgba(61,107,255,0.25)',
                  }}
                >
                  {otpEnabled ? (
                    <ShieldCheck
                      className="w-7 h-7"
                      style={{ color: 'var(--binance-green)' }}
                    />
                  ) : (
                    <Shield className="w-7 h-7" style={{ color: '#00c853' }} />
                  )}
                </div>
                <h3
                  className="text-base font-semibold mb-2"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {otpEnabled
                    ? isEn
                      ? 'Your account is protected'
                      : '账户已受保护'
                    : isEn
                      ? 'Secure your account'
                      : '保护您的账户'}
                </h3>
                <p
                  className="text-sm leading-relaxed max-w-sm"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {loadingSecurity
                    ? isEn
                      ? 'Checking security settings…'
                      : '正在检查安全设置…'
                    : otpEnabled
                      ? isEn
                        ? 'Two-factor authentication is enabled. You will be asked for a code when signing in.'
                        : '两步验证已启用。登录时将需要输入验证码。'
                      : isEn
                        ? 'We strongly recommend enabling two-factor authentication (2FA) with an authenticator app before you start trading.'
                        : '强烈建议在开始交易前，使用验证器应用启用两步验证（2FA）。'}
                </p>
              </div>

              {!otpEnabled && !loadingSecurity && (
                <button
                  type="button"
                  onClick={openSettings}
                  className="gl-modal-btn-primary w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold"
                >
                  <Settings className="w-4 h-4" />
                  {isEn
                    ? 'Open settings to enable 2FA'
                    : '打开设置启用两步验证'}
                </button>
              )}
            </div>
          )}

          {step === 'welcome' && (
            <div className="gl-onyx-panel rounded-xl p-5 space-y-4">
              <div className="text-center py-1">
                <h3
                  className="text-base font-semibold mb-2"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {isEn ? 'You are ready to explore' : '开始探索平台'}
                </h3>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {isEn
                    ? 'Set up AI traders, explore market data, and run strategies — all from the Platform menu.'
                    : '通过 Platform 菜单配置 AI 交易员、查看市场数据并运行策略。'}
                </p>
              </div>
              <ul
                className="space-y-2.5 text-sm"
                style={{ color: 'var(--text-secondary)' }}
              >
                {[
                  isEn
                    ? 'Configure AI models and exchanges'
                    : '配置 AI 模型与交易所',
                  isEn
                    ? 'Create and launch AI traders'
                    : '创建并启动 AI 交易员',
                  isEn
                    ? 'Monitor performance on the dashboard'
                    : '在仪表盘查看表现',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <span
                      className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0"
                      style={{
                        background: '#00c853',
                        boxShadow: '0 0 6px rgba(61,107,255,0.8)',
                      }}
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="gl-modal-foot justify-between">
          <button
            type="button"
            onClick={skipTour}
            className="gl-modal-btn-ghost inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-sm font-semibold"
          >
            {isEn ? 'Skip tour' : '跳过引导'}
          </button>
          <div className="flex items-center gap-2">
            {stepIndex > 0 && (
              <button
                type="button"
                onClick={goBack}
                className="gl-modal-btn-ghost inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-sm font-semibold"
              >
                {isEn ? 'Back' : '上一步'}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (step === 'welcome') {
                  finish()
                  goTo('/traders')
                  return
                }
                goNext()
              }}
              className="gl-modal-btn-primary inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap"
            >
              {step === 'welcome'
                ? isEn
                  ? 'Go to AI Traders'
                  : '前往 AI 交易员'
                : otpEnabled
                  ? isEn
                    ? 'Continue'
                    : '继续'
                  : isEn
                    ? 'Continue without 2FA'
                    : '暂不启用，继续'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
