import React, { useState, useEffect } from 'react'
import type { Exchange } from '../../types'
import { t, type Language } from '../../i18n/translations'
import { api } from '../../lib/api'
import { getExchangeIcon } from '../ExchangeIcons'
import {
  TwoStageKeyModal,
  type TwoStageKeyModalResult,
} from '../TwoStageKeyModal'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  BookOpen01Icon,
  Delete02Icon,
  HelpCircleIcon,
  LinkSquare01Icon,
  UserAdd01Icon,
  Cancel01Icon,
  ArrowLeft01Icon,
  CheckmarkCircle01Icon,
  Copy01Icon,
  ArrowRight01Icon,
  Shield01Icon,
  Wallet01Icon,
  Key01Icon,
} from '@hugeicons/core-free-icons'
import { toast } from 'sonner'
import { Tooltip } from './Tooltip'
import { getShortName } from './utils'

const SUPPORTED_EXCHANGE_TEMPLATES = [
  { exchange_type: 'binance', name: 'Binance Futures', type: 'cex' as const },
  { exchange_type: 'bybit', name: 'Bybit Futures', type: 'cex' as const },
  { exchange_type: 'okx', name: 'OKX Futures', type: 'cex' as const },
  { exchange_type: 'bitget', name: 'Bitget Futures', type: 'cex' as const },
  { exchange_type: 'gate', name: 'Gate.io Futures', type: 'cex' as const },
  { exchange_type: 'kucoin', name: 'KuCoin Futures', type: 'cex' as const },
  { exchange_type: 'hyperliquid', name: 'Hyperliquid', type: 'dex' as const },
  { exchange_type: 'aster', name: 'Aster DEX', type: 'dex' as const },
  { exchange_type: 'lighter', name: 'Lighter', type: 'dex' as const },
]

interface ExchangeConfigModalProps {
  allExchanges: Exchange[]
  editingExchangeId: string | null
  onSave: (
    exchangeId: string | null,
    exchangeType: string,
    accountName: string,
    apiKey: string,
    secretKey?: string,
    passphrase?: string,
    testnet?: boolean,
    hyperliquidWalletAddr?: string,
    asterUser?: string,
    asterSigner?: string,
    asterPrivateKey?: string,
    lighterWalletAddr?: string,
    lighterPrivateKey?: string,
    lighterApiKeyPrivateKey?: string,
    lighterApiKeyIndex?: number
  ) => Promise<void>
  onDelete: (exchangeId: string) => void
  onClose: () => void
  language: Language
}

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="rounded-full transition-all duration-300"
          style={{
            width: i === current ? 20 : 6,
            height: 6,
            background:
              i === current
                ? 'var(--accent-primary)'
                : i < current
                  ? 'var(--accent-primary)'
                  : 'var(--surface-tertiary)',
            opacity: i <= current ? 1 : 0.5,
          }}
        />
      ))}
    </div>
  )
}

const inputClass = 'gl-input w-full'
const inputStyle: React.CSSProperties = {}
const inputFocusRing = ''

