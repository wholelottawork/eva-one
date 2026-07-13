import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Copy, Check, Shield, ShieldCheck } from 'lucide-react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Cancel01Icon, Settings02Icon } from '@hugeicons/core-free-icons'
import { useAuth } from '../contexts/AuthContext'
import { type Language } from '../i18n/translations'
import { t } from '../i18n/translations'
import { copyWithToast } from '../lib/clipboard'
import { OtpQrCode } from './OtpQrCode'
import { toast } from 'sonner'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  language: Language
}

type SecurityStep = 'overview' | 'setup' | 'verify'

export function SettingsModal({
  isOpen,
  onClose,
  language,
}: SettingsModalProps) {
  const { user, setupOTP, completeRegistration, getAccountSecurity } = useAuth()
  const isEn = language !== 'zh'

  const [loading, setLoading] = useState(true)
  const [otpEnabled, setOtpEnabled] = useState(false)
  const [step, setStep] = useState<SecurityStep>('overview')
  const [otpSecret, setOtpSecret] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const resetFlow = useCallback(() => {
    setStep('overview')
    setOtpSecret('')
    setOtpCode('')
    setError('')
    setSubmitting(false)
  }, [])

  const loadSecurity = useCallback(async () => {
    setLoading(true)
    setError('')
    const result = await getAccountSecurity()
    if (result.success) {
      setOtpEnabled(Boolean(result.otpEnabled))
    } else {
      setError(
        result.message || (isEn ? 'Failed to load settings' : '加载设置失败')
      )
    }
    setLoading(false)
  }, [getAccountSecurity, isEn])

  useEffect(() => {
    if (!isOpen) {
      resetFlow()
      return
    }
    loadSecurity()
  }, [isOpen, loadSecurity, resetFlow])

  const handleStartSetup = async () => {
    setSubmitting(true)
    setError('')
    const result = await setupOTP()
    if (result.success && result.otpSecret) {
      setOtpSecret(result.otpSecret)
      setStep('setup')
    } else {
      setError(
        result.message ||
          (isEn ? 'Failed to start 2FA setup' : '无法开始两步验证设置')
      )
    }
    setSubmitting(false)
  }

  const handleContinueToVerify = () => {
    setStep('verify')
    setOtpCode('')
    setError('')
  }

  const handleEnable2FA = async () => {
    if (!user?.id || otpCode.length !== 6) return
    setSubmitting(true)
    setError('')
    const result = await completeRegistration(user.id, otpCode, {
      redirect: false,
    })
    if (result.success) {
      setOtpEnabled(true)
      resetFlow()
      toast.success(
        isEn ? 'Two-factor authentication enabled' : '两步验证已启用'
      )
      await loadSecurity()
    } else {
      setError(
        result.message || (isEn ? 'Invalid verification code' : '验证码错误')
      )
    }
    setSubmitting(false)
  }

  const copySecret = () => {
    if (!otpSecret) return
    copyWithToast(
      otpSecret,
      t('copiedToClipboard', language),
      t('copyFailed', language)
    )
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!isOpen) return null

  return createPortal(
    <div className="gl-modal-overlay" style={{ zIndex: 60 }} onClick={onClose}>
      <div
        className="gl-modal-panel gl-glow-border max-w-lg w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="gl-modal-head">
          <div className="flex items-center gap-3 min-w-0">
            <span className="dash-ico shrink-0">
              <HugeiconsIcon
                icon={Settings02Icon}
                size={18}
                strokeWidth={1.9}
              />
            </span>
            <div className="min-w-0">
              <h2 className="gl-modal-title gl-metal-text truncate">
                {isEn ? 'Account settings' : '账户设置'}
              </h2>
              {user?.email && (
                <span
                  className="text-xs truncate block"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {user.email}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="gl-modal-close"
            aria-label={isEn ? 'Close' : '关闭'}
          >
            <HugeiconsIcon icon={Cancel01Icon} size={18} strokeWidth={1.9} />
          </button>
        </div>

        <div className="gl-modal-scroll space-y-5">
          <section className="gl-onyx-panel rounded-xl p-4">
            <p
              className="text-[10px] font-mono tracking-[0.18em] mb-2"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {isEn ? 'ACCOUNT' : '账户'}
            </p>
            <p
              className="text-sm font-medium"
              style={{ color: 'var(--text-primary)' }}
            >
              {user?.email}
            </p>
          </section>

          <section className="gl-onyx-panel rounded-xl p-4 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p
                  className="text-[10px] font-mono tracking-[0.18em] mb-2"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {isEn ? 'SECURITY' : '安全'}
                </p>
                <h3
                  className="text-sm font-semibold mb-1"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {isEn ? 'Two-factor authentication' : '两步验证'}
                </h3>
                <p
                  className="text-xs leading-relaxed"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {isEn
                    ? 'Add an authenticator app for an extra layer of protection at sign-in.'
                    : '使用验证器应用，在登录时增加一层安全保护。'}
                </p>
              </div>
              {otpEnabled ? (
                <span
                  className="dash-chip shrink-0"
                  style={{ color: 'var(--binance-green)' }}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {isEn ? 'Enabled' : '已启用'}
                </span>
              ) : (
                <span className="dash-chip shrink-0">
                  <Shield className="w-3.5 h-3.5" />
                  {isEn ? 'Off' : '未启用'}
                </span>
              )}
            </div>

            {loading ? (
              <div
                className="h-20 rounded-xl animate-pulse"
                style={{ background: 'rgba(255,255,255,0.04)' }}
              />
            ) : otpEnabled ? (
              <div
                className="rounded-xl px-4 py-3 text-sm"
                style={{
                  background: 'rgba(61,107,255,0.08)',
                  border: '1px solid rgba(61,107,255,0.18)',
                  color: 'var(--text-secondary)',
                }}
              >
                {isEn
                  ? 'Your account requires a verification code from your authenticator app when signing in.'
                  : '登录时，您的账户需要使用验证器应用生成的验证码。'}
              </div>
            ) : step === 'overview' ? (
              <button
                type="button"
                onClick={handleStartSetup}
                disabled={submitting}
                className="gl-modal-btn-primary w-full inline-flex items-center justify-center px-5 py-3 rounded-xl text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting
                  ? isEn
                    ? 'Starting…'
                    : '准备中…'
                  : isEn
                    ? 'Enable 2FA'
                    : '启用两步验证'}
              </button>
            ) : (
              <div className="space-y-4">
                {(step === 'setup' || step === 'verify') && user?.email && (
                  <div
                    className="rounded-xl p-4 text-center"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.07)',
                    }}
                  >
                    <p
                      className="text-[10px] font-mono tracking-wider mb-4"
                      style={{ color: 'rgba(255,255,255,0.4)' }}
                    >
                      {isEn ? 'SCAN QR CODE' : '扫描二维码'}
                    </p>
                    <OtpQrCode email={user.email} secret={otpSecret} />
                    <p
                      className="text-[11px] font-mono mb-2"
                      style={{ color: 'rgba(255,255,255,0.35)' }}
                    >
                      {isEn ? 'BACKUP SECRET KEY' : '备用密钥'}
                    </p>
                    <div className="flex items-center gap-2 justify-center">
                      <code
                        className="text-[11px] px-3 py-2 rounded-lg font-mono break-all"
                        style={{
                          background: 'rgba(61,107,255,0.08)',
                          border: '1px solid rgba(61,107,255,0.2)',
                          color: '#00c853',
                        }}
                      >
                        {otpSecret}
                      </code>
                      <button
                        type="button"
                        onClick={copySecret}
                        className="p-2 rounded-lg transition-all hover:opacity-70 flex-shrink-0"
                        style={{
                          background: 'rgba(255,255,255,0.06)',
                          color: 'rgba(255,255,255,0.5)',
                        }}
                      >
                        {copied ? (
                          <Check
                            className="w-3.5 h-3.5"
                            style={{ color: '#00c853' }}
                          />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {step === 'setup' ? (
                  <button
                    type="button"
                    onClick={handleContinueToVerify}
                    className="gl-modal-btn-primary w-full inline-flex items-center justify-center px-5 py-3 rounded-xl text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isEn ? 'I have scanned — continue' : '我已扫描，继续'}
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="gl-field-label">
                        {isEn ? 'Verification code' : '验证码'}
                      </label>
                      <input
                        type="text"
                        value={otpCode}
                        onChange={(e) =>
                          setOtpCode(
                            e.target.value.replace(/\D/g, '').slice(0, 6)
                          )
                        }
                        className="gl-input text-center text-xl font-mono tracking-[0.45em]"
                        placeholder="000000"
                        maxLength={6}
                        autoFocus
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setStep('setup')}
                        className="gl-modal-btn-ghost flex-1 inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-sm font-semibold"
                      >
                        {isEn ? 'Back' : '返回'}
                      </button>
                      <button
                        type="button"
                        onClick={handleEnable2FA}
                        disabled={submitting || otpCode.length !== 6}
                        className="gl-modal-btn-primary flex-1 inline-flex items-center justify-center px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {submitting
                          ? isEn
                            ? 'Verifying…'
                            : '验证中…'
                          : isEn
                            ? 'Enable 2FA'
                            : '确认启用'}
                      </button>
                    </div>
                  </div>
                )}

                {step !== 'verify' && (
                  <button
                    type="button"
                    onClick={resetFlow}
                    className="gl-modal-btn-ghost w-full inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-sm font-semibold"
                  >
                    {isEn ? 'Cancel setup' : '取消设置'}
                  </button>
                )}
              </div>
            )}

            {error && <div className="gl-field-error">{error}</div>}
          </section>
        </div>

        <div className="gl-modal-foot">
          <button
            type="button"
            onClick={onClose}
            className="gl-modal-btn-ghost inline-flex items-center justify-center px-5 py-2.5 rounded-xl text-sm font-semibold"
          >
            {isEn ? 'Close' : '关闭'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
