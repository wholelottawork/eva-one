import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { t } from '../i18n/translations'
import { getSystemConfig } from '../lib/config'
import { toast } from 'sonner'
import { copyWithToast } from '../lib/clipboard'
import { Eye, EyeOff, ArrowLeft, Shield, Copy, Check } from 'lucide-react'
import PasswordChecklist from 'react-password-checklist'
import { RegistrationDisabled } from './RegistrationDisabled'
import { WhitelistFullPage } from './WhitelistFullPage'
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

export function RegisterPage() {
  const { language } = useLanguage()
  const { register, completeRegistration } = useAuth()
  const [step, setStep] = useState<
    'register' | 'setup-otp' | 'verify-otp' | 'whitelist-full'
  >('register')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [betaCode, setBetaCode] = useState('')
  const [betaMode, setBetaMode] = useState(false)
  const [registrationEnabled, setRegistrationEnabled] = useState(true)
  const [otpCode, setOtpCode] = useState('')
  const [userID, setUserID] = useState('')
  const [otpSecret, setOtpSecret] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [passwordValid, setPasswordValid] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    getSystemConfig()
      .then((config) => {
        setBetaMode(config.beta_mode || false)
        setRegistrationEnabled(config.registration_enabled !== false)
      })
      .catch((err) => {
        console.error('Failed to fetch system config:', err)
      })
  }, [])

  if (!registrationEnabled) return <RegistrationDisabled />
  if (step === 'whitelist-full')
    return <WhitelistFullPage onBack={() => setStep('register')} />

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!passwordValid) {
      setError(t('passwordNotMeetRequirements', language))
      return
    }
    if (betaMode && !betaCode.trim()) {
      setError(
        language === 'zh'
          ? '内测期间，注册需要提供内测码'
          : 'Beta code required during closed beta'
      )
      return
    }
    setLoading(true)
    try {
      const result = await register(
        email,
        password,
        betaCode.trim() || undefined
      )
      const isWhitelistError = (msg: string) => {
        const lm = msg.toLowerCase()
        return (
          lm.includes('whitelist') ||
          lm.includes('capacity') ||
          lm.includes('limit') ||
          lm.includes('permission denied') ||
          lm.includes('not on whitelist')
        )
      }
      if (result.success && result.completed) {
        return
      }
      if (result.success && result.userID && result.otpSecret) {
        setUserID(result.userID)
        setOtpSecret(result.otpSecret)
        setStep('setup-otp')
      } else {
        const msg = result.message || t('registrationFailed', language)
        if (isWhitelistError(msg)) {
          setStep('whitelist-full')
          return
        }
        setError(msg)
        toast.error(msg)
      }
    } catch (e) {
      const errorMsg =
        e instanceof Error
          ? e.message
          : 'Registration failed due to server error'
      const lm = errorMsg.toLowerCase()
      if (
        lm.includes('whitelist') ||
        lm.includes('capacity') ||
        lm.includes('limit') ||
        lm.includes('permission denied') ||
        lm.includes('not on whitelist')
      ) {
        setStep('whitelist-full')
        return
      }
      setError(errorMsg)
      toast.error(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const handleSetupComplete = () => setStep('verify-otp')

  const handleOTPVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result = await completeRegistration(userID, otpCode)
    if (!result.success) {
      const msg = result.message || t('registrationFailed', language)
      setError(msg)
      toast.error(msg)
    }
    setLoading(false)
  }

  const copyToClipboard = (text: string) => {
    copyWithToast(
      text,
      t('copiedToClipboard', language),
      t('copyFailed', language)
    )
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const stepIndex = step === 'register' ? 0 : step === 'setup-otp' ? 1 : 2

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ background: '#04050A' }}
    >
      {/* ── Left poster panel — fixed full-height overlay; portada image bg + headline
          on a legibility scrim + animated glowing right edge (/public/login-poster.png). ── */}
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
              START
              <br />
              <span className="gl-title-metal-blue">TRADING</span>
              <br />
              TODAY
            </h2>
            <p
              className="text-[13px] font-mono leading-relaxed mb-12"
              style={{ color: 'rgba(255,255,255,0.86)' }}
            >
              Create your account and gain access
              <br />
              to autonomous AI trading agents.
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

            {/* Step progress bar */}
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
                      {step === 'register'
                        ? 'CREATE ACCOUNT'
                        : step === 'setup-otp'
                          ? 'SECURE SETUP'
                          : 'VERIFY'}
                    </p>
                    <h1 className="text-[1.6rem] font-bold mb-1 tracking-tight text-white inline-block">
                      {step === 'register'
                        ? language === 'zh'
                          ? '创建账户'
                          : 'Create account'
                        : step === 'setup-otp'
                          ? language === 'zh'
                            ? '设置两步验证'
                            : 'Set up 2FA'
                          : language === 'zh'
                            ? '验证账户'
                            : 'Verify account'}
                    </h1>
                    <p
                      className="text-[13px]"
                      style={{ color: 'rgba(255,255,255,0.38)' }}
                    >
                      {step === 'register'
                        ? language === 'zh'
                          ? '填写以下信息完成注册'
                          : 'Enter your details to get started'
                        : step === 'setup-otp'
                          ? language === 'zh'
                            ? '扫描二维码完成安全设置'
                            : 'Secure your account with 2FA'
                          : language === 'zh'
                            ? '输入验证码激活您的账户'
                            : 'Enter the code to activate your account'}
                    </p>
                  </div>

                  {/* ── Register step ── */}
                  {step === 'register' && (
                    <form
                      onSubmit={handleRegister}
                      className="space-y-4 sm:space-y-5"
                    >
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
                            className={inputFocusClass}
                            style={{ ...inputStyle, paddingLeft: '42px' }}
                            placeholder="you@example.com"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label
                          className="block text-[11px] font-mono tracking-wider mb-2"
                          style={{ color: 'rgba(255,255,255,0.4)' }}
                        >
                          {language === 'zh' ? '密码' : 'PASSWORD'}
                        </label>
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
                            className={inputFocusClass}
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

                      <div>
                        <label
                          className="block text-[11px] font-mono tracking-wider mb-2"
                          style={{ color: 'rgba(255,255,255,0.4)' }}
                        >
                          {language === 'zh' ? '确认密码' : 'CONFIRM PASSWORD'}
                        </label>
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
                            type={showConfirmPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className={inputFocusClass}
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
                            onClick={() =>
                              setShowConfirmPassword(!showConfirmPassword)
                            }
                            className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-60"
                            style={{ color: 'rgba(255,255,255,0.3)' }}
                          >
                            {showConfirmPassword ? (
                              <EyeOff size={16} />
                            ) : (
                              <Eye size={16} />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Password requirements */}
                      <div
                        className="rounded-xl p-3.5"
                        style={{
                          background: 'rgba(255,255,255,0.025)',
                          border: '1px solid rgba(255,255,255,0.06)',
                        }}
                      >
                        <p
                          className="text-[10px] font-mono tracking-wider mb-2.5"
                          style={{ color: 'rgba(255,255,255,0.3)' }}
                        >
                          {language === 'zh'
                            ? '密码要求'
                            : 'PASSWORD REQUIREMENTS'}
                        </p>
                        <div
                          className="text-xs"
                          style={{ color: 'rgba(255,255,255,0.4)' }}
                        >
                          <PasswordChecklist
                            rules={[
                              'minLength',
                              'capital',
                              'lowercase',
                              'number',
                              'specialChar',
                              'match',
                            ]}
                            minLength={8}
                            value={password}
                            valueAgain={confirmPassword}
                            messages={{
                              minLength: t('passwordRuleMinLength', language),
                              capital: t('passwordRuleUppercase', language),
                              lowercase: t('passwordRuleLowercase', language),
                              number: t('passwordRuleNumber', language),
                              specialChar: t('passwordRuleSpecial', language),
                              match: t('passwordRuleMatch', language),
                            }}
                            className="grid grid-cols-2 gap-x-4 gap-y-1"
                            onChange={(isValid) => setPasswordValid(isValid)}
                            iconSize={10}
                            iconComponents={{
                              ValidIcon: (
                                <span
                                  style={{
                                    color: '#00c853',
                                    marginRight: 4,
                                    fontSize: 10,
                                  }}
                                >
                                  ✓
                                </span>
                              ),
                              InvalidIcon: (
                                <span
                                  style={{ width: 14, display: 'inline-block' }}
                                />
                              ),
                            }}
                          />
                        </div>
                      </div>

                      {betaMode && (
                        <div>
                          <label
                            className="block text-[11px] font-mono tracking-wider mb-2"
                            style={{ color: 'rgba(255,255,255,0.4)' }}
                          >
                            {language === 'zh' ? '内测码' : 'BETA CODE'}
                          </label>
                          <input
                            type="text"
                            value={betaCode}
                            onChange={(e) =>
                              setBetaCode(
                                e.target.value
                                  .replace(/[^a-z0-9]/gi, '')
                                  .toLowerCase()
                              )
                            }
                            className={`${inputFocusClass} font-mono tracking-wider`}
                            style={inputStyle}
                            placeholder="XXXXXX"
                            maxLength={6}
                            required={betaMode}
                          />
                        </div>
                      )}

                      {error && <ErrorBox msg={error} />}

                      <div className="flex justify-center pt-1">
                        <StaticMetalBar
                          type="submit"
                          disabled={
                            loading ||
                            (betaMode && !betaCode.trim()) ||
                            !passwordValid
                          }
                        >
                          {loading
                            ? language === 'zh'
                              ? '注册中...'
                              : 'Creating account…'
                            : language === 'zh'
                              ? '创建账户'
                              : 'Create account'}
                        </StaticMetalBar>
                      </div>
                    </form>
                  )}

                  {/* ── Setup OTP step ── */}
                  {step === 'setup-otp' && (
                    <div className="space-y-6">
                      <div
                        className="rounded-xl p-5 text-center"
                        style={{
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.07)',
                        }}
                      >
                        <p
                          className="text-[10px] font-mono tracking-wider mb-5"
                          style={{ color: 'rgba(255,255,255,0.4)' }}
                        >
                          {language === 'zh'
                            ? '完成两步验证配置'
                            : 'COMPLETE 2FA CONFIGURATION'}
                        </p>
                        <OtpQrCode email={email} secret={otpSecret} />
                        {otpSecret ? null : (
                          <p
                            className="text-[11px] mb-4"
                            style={{ color: 'rgba(255,255,255,0.35)' }}
                          >
                            {language === 'zh'
                              ? '正在生成二维码…'
                              : 'Generating QR code…'}
                          </p>
                        )}
                        <p
                          className="text-[11px] font-mono mb-2"
                          style={{ color: 'rgba(255,255,255,0.35)' }}
                        >
                          {language === 'zh' ? '备用密钥' : 'BACKUP SECRET KEY'}
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
                            onClick={() => copyToClipboard(otpSecret)}
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
                              language === 'zh' ? '扫描二维码' : 'Scan QR code',
                            sub:
                              language === 'zh'
                                ? '打开验证器应用，扫描上方二维码'
                                : 'Open your app and scan the code above',
                          },
                          {
                            n: '03',
                            title:
                              language === 'zh'
                                ? '输入验证码'
                                : 'Enter verification code',
                            sub:
                              language === 'zh'
                                ? '在下一步输入应用生成的6位验证码'
                                : 'Enter the 6-digit code in the next step',
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
                        onClick={handleSetupComplete}
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
                  )}

                  {/* ── Verify OTP step ── */}
                  {step === 'verify-otp' && (
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
                          className={`${inputFocusClass} text-center text-2xl font-mono`}
                          style={{ ...inputStyle, letterSpacing: '0.5em' }}
                          placeholder="000000"
                          maxLength={6}
                          required
                          autoFocus
                        />
                      </div>

                      {error && <ErrorBox msg={error} />}

                      <button
                        type="submit"
                        disabled={loading || otpCode.length !== 6}
                        className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
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
                            ? '激活账户'
                            : 'Activate account'}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-7 text-center space-y-3">
              <p
                className="text-[13px]"
                style={{ color: 'rgba(255,255,255,0.62)' }}
              >
                {language === 'zh' ? '已有账户？' : 'Already have an account?'}{' '}
                <a
                  href="/login"
                  className="font-medium transition-opacity hover:opacity-70"
                  style={{ color: '#00c853' }}
                >
                  {language === 'zh' ? '登录' : 'Sign in'}
                </a>
              </p>
              <a
                href="/"
                className="block text-[11px] font-bold font-mono tracking-wider transition-opacity hover:opacity-60"
                style={{ color: '#fff' }}
              >
                {language === 'zh' ? '返回首页' : 'RETURN TO HOME'}
              </a>
            </div>
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