export function ExchangeConfigModal({
  allExchanges,
  editingExchangeId,
  onSave,
  onDelete,
  onClose,
  language,
}: ExchangeConfigModalProps) {
  const [currentStep, setCurrentStep] = useState(editingExchangeId ? 1 : 0)
  const [selectedExchangeType, setSelectedExchangeType] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [secretKey, setSecretKey] = useState('')
  const [passphrase, setPassphrase] = useState('')
  const [testnet, setTestnet] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const [serverIP, setServerIP] = useState<{
    public_ip: string
    message: string
  } | null>(null)
  const [loadingIP, setLoadingIP] = useState(false)
  const [copiedIP, setCopiedIP] = useState(false)
  const [showBinanceGuide, setShowBinanceGuide] = useState(false)

  const [asterUser, setAsterUser] = useState('')
  const [asterSigner, setAsterSigner] = useState('')
  const [asterPrivateKey, setAsterPrivateKey] = useState('')
  const [hyperliquidWalletAddr, setHyperliquidWalletAddr] = useState('')
  const [lighterWalletAddr, setLighterWalletAddr] = useState('')
  const [lighterApiKeyPrivateKey, setLighterApiKeyPrivateKey] = useState('')
  const [lighterApiKeyIndex, setLighterApiKeyIndex] = useState(0)

  const [secureInputTarget, setSecureInputTarget] = useState<
    null | 'hyperliquid' | 'aster' | 'lighter'
  >(null)
  const [isSaving, setIsSaving] = useState(false)
  const [accountName, setAccountName] = useState('')

  const selectedExchange = editingExchangeId
    ? allExchanges?.find((e) => e.id === editingExchangeId)
    : null

  const selectedTemplate = editingExchangeId
    ? SUPPORTED_EXCHANGE_TEMPLATES.find(
        (t) => t.exchange_type === selectedExchange?.exchange_type
      )
    : SUPPORTED_EXCHANGE_TEMPLATES.find(
        (t) => t.exchange_type === selectedExchangeType
      )

  const currentExchangeType = editingExchangeId
    ? selectedExchange?.exchange_type
    : selectedExchangeType

  const exchangeRegistrationLinks: Record<
    string,
    { url: string; hasReferral?: boolean }
  > = {
    binance: { url: 'https://www.binance.com/join?ref=', hasReferral: true },
    okx: { url: 'https://www.okx.com/join?ref=', hasReferral: true },
    bybit: { url: 'https://partner.bybit.com/b/?ref=', hasReferral: true },
    bitget: {
      url: 'https://www.bitget.com/referral/register?from=referral&clacCode=',
      hasReferral: true,
    },
    gate: { url: 'https://www.gatenode.xyz/share/?ref=', hasReferral: true },
    kucoin: { url: 'https://www.kucoin.com/r/broker/?ref=', hasReferral: true },
    hyperliquid: {
      url: 'https://app.hyperliquid.xyz/join?ref=',
      hasReferral: true,
    },
    aster: {
      url: 'https://www.asterdex.com/en/referral?ref=',
      hasReferral: true,
    },
    lighter: { url: 'https://app.lighter.xyz/?referral=', hasReferral: true },
  }

  useEffect(() => {
    if (editingExchangeId && selectedExchange) {
      setAccountName(selectedExchange.account_name || '')
      setApiKey(selectedExchange.apiKey || '')
      setSecretKey(selectedExchange.secretKey || '')
      setPassphrase('')
      setTestnet(selectedExchange.testnet || false)
      setAsterUser(selectedExchange.asterUser || '')
      setAsterSigner(selectedExchange.asterSigner || '')
      setAsterPrivateKey('')
      setHyperliquidWalletAddr(selectedExchange.hyperliquidWalletAddr || '')
      setLighterWalletAddr(selectedExchange.lighterWalletAddr || '')
      setLighterApiKeyPrivateKey('')
      setLighterApiKeyIndex(selectedExchange.lighterApiKeyIndex || 0)
    }
  }, [editingExchangeId, selectedExchange])

  useEffect(() => {
    if (currentExchangeType === 'binance' && !serverIP) {
      setLoadingIP(true)
      api
        .getServerIP()
        .then((data) => setServerIP(data))
        .catch((err) => console.error('Failed to load server IP:', err))
        .finally(() => setLoadingIP(false))
    }
  }, [currentExchangeType, serverIP])

  const handleCopyIP = async (ip: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(ip)
        setCopiedIP(true)
        setTimeout(() => setCopiedIP(false), 2000)
        toast.success(t('ipCopied', language))
      } else {
        const textArea = document.createElement('textarea')
        textArea.value = ip
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        setCopiedIP(true)
        setTimeout(() => setCopiedIP(false), 2000)
        toast.success(t('ipCopied', language))
      }
    } catch {
      toast.error(t('copyIPFailed', language) || `Copy failed: ${ip}`)
    }
  }

  const secureInputContextLabel =
    secureInputTarget === 'aster'
      ? t('asterExchangeName', language)
      : secureInputTarget === 'hyperliquid'
        ? t('hyperliquidExchangeName', language)
        : undefined

  const handleSecureInputComplete = ({ value }: TwoStageKeyModalResult) => {
    const trimmed = value.trim()
    if (secureInputTarget === 'hyperliquid') setApiKey(trimmed)
    if (secureInputTarget === 'aster') setAsterPrivateKey(trimmed)
    if (secureInputTarget === 'lighter') {
      setLighterApiKeyPrivateKey(trimmed)
      toast.success(t('lighterApiKeyImported', language))
    }
    setSecureInputTarget(null)
  }

  const maskSecret = (secret: string) => {
    if (!secret || secret.length === 0) return ''
    if (secret.length <= 8) return '*'.repeat(secret.length)
    return (
      secret.slice(0, 4) +
      '*'.repeat(Math.max(secret.length - 8, 4)) +
      secret.slice(-4)
    )
  }

  const handleSelectExchange = (exchangeType: string) => {
    setSelectedExchangeType(exchangeType)
    setCurrentStep(1)
  }

  const handleBack = () => {
    if (editingExchangeId) {
      onClose()
    } else {
      setCurrentStep(0)
      setSelectedExchangeType('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSaving) return
    if (!editingExchangeId && !selectedExchangeType) return

    const trimmedAccountName = accountName.trim()
    if (!trimmedAccountName) {
      toast.error(
        language === 'zh' ? '请输入账户名称' : 'Please enter account name'
      )
      return
    }

    const exchangeId = editingExchangeId || null
    const exchangeType = currentExchangeType || ''

    setIsSaving(true)
    try {
      if (
        currentExchangeType === 'binance' ||
        currentExchangeType === 'bybit'
      ) {
        if (!apiKey.trim() || !secretKey.trim()) return
        await onSave(
          exchangeId,
          exchangeType,
          trimmedAccountName,
          apiKey.trim(),
          secretKey.trim(),
          '',
          testnet
        )
      } else if (
        currentExchangeType === 'okx' ||
        currentExchangeType === 'bitget' ||
        currentExchangeType === 'kucoin'
      ) {
        if (!apiKey.trim() || !secretKey.trim() || !passphrase.trim()) return
        await onSave(
          exchangeId,
          exchangeType,
          trimmedAccountName,
          apiKey.trim(),
          secretKey.trim(),
          passphrase.trim(),
          testnet
        )
      } else if (currentExchangeType === 'hyperliquid') {
        if (!apiKey.trim() || !hyperliquidWalletAddr.trim()) return
        await onSave(
          exchangeId,
          exchangeType,
          trimmedAccountName,
          apiKey.trim(),
          '',
          '',
          testnet,
          hyperliquidWalletAddr.trim()
        )
      } else if (currentExchangeType === 'aster') {
        if (!asterUser.trim() || !asterSigner.trim() || !asterPrivateKey.trim())
          return
        await onSave(
          exchangeId,
          exchangeType,
          trimmedAccountName,
          '',
          '',
          '',
          testnet,
          undefined,
          asterUser.trim(),
          asterSigner.trim(),
          asterPrivateKey.trim()
        )
      } else if (currentExchangeType === 'lighter') {
        if (!lighterWalletAddr.trim() || !lighterApiKeyPrivateKey.trim()) return
        await onSave(
          exchangeId,
          exchangeType,
          trimmedAccountName,
          '',
          '',
          '',
          testnet,
          undefined,
          undefined,
          undefined,
          undefined,
          lighterWalletAddr.trim(),
          '',
          lighterApiKeyPrivateKey.trim(),
          lighterApiKeyIndex
        )
      } else {
        if (!apiKey.trim() || !secretKey.trim()) return
        await onSave(
          exchangeId,
          exchangeType,
          trimmedAccountName,
          apiKey.trim(),
          secretKey.trim(),
          '',
          testnet
        )
      }
    } finally {
      setIsSaving(false)
    }
  }

  const cexExchanges = SUPPORTED_EXCHANGE_TEMPLATES.filter(
    (t) => t.type === 'cex'
  )
  const dexExchanges = SUPPORTED_EXCHANGE_TEMPLATES.filter(
    (t) => t.type === 'dex'
  )
  const isCex =
    currentExchangeType === 'binance' ||
    currentExchangeType === 'bybit' ||
    currentExchangeType === 'okx' ||
    currentExchangeType === 'bitget' ||
    currentExchangeType === 'gate' ||
    currentExchangeType === 'kucoin'

  return (
    <div className="gl-modal-overlay" onClick={onClose}>
      <div
        className="gl-modal-panel gl-glow-border max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="gl-modal-head">
          {currentStep > 0 && !editingExchangeId && (
            <button
              type="button"
              onClick={handleBack}
              className="gl-modal-close"
              aria-label={language === 'zh' ? '返回' : 'Back'}
            >
              <HugeiconsIcon
                icon={ArrowLeft01Icon}
                size={18}
                strokeWidth={1.9}
              />
            </button>
          )}
          <span className="dash-ico">
            <HugeiconsIcon icon={Wallet01Icon} size={16} strokeWidth={1.9} />
          </span>
          <h3 className="gl-modal-title gl-metal-text flex-1 min-w-0">
            {editingExchangeId
              ? t('editExchange', language)
              : t('addExchange', language)}
          </h3>
          <div className="flex items-center gap-2">
            {!editingExchangeId && <StepDots current={currentStep} total={2} />}
            {editingExchangeId && (
              <button
                type="button"
                onClick={() => onDelete(editingExchangeId)}
                className="gl-modal-close"
                title={language === 'zh' ? '删除' : 'Delete'}
              >
                <HugeiconsIcon
                  icon={Delete02Icon}
                  size={18}
                  strokeWidth={1.9}
                />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="gl-modal-close"
              aria-label={language === 'zh' ? '关闭' : 'Close'}
            >
              <HugeiconsIcon icon={Cancel01Icon} size={18} strokeWidth={1.9} />
            </button>
          </div>
        </div>

        {/* Security badge */}
        <div
          className="flex items-center justify-center gap-2 px-5 py-2.5"
          style={{
            background: 'rgba(14, 203, 129, 0.06)',
            borderBottom: '1px solid var(--panel-border)',
          }}
        >
          <HugeiconsIcon
            icon={Shield01Icon}
            size={14}
            strokeWidth={1.9}
            style={{ color: 'var(--binance-green)' }}
          />
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {language === 'zh'
              ? '凭证已加密存储，不会以明文保存'
              : 'Credentials are encrypted at rest and never stored in plaintext'}
          </span>
        </div>

        {/* Content */}
        <div className="gl-modal-scroll dash-scroll">
          {/* Step 0: Select Exchange */}
          {currentStep === 0 && !editingExchangeId && (
            <div className="space-y-4">
              {/* CEX */}
              <div>
                <div className="gl-field-label mb-2">
                  {language === 'zh' ? '中心化交易所' : 'Centralized'}
                </div>
                <div className="gl-onyx-panel rounded-xl overflow-hidden">
                  {cexExchanges.map((template, i) => (
                    <button
                      key={template.exchange_type}
                      type="button"
                      onClick={() =>
                        handleSelectExchange(template.exchange_type)
                      }
                      className="dash-prow w-full flex items-center gap-3 px-3.5 py-3 text-left"
                      style={{
                        borderTop:
                          i > 0 ? '1px solid var(--panel-border)' : undefined,
                      }}
                    >
                      {getExchangeIcon(template.exchange_type, {
                        width: 28,
                        height: 28,
                      })}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold gl-metal-text">
                          {getShortName(template.name)}
                        </div>
                        <div
                          className="text-xs"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          {template.name}
                        </div>
                      </div>
                      <HugeiconsIcon
                        icon={ArrowRight01Icon}
                        size={16}
                        strokeWidth={1.9}
                        className="shrink-0"
                        style={{ color: 'var(--text-tertiary)' }}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* DEX */}
              <div>
                <div className="gl-field-label mb-2">
                  {language === 'zh' ? '去中心化交易所' : 'Decentralized'}
                </div>
                <div className="gl-onyx-panel rounded-xl overflow-hidden">
                  {dexExchanges.map((template, i) => (
                    <button
                      key={template.exchange_type}
                      type="button"
                      onClick={() =>
                        handleSelectExchange(template.exchange_type)
                      }
                      className="dash-prow w-full flex items-center gap-3 px-3.5 py-3 text-left"
                      style={{
                        borderTop:
                          i > 0 ? '1px solid var(--panel-border)' : undefined,
                      }}
                    >
                      {getExchangeIcon(template.exchange_type, {
                        width: 28,
                        height: 28,
                      })}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold gl-metal-text">
                          {getShortName(template.name)}
                        </div>
                        <div
                          className="text-xs"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          {template.name}
                        </div>
                      </div>
                      <HugeiconsIcon
                        icon={ArrowRight01Icon}
                        size={16}
                        strokeWidth={1.9}
                        className="shrink-0"
                        style={{ color: 'var(--text-tertiary)' }}
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Configure */}
          {(currentStep === 1 || editingExchangeId) && selectedTemplate && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Selected Exchange Pill */}
              <div className="gl-metal-panel flex items-center justify-between p-3 rounded-xl overflow-hidden">
                <div className="flex items-center gap-3">
                  {getExchangeIcon(selectedTemplate.exchange_type, {
                    width: 32,
                    height: 32,
                  })}
                  <div>
                    <div className="text-sm font-semibold gl-metal-text">
                      {getShortName(selectedTemplate.name)}
                    </div>
                    <div
                      className="text-[11px] font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      {selectedTemplate.type.toUpperCase()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {currentExchangeType === 'binance' && (
                    <button
                      type="button"
                      onClick={() => setShowGuide(true)}
                      className="gl-modal-close"
                      title={t('viewGuide', language)}
                    >
                      <HugeiconsIcon
                        icon={BookOpen01Icon}
                        size={16}
                        strokeWidth={1.9}
                      />
                    </button>
                  )}
                  <a
                    href={
                      exchangeRegistrationLinks[currentExchangeType || '']
                        ?.url || '#'
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="gl-navbar-btn inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                  >
                    <HugeiconsIcon
                      icon={UserAdd01Icon}
                      size={13}
                      strokeWidth={1.9}
                    />
                    {language === 'zh' ? '注册' : 'Register'}
                  </a>
                </div>
              </div>

              {/* Account Name */}
              <div className="space-y-1.5">
                <label className="gl-field-label">
                  {language === 'zh' ? '账户名称' : 'Account Name'}
                </label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder={
                    language === 'zh' ? '例如：主账户' : 'e.g., Main Account'
                  }
                  className={`${inputClass} ${inputFocusRing}`}
                  style={inputStyle}
                  required
                />
              </div>

              {/* CEX Fields */}
              {isCex && (
                <div className="space-y-4">
                  {currentExchangeType === 'binance' && (
                    <div
                      className="p-3 rounded-lg cursor-pointer transition-colors"
                      style={{
                        background: 'rgba(234, 179, 8, 0.06)',
                        border: '1px solid rgba(234, 179, 8, 0.15)',
                      }}
                      onClick={() => setShowBinanceGuide(!showBinanceGuide)}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className="text-xs font-semibold"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {language === 'zh'
                            ? '使用「现货与合约交易」API'
                            : 'Use "Spot & Futures Trading" API'}
                        </span>
                        <HugeiconsIcon
                          icon={ArrowLeft01Icon}
                          size={14}
                          strokeWidth={1.9}
                          className="transition-transform"
                          style={{
                            color: 'var(--text-secondary)',
                            transform: showBinanceGuide
                              ? 'rotate(-90deg)'
                              : 'rotate(0deg)',
                          }}
                        />
                      </div>
                      {showBinanceGuide && (
                        <div
                          className="mt-2 pt-2 text-xs"
                          style={{
                            borderTop: '1px solid rgba(234, 179, 8, 0.15)',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          <a
                            href={
                              language === 'zh'
                                ? 'https://www.binance.com/zh-CN/support/faq/how-to-create-api-keys-on-binance-360002502072'
                                : 'https://www.binance.com/en/support/faq/detail/360002502072'
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 hover:underline"
                            style={{ color: 'var(--accent-primary)' }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {language === 'zh'
                              ? '查看官方教程'
                              : 'View Tutorial'}{' '}
                            <HugeiconsIcon
                              icon={LinkSquare01Icon}
                              size={13}
                              strokeWidth={1.9}
                            />
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="gl-field-label">
                      {t('apiKey', language)}
                    </label>
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder={t('enterAPIKey', language)}
                      className={`${inputClass} ${inputFocusRing}`}
                      style={inputStyle}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="gl-field-label">
                      {t('secretKey', language)}
                    </label>
                    <input
                      type="password"
                      value={secretKey}
                      onChange={(e) => setSecretKey(e.target.value)}
                      placeholder={t('enterSecretKey', language)}
                      className={`${inputClass} ${inputFocusRing}`}
                      style={inputStyle}
                      required
                    />
                  </div>

                  {(currentExchangeType === 'okx' ||
                    currentExchangeType === 'bitget' ||
                    currentExchangeType === 'kucoin') && (
                    <div className="space-y-1.5">
                      <label className="gl-field-label">
                        {t('passphrase', language)}
                      </label>
                      <input
                        type="password"
                        value={passphrase}
                        onChange={(e) => setPassphrase(e.target.value)}
                        placeholder={t('enterPassphrase', language)}
                        className={`${inputClass} ${inputFocusRing}`}
                        style={inputStyle}
                        required
                      />
                    </div>
                  )}

                  {currentExchangeType === 'binance' && (
                    <div className="gl-onyx-panel p-3 rounded-xl overflow-hidden">
                      <div
                        className="text-xs font-semibold mb-1.5"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {t('whitelistIP', language)}
                      </div>
                      <div
                        className="text-xs mb-2"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {t('whitelistIPDesc', language)}
                      </div>
                      {loadingIP ? (
                        <div
                          className="text-xs"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          {t('loadingServerIP', language)}
                        </div>
                      ) : serverIP?.public_ip ? (
                        <div className="flex items-center gap-2">
                          <code
                            className="flex-1 text-xs font-mono px-2.5 py-1.5 rounded-lg tabular-nums"
                            style={{
                              background: 'rgba(10, 12, 18, 0.7)',
                              border: '1px solid var(--panel-border)',
                              color: 'var(--accent-primary)',
                            }}
                          >
                            {serverIP.public_ip}
                          </code>
                          <button
                            type="button"
                            onClick={() => handleCopyIP(serverIP.public_ip)}
                            className="gl-text-link inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium"
                          >
                            {copiedIP ? (
                              <HugeiconsIcon
                                icon={CheckmarkCircle01Icon}
                                size={13}
                                strokeWidth={1.9}
                                style={{ color: 'var(--binance-green)' }}
                              />
                            ) : (
                              <HugeiconsIcon
                                icon={Copy01Icon}
                                size={13}
                                strokeWidth={1.9}
                              />
                            )}
                            {copiedIP
                              ? t('ipCopied', language)
                              : t('copyIP', language)}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              )}

              {/* Aster Fields */}
              {currentExchangeType === 'aster' && (
                <div className="space-y-4">
                  <div
                    className="p-3 rounded-lg text-xs"
                    style={{
                      background: 'rgba(139, 92, 246, 0.06)',
                      border: '1px solid rgba(139, 92, 246, 0.15)',
                    }}
                  >
                    <div
                      className="font-medium mb-0.5"
                      style={{ color: '#A78BFA' }}
                    >
                      {t('asterApiProTitle', language)}
                    </div>
                    <div style={{ color: 'var(--text-secondary)' }}>
                      {t('asterApiProDesc', language)}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="gl-field-label flex items-center gap-1.5">
                      {t('asterUserLabel', language)}
                      <Tooltip content={t('asterUserDesc', language)}>
                        <HugeiconsIcon
                          icon={HelpCircleIcon}
                          size={14}
                          strokeWidth={1.9}
                          className="cursor-help"
                          style={{ color: 'var(--text-tertiary)' }}
                        />
                      </Tooltip>
                    </label>
                    <input
                      type="text"
                      value={asterUser}
                      onChange={(e) => setAsterUser(e.target.value)}
                      placeholder={t('enterAsterUser', language)}
                      className={`${inputClass} ${inputFocusRing}`}
                      style={inputStyle}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="gl-field-label flex items-center gap-1.5">
                      {t('asterSignerLabel', language)}
                      <Tooltip content={t('asterSignerDesc', language)}>
                        <HugeiconsIcon
                          icon={HelpCircleIcon}
                          size={14}
                          strokeWidth={1.9}
                          className="cursor-help"
                          style={{ color: 'var(--text-tertiary)' }}
                        />
                      </Tooltip>
                    </label>
                    <input
                      type="text"
                      value={asterSigner}
                      onChange={(e) => setAsterSigner(e.target.value)}
                      placeholder={t('enterAsterSigner', language)}
                      className={`${inputClass} ${inputFocusRing}`}
                      style={inputStyle}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="gl-field-label flex items-center gap-1.5">
                      {t('asterPrivateKeyLabel', language)}
                      <Tooltip content={t('asterPrivateKeyDesc', language)}>
                        <HugeiconsIcon
                          icon={HelpCircleIcon}
                          size={14}
                          strokeWidth={1.9}
                          className="cursor-help"
                          style={{ color: 'var(--text-tertiary)' }}
                        />
                      </Tooltip>
                    </label>
                    <input
                      type="password"
                      value={asterPrivateKey}
                      onChange={(e) => setAsterPrivateKey(e.target.value)}
                      placeholder={t('enterAsterPrivateKey', language)}
                      className={`${inputClass} ${inputFocusRing}`}
                      style={inputStyle}
                      required
                    />
                  </div>
                </div>
              )}

              {/* Hyperliquid Fields */}
              {currentExchangeType === 'hyperliquid' && (
                <div className="space-y-4">
                  <div
                    className="p-3 rounded-lg text-xs"
                    style={{
                      background: 'rgba(127, 231, 204, 0.06)',
                      border: '1px solid rgba(127, 231, 204, 0.15)',
                    }}
                  >
                    <div
                      className="font-medium mb-0.5"
                      style={{ color: '#7FE7CC' }}
                    >
                      {t('hyperliquidAgentWalletTitle', language)}
                    </div>
                    <div style={{ color: 'var(--text-secondary)' }}>
                      {t('hyperliquidAgentWalletDesc', language)}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="gl-field-label">
                      {t('hyperliquidAgentPrivateKey', language)}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={maskSecret(apiKey)}
                        readOnly
                        placeholder={t(
                          'enterHyperliquidAgentPrivateKey',
                          language
                        )}
                        className={`flex-1 ${inputClass} font-mono`}
                        style={inputStyle}
                      />
                      <button
                        type="button"
                        onClick={() => setSecureInputTarget('hyperliquid')}
                        className="gl-navbar-btn inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap"
                      >
                        <HugeiconsIcon
                          icon={Key01Icon}
                          size={14}
                          strokeWidth={1.9}
                        />
                        {apiKey
                          ? t('secureInputReenter', language)
                          : t('secureInputButton', language)}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="gl-field-label">
                      {t('hyperliquidMainWalletAddress', language)}
                    </label>
                    <input
                      type="text"
                      value={hyperliquidWalletAddr}
                      onChange={(e) => setHyperliquidWalletAddr(e.target.value)}
                      placeholder={t(
                        'enterHyperliquidMainWalletAddress',
                        language
                      )}
                      className={`${inputClass} ${inputFocusRing}`}
                      style={inputStyle}
                      required
                    />
                  </div>
                </div>
              )}

              {/* Lighter Fields */}
              {currentExchangeType === 'lighter' && (
                <div className="space-y-4">
                  <div
                    className="p-3 rounded-lg text-xs"
                    style={{
                      background: 'rgba(0, 200, 83, 0.06)',
                      border: '1px solid rgba(0, 200, 83, 0.15)',
                    }}
                  >
                    <div
                      className="font-medium mb-0.5"
                      style={{ color: 'var(--accent-primary)' }}
                    >
                      {language === 'zh'
                        ? 'Lighter API Key 配置'
                        : 'Lighter API Key Setup'}
                    </div>
                    <div style={{ color: 'var(--text-secondary)' }}>
                      {language === 'zh'
                        ? '请在 Lighter 网站生成 API Key'
                        : 'Generate an API Key on Lighter website'}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="gl-field-label">
                      {t('lighterWalletAddress', language)}
                    </label>
                    <input
                      type="text"
                      value={lighterWalletAddr}
                      onChange={(e) => setLighterWalletAddr(e.target.value)}
                      placeholder={t('enterLighterWalletAddress', language)}
                      className={`${inputClass} ${inputFocusRing}`}
                      style={inputStyle}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="gl-field-label flex items-center gap-1.5">
                      {t('lighterApiKeyPrivateKey', language)}
                      <button
                        type="button"
                        onClick={() => setSecureInputTarget('lighter')}
                        className="text-xs underline"
                        style={{ color: 'var(--accent-primary)' }}
                      >
                        {t('secureInputButton', language)}
                      </button>
                    </label>
                    <input
                      type="password"
                      value={lighterApiKeyPrivateKey}
                      onChange={(e) =>
                        setLighterApiKeyPrivateKey(e.target.value)
                      }
                      placeholder={t('enterLighterApiKeyPrivateKey', language)}
                      className={`${inputClass} ${inputFocusRing} font-mono`}
                      style={inputStyle}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="gl-field-label flex items-center gap-1.5">
                      {language === 'zh' ? 'API Key 索引' : 'API Key Index'}
                      <Tooltip
                        content={
                          language === 'zh'
                            ? 'API Key 索引从0开始'
                            : 'API Key index starts from 0'
                        }
                      >
                        <HugeiconsIcon
                          icon={HelpCircleIcon}
                          size={14}
                          strokeWidth={1.9}
                          className="cursor-help"
                          style={{ color: 'var(--text-tertiary)' }}
                        />
                      </Tooltip>
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={255}
                      value={lighterApiKeyIndex}
                      onChange={(e) =>
                        setLighterApiKeyIndex(parseInt(e.target.value) || 0)
                      }
                      className={`${inputClass} ${inputFocusRing}`}
                      style={inputStyle}
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div
                className="flex gap-2.5 pt-4 mt-1"
                style={{ borderTop: '1px solid var(--panel-border)' }}
              >
                <button
                  type="button"
                  onClick={handleBack}
                  className="gl-modal-btn-ghost flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold"
                >
                  {editingExchangeId
                    ? t('cancel', language)
                    : language === 'zh'
                      ? '返回'
                      : 'Back'}
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !accountName.trim()}
                  className="gl-modal-btn-primary flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    t('saving', language) || 'Saving...'
                  ) : (
                    <>
                      {t('saveConfig', language)}{' '}
                      <HugeiconsIcon
                        icon={ArrowRight01Icon}
                        size={15}
                        strokeWidth={1.9}
                      />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Binance Guide Modal */}
      {showGuide && (
        <div className="gl-modal-overlay" onClick={() => setShowGuide(false)}>
          <div
            className="gl-modal-panel gl-glow-border max-w-4xl max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="gl-modal-head">
              <span className="dash-ico">
                <HugeiconsIcon
                  icon={BookOpen01Icon}
                  size={16}
                  strokeWidth={1.9}
                />
              </span>
              <h3 className="gl-modal-title gl-metal-text flex-1 min-w-0">
                {t('binanceSetupGuide', language)}
              </h3>
              <button
                onClick={() => setShowGuide(false)}
                className="gl-modal-close"
                aria-label={language === 'zh' ? '关闭' : 'Close'}
              >
                <HugeiconsIcon
                  icon={Cancel01Icon}
                  size={18}
                  strokeWidth={1.9}
                />
              </button>
            </div>
            <div className="gl-modal-scroll dash-scroll flex-1 space-y-4">
              {/* Section 1: App config */}
              <div className="gl-onyx-panel p-4 rounded-xl overflow-hidden">
                <h4 className="text-sm font-semibold mb-2 gl-metal-text">
                  {t('binanceGuideSection1', language)}
                </h4>
                <p
                  className="text-xs leading-relaxed"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {t('binanceGuideSection1Steps', language)}
                </p>
              </div>
              {/* Section 2: Web API */}
              <div className="gl-onyx-panel p-4 rounded-xl overflow-hidden">
                <h4 className="text-sm font-semibold mb-2 gl-metal-text">
                  {t('binanceGuideSection2', language)}
                </h4>
                <p
                  className="text-xs leading-relaxed"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {t('binanceGuideSection2Steps', language)}
                </p>
              </div>
              {/* Section 3: IP lookup */}
              <div className="gl-onyx-panel p-4 rounded-xl overflow-hidden">
                <h4 className="text-sm font-semibold mb-2 gl-metal-text">
                  {t('binanceGuideSection3', language)}
                </h4>
                <ul
                  className="text-xs space-y-1"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <li>• {t('binanceGuideSection3Windows', language)}</li>
                  <li>• {t('binanceGuideSection3Mac', language)}</li>
                </ul>
              </div>
              {/* Important notes */}
              <div
                className="p-4 rounded-xl"
                style={{
                  background: 'rgba(234, 179, 8, 0.06)',
                  border: '1px solid rgba(234, 179, 8, 0.2)',
                }}
              >
                <p
                  className="text-xs leading-relaxed"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {t('binanceGuideNote1', language)}{' '}
                  {t('binanceGuideNote2', language)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Secure Input Modal */}
      <TwoStageKeyModal
        isOpen={secureInputTarget !== null}
        language={language}
        contextLabel={secureInputContextLabel}
        expectedLength={64}
        onCancel={() => setSecureInputTarget(null)}
        onComplete={handleSecureInputComplete}
      />
    </div>
  )
}
