import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { t } from '../i18n/translations'
import { Eye, EyeOff, ArrowLeft, Shield, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
import { useSystemConfig } from '../hooks/useSystemConfig'
import { StaticMetalBar } from './StaticMetalBar'
import { OtpQrCode } from './OtpQrCode'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Mail01Icon,
  LockPasswordIcon,
  Activity03Icon,
} from '@hugeicons/core-free-icons'

const FEATURES = [
  'Multi-exchange connectivity',
  'AI model integration',
  'Real-time market analytics',
  'Secure 2FA authentication',
  'Strategy marketplace',
]

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 16px',
  borderRadius: '10px',
  fontSize: '14px',
  outline: 'none',
  transition: 'border-color 0.2s, box-shadow 0.2s',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.09)',
  color: '#fff',
}

const inputFocusClass =
  'focus:border-[rgba(255,255,255,0.2)] focus:shadow-none'

export function LoginPage() {
  const { language } = useLanguage()
  const { login, loginAdmin, verifyOTP, completeRegistration } = useAuth()
  const [step, setStep] = useState<'login' | 'otp' | 'setup-otp'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [userID, setUserID] = useState('')
  const [otpSecret, setOtpSecret] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [adminPassword, setAdminPassword] = useState('')
  const [copied, setCopied] = useState(false)
  const adminMode = false
  const { config: systemConfig } = useSystemConfig()
  const registrationEnabled = systemConfig?.registration_enabled !== false
  const [expiredToastId, setExpiredToastId] = useState<string | number | null>(
    null
  )

  useEffect(() => {
    if (sessionStorage.getItem('from401') === 'true') {
      const id = toast.warning(t('sessionExpired', language), {
        duration: Infinity,
      })
      setExpiredToastId(id)
      sessionStorage.removeItem('from401')
    }
  }, [language])

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result = await loginAdmin(adminPassword)
    if (!result.success) {
      const msg = result.message || t('loginFailed', language)
      setError(msg)
      toast.error(msg)
    } else {
      if (expiredToastId) toast.dismiss(expiredToastId)
    }
    setLoading(false)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result = await login(email, password)

    if (result.success) {
      if (result.requiresOTPSetup && result.userID) {
        setUserID(result.userID)
        setOtpSecret(result.otpSecret || '')
        setStep('setup-otp')
        toast.info('Pending 2FA setup detected. Please complete configuration.')
      } else if (result.requiresOTP && result.userID) {
        setUserID(result.userID)
        setStep('otp')
      } else {
        if (expiredToastId) toast.dismiss(expiredToastId)
      }
    } else {
      if (result.otpSecret) {
        setUserID(result.userID || '')
        setOtpSecret(result.otpSecret)
        setStep('setup-otp')
        toast.warning(
          t('completeGapSetup', language) ||
            'Incomplete setup detected. Please configure 2FA.'
        )
      } else {
        const msg = result.message || t('loginFailed', language)
        setError(msg)
        toast.error(msg)
      }
    }
    setLoading(false)
  }

  const handleOTPVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result = otpSecret
      ? await completeRegistration(userID, otpCode)
      : await verifyOTP(userID, otpCode)

    if (!result.success) {
      const msg = result.message || t('verificationFailed', language)
      setError(msg)
      toast.error(msg)
    } else {
      if (expiredToastId) toast.dismiss(expiredToastId)
      setOtpSecret('')
    }
    setLoading(false)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success('Copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  const stepIndex = step === 'login' ? 0 : step === 'setup-otp' ? 1 : 2

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ background: '#04050A' }}
    >
      {/* ── Left poster panel — fixed full-height overlay; the portada image is the
          background, headline on top with a legibility scrim + an animated glowing
          right edge. Drop /public/login-poster.png (≈500×990, object-cover). ── */}
      <aside
        className="hidden fixed left-0 top-0 h-screen w-[500px] z-20 flex-col overflow-hidden gl-edge-glow"
        style={{
          background:
            'linear-gradient(160deg, #0C0D15 0%, #07080E 55%, #0A1022 100%)',
        }}
      >
        <img
          src="/login-poster.png"
          alt=""
          onError={(e) => {
            ;(e.currentTarget as HTMLImageElement).style.display = 'none'
          }}
          className="absolute inset-0 w-full h-full object-cover object-center"
          style={{ transform: 'scale(1.06)', transformOrigin: 'center' }}
        />
        {/* scrim so the headline stays readable over the image */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(6,8,14,0.55) 0%, rgba(6,8,14,0.28) 42%, rgba(6,8,14,0.82) 100%)',
          }}
        />

        <div className="relative z-10 flex flex-col h-full p-12">
          <div className="flex items-center gap-3 mb-16">
            <span className="font-bold text-xl" style={{ color: '#00c853' }}>
              /
            </span>
            <span className="text-white font-bold tracking-[0.22em] text-sm">
              EVA PROTOCOL
            </span>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            <h2 className="text-5xl xl:text-[3.5rem] font-black leading-[0.88] tracking-tighter mb-7 gl-title-metal">
              TRADE
              <br />
              <span className="gl-title-metal-blue">SMARTER</span>
              <br />
              FASTER
            </h2>
            <p
              className="text-[13px] font-mono leading-relaxed mb-12"
              style={{ color: 'rgba(255,255,255,0.86)' }}
            >
              Institutional-grade AI agents.
              <br />
              Multi-exchange. Real-time. Autonomous.
            </p>

            <div className="space-y-3.5">
              {FEATURES.map((f, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div
                    className="w-1 h-1 rounded-full flex-shrink-0"
                    style={{
                      background: '#00c853',
                      boxShadow: '0 0 5px rgba(61,107,255,0.9)',
                    }}
                  />
                  <span
                    className="text-[13px] font-semibold"
                    style={{ color: '#fff' }}
                  >
                    {f}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div
            className="flex items-center gap-2 pt-6"
            style={{ borderTop: '1px solid rgba(61,107,255,0.18)' }}
          >
            <HugeiconsIcon
              icon={Activity03Icon}
              size={15}
              strokeWidth={2}
              className="animate-pulse"
              style={{
                color: '#6f96ff',
                filter: 'drop-shadow(0 0 6px rgba(61,107,255,0.85))',
              }}
            />
            <span
              className="text-[10px] font-mono tracking-widest"
              style={{ color: '#fff' }}
            >
              ALL SYSTEMS OPERATIONAL
            </span>
          </div>
        </div>
      </aside>

      {/* ── Form — absolutely sized to the viewport + internally scrollable so it can
          never push off-screen; centered to the RIGHT of the poster panel. ── */}
      <div className="absolute inset-0 z-10 overflow-y-auto">
        <div className="min-h-full flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-sm xl:max-w-md">
            <a
              href="/"
              className="inline-flex items-center gap-1.5 text-[10px] font-mono tracking-widest mb-10 transition-opacity hover:opacity-60"
              style={{ color: 'rgba(255,255,255,0.66)' }}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              {language === 'zh' ? '返回首页' : 'BACK TO HOME'}
            </a>

            {/* Step progress */}
            {step !== 'login' && (
              <div className="flex items-center gap-1.5 mb-7">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-0.5 flex-1 rounded-full transition-all duration-500"
                    style={{
                      background:
                        i <= stepIndex ? '#00c853' : 'rgba(255,255,255,0.08)',
                    }}
                  />
                ))}
              </div>
            )}

            {/* Card — wrapped in an animated glowing border (bloom); inner card keeps
              overflow-hidden for the top accent line + a dark metal body */}
            <div className="rounded-2xl">
              <div
                className="relative rounded-2xl overflow-hidden"
                style={{
                  background: '#0d0d0d',
                  border: '1px solid #1f1f1f',
                }}
              >

                <div className="p-7 sm:p-9">
                  {/* Header */}
                  <div className="mb-8">
                    <p
                      className="text-[10px] font-mono font-bold tracking-[0.25em] mb-2.5"
                      style={{ color: '#00c853', opacity: 0.8 }}
                    >
                      EVA /{' '}
                      {step === 'login'
                        ? 'SIGN IN'
                        : step === 'otp'
                          ? 'VERIFY'
                          : 'SECURE SETUP'}
                    </p>
                    <h1 className="text-[1.6rem] font-bold mb-1 tracking-tight text-white inline-block">
                      {step === 'login'
                        ? language === 'zh'
                          ? '登录'
                          : 'Sign in'
                        : step === 'otp'
                          ? language === 'zh'
                            ? '验证码'
                            : 'Verification'
                          : language === 'zh'
                            ? '设置两步验证'
                            : 'Set up 2FA'}
                    </h1>
                    <p
                      className="text-[13px]"
                      style={{ color: 'rgba(255,255,255,0.38)' }}
                    >
                      {step === 'login'
                        ? language === 'zh'
                          ? '使用您的账户登录'
                          : 'Access your trading dashboard'
                        : step === 'otp'
                          ? language === 'zh'
                            ? '输入您的验证码'
                            : 'Enter your 6-digit code'
                          : language === 'zh'
                            ? '扫描二维码完成设置'
                            : 'Secure your account with 2FA'}
                    </p>
                  </div>

                  {/* ── Admin mode ── */}
                  {adminMode ? (
                    <form onSubmit={handleAdminLogin} className="space-y-5">
                      <div>
                        <label
                          className="block text-xs font-mono tracking-wider mb-2"
                          style={{ color: 'rgba(255,255,255,0.45)' }}
                        >
                          ADMIN KEY
                        </label>
                        <input
                          type="password"
                          value={adminPassword}
                          onChange={(e) => setAdminPassword(e.target.value)}
                          className={`${inputFocusClass}`}
                          style={inputStyle}
                          placeholder="Enter admin password"
                          required
                        />
                      </div>
                      {error && <ErrorBox msg={error} />}
                      <SubmitBtn
                        loading={loading}
                        label={language === 'zh' ? '验证中...' : 'Verifying...'}
                        idleLabel={language === 'zh' ? '登录' : 'Sign in'}
                      />
                    </form>
                  ) : step === 'setup-otp' ? (
                    <div className="space-y-6">
                      <div
                        className="rounded-xl p-5 text-center"
                        style={{
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.07)',
                        }}
                      >
                        <p
                          className="text-xs font-mono tracking-wider mb-5"
                          style={{ color: 'rgba(255,255,255,0.5)' }}
                        >
                          {language === 'zh'
                            ? '完成两步验证配置'
                            : 'COMPLETE 2FA CONFIGURATION'}
                        </p>
                        <OtpQrCode email={email} secret={otpSecret} />
                        <p
                          className="text-[11px] font-mono mb-2"
                          style={{ color: 'rgba(255,255,255,0.35)' }}
                        >
                          {language === 'zh' ? '备用密钥' : 'BACKUP SECRET KEY'}
                        </p>
                        <div className="flex items-center gap-2 justify-center">
                          <code
                            className="text-[11px] px-3 py-2 rounded-lg font-mono"
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
                            onClick={() => copyToClipboard(otpSecret)}
                            className="p-2 rounded-lg transition-all hover:opacity-70"
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

                      <div className="space-y-4">
                        {[
                          {
                            n: '01',
                            title:
                              language === 'zh'
                                ? '安装验证器应用'
                                : 'Install authenticator app',
                            sub:
                              language === 'zh'
                                ? '推荐：Google Authenticator'
                                : 'Google Authenticator recommended',
                          },
                          {
                            n: '02',
                            title:
                              language === 'zh'
                                ? '扫描并验证'
                                : 'Scan & verify',
                            sub:
                              language === 'zh'
                                ? '扫描上方二维码，然后输入6位验证码'
                                : 'Scan the QR code, then enter the 6-digit code',
                          },
                        ].map((item) => (
                          <div key={item.n} className="flex gap-3">
                            <span
                              className="text-xs font-mono font-bold shrink-0 mt-0.5"
                              style={{ color: '#00c853', opacity: 0.7 }}
                            >
                              {item.n}
                            </span>
                            <div>
                              <p className="text-[13px] font-medium text-white mb-0.5">
                                {item.title}
                              </p>
                              <p
                                className="text-[11px]"
                                style={{ color: 'rgba(255,255,255,0.35)' }}
                              >
                                {item.sub}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => setStep('otp')}
                        className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.99]"
                        style={{
                          background:
                            'linear-gradient(135deg, #00c853 0%, #15803d 100%)',
                          boxShadow: '0 4px 24px rgba(61,107,255,0.25)',
                        }}
                      >
                        {language === 'zh'
                          ? '我已扫描，继续'
                          : 'I have scanned — continue'}
                      </button>
                    </div>
                  ) : step === 'login' ? (
                    <form onSubmit={handleLogin} className="space-y-5">
                      <div className="space-y-4">
                        <div>
                          <label
                            className="block text-[11px] font-mono tracking-wider mb-2"
                            style={{ color: 'rgba(255,255,255,0.4)' }}
                          >
                            {language === 'zh' ? '邮箱' : 'EMAIL'}
                          </label>
                          <div className="relative">
                            <span
                              className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                              style={{ color: 'rgba(255,255,255,0.34)' }}
                            >
                              <HugeiconsIcon
                                icon={Mail01Icon}
                                size={17}
                                strokeWidth={1.8}
                              />
                            </span>
                            <input
                              type="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              className={`${inputFocusClass}`}
                              style={{ ...inputStyle, paddingLeft: '42px' }}
                              placeholder="you@example.com"
                              required
                            />
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label
                              className="text-[11px] font-mono tracking-wider"
                              style={{ color: 'rgba(255,255,255,0.4)' }}
                            >
                              {language === 'zh' ? '密码' : 'PASSWORD'}
                            </label>
                            <a
                              href="/reset-password"
                              className="text-[11px] font-mono transition-opacity hover:opacity-70"
                              style={{ color: '#00c853' }}
                            >
                              {t('forgotPassword', language)}
                            </a>
                          </div>
                          <div className="relative">
                            <span
                              className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                              style={{ color: 'rgba(255,255,255,0.34)' }}
                            >
                              <HugeiconsIcon
                                icon={LockPasswordIcon}
                                size={17}
                                strokeWidth={1.8}
                              />
                            </span>
                            <input
                              type={showPassword ? 'text' : 'password'}
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              className={`${inputFocusClass}`}
                              style={{
                                ...inputStyle,
                                paddingLeft: '42px',
                                paddingRight: '44px',
                              }}
                              placeholder="••••••••"
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-60"
                              style={{ color: 'rgba(255,255,255,0.3)' }}
                            >
                              {showPassword ? (
                                <EyeOff size={16} />
                              ) : (
                                <Eye size={16} />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      {error && <ErrorBox msg={error} />}

                      <div className="flex justify-center pt-1">
                        <StaticMetalBar type="submit" disabled={loading}>
                          {loading
                            ? language === 'zh'
                              ? '登录中...'
                              : 'Signing in…'
                            : language === 'zh'
                              ? '登录'
                              : 'Sign in'}
                        </StaticMetalBar>
                      </div>
                    </form>
                  ) : (
                    <form onSubmit={handleOTPVerify} className="space-y-6">
                      <div className="flex flex-col items-center py-3">
                        <div
                          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                          style={{
                            background: 'rgba(61,107,255,0.1)',
                            border: '1px solid rgba(61,107,255,0.25)',
                          }}
                        >
                          <Shield
                            className="w-7 h-7"
                            style={{ color: '#00c853' }}
                          />
                        </div>
                        <p
                          className="text-[13px] text-center"
                          style={{ color: 'rgba(255,255,255,0.4)' }}
                        >
                          {t('otpVerificationPrompt', language)}
                        </p>
                      </div>

                      <div>
                        <label
                          className="block text-[11px] font-mono tracking-wider mb-2 text-center"
                          style={{ color: 'rgba(255,255,255,0.4)' }}
                        >
                          {language === 'zh' ? '验证码' : 'VERIFICATION CODE'}
                        </label>
                        <input
                          type="text"
                          value={otpCode}
                          onChange={(e) =>
                            setOtpCode(
                              e.target.value.replace(/\D/g, '').slice(0, 6)
                            )
                          }
                          className={`${inputFocusClass} text-center text-2xl tracking-[0.5em] font-mono`}
                          style={{ ...inputStyle, letterSpacing: '0.5em' }}
                          placeholder="000000"
                          maxLength={6}
                          required
                          autoFocus
                        />
                      </div>

                      {error && <ErrorBox msg={error} />}

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setStep('login')}
                          className="flex-1 py-3 rounded-xl text-sm font-medium transition-all hover:opacity-80"
                          style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            color: 'rgba(255,255,255,0.5)',
                          }}
                        >
                          {language === 'zh' ? '返回' : 'Back'}
                        </button>
                        <button
                          type="submit"
                          disabled={loading || otpCode.length !== 6}
                          className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
                          style={{
                            background:
                              'linear-gradient(135deg, #00c853 0%, #15803d 100%)',
                            boxShadow: '0 4px 24px rgba(61,107,255,0.25)',
                          }}
                        >
                          {loading
                            ? language === 'zh'
                              ? '验证中...'
                              : 'Verifying…'
                            : language === 'zh'
                              ? '验证'
                              : 'Verify'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            {!adminMode && (
              <div className="mt-7 text-center space-y-3">
                {registrationEnabled && (
                  <p
                    className="text-[13px]"
                    style={{ color: 'rgba(255,255,255,0.62)' }}
                  >
                    {language === 'zh'
                      ? '还没有账户？'
                      : "Don't have an account?"}{' '}
                    <a
                      href="/register"
                      className="font-medium transition-opacity hover:opacity-70"
                      style={{ color: '#00c853' }}
                    >
                      {language === 'zh' ? '注册' : 'Sign up'}
                    </a>
                  </p>
                )}
                <a
                  href="/"
                  className="block text-[11px] font-bold font-mono tracking-wider transition-opacity hover:opacity-60"
                  style={{ color: '#fff' }}
                >
                  {language === 'zh' ? '返回首页' : 'RETURN TO HOME'}
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div
      className="text-[13px] px-4 py-3 rounded-xl flex items-start gap-2"
      style={{
        background: 'rgba(239,68,68,0.08)',
        color: '#f87171',
        border: '1px solid rgba(239,68,68,0.2)',
      }}
    >
      <span className="shrink-0 font-bold">!</span>
      <span>{msg}</span>
    </div>
  )
}

function SubmitBtn({
  loading,
  label,
  idleLabel,
}: {
  loading: boolean
  label: string
  idleLabel: string
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        background: 'linear-gradient(135deg, #00c853 0%, #15803d 100%)',
        boxShadow: '0 4px 24px rgba(61,107,255,0.25)',
      }}
    >
      {loading ? label : idleLabel}
    </button>
  )
}
