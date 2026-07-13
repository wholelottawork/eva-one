import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { t, type Language } from '../i18n/translations'
import { toast } from 'sonner'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Cancel01Icon,
  SquareLockPasswordIcon,
  Key01Icon,
  ArrowLeft01Icon,
  CheckmarkCircle01Icon,
  InformationCircleIcon,
} from '@hugeicons/core-free-icons'

const DEFAULT_LENGTH = 64

function generateObfuscation(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(
    ''
  )
}

function validatePrivateKeyFormat(
  value: string,
  expectedLength: number
): boolean {
  const normalized = value.startsWith('0x') ? value.slice(2) : value
  if (normalized.length !== expectedLength) {
    return false
  }
  return /^[0-9a-fA-F]+$/.test(normalized)
}

export interface TwoStageKeyModalResult {
  value: string
  obfuscationLog: string[]
}

interface TwoStageKeyModalProps {
  isOpen: boolean
  language: Language
  onCancel: () => void
  onComplete: (result: TwoStageKeyModalResult) => void
  expectedLength?: number
  contextLabel?: string
}

export function TwoStageKeyModal({
  isOpen,
  language,
  onCancel,
  onComplete,
  expectedLength = DEFAULT_LENGTH,
  contextLabel,
}: TwoStageKeyModalProps) {
  const [stage, setStage] = useState<1 | 2>(1)
  const [part1, setPart1] = useState('')
  const [part2, setPart2] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [clipboardStatus, setClipboardStatus] = useState<
    'idle' | 'copied' | 'failed'
  >('idle')
  const [obfuscationLog, setObfuscationLog] = useState<string[]>([])
  const [processing, setProcessing] = useState(false)
  const [manualObfuscationValue, setManualObfuscationValue] = useState<
    string | null
  >(null)

  const stage1Ref = useRef<HTMLInputElement>(null)
  const stage2Ref = useRef<HTMLInputElement>(null)

  // UX improvement: Use 58 + 6 split (most of the key + last 6 chars)
  // Advantage: Second stage only requires entering 6 characters, much easier to count
  const expectedPart1Length = expectedLength - 6 // 64 - 6 = 58
  const expectedPart2Length = 6 // Last 6 characters

  useEffect(() => {
    if (isOpen && stage === 1 && stage1Ref.current) {
      stage1Ref.current.focus()
    } else if (isOpen && stage === 2 && stage2Ref.current) {
      stage2Ref.current.focus()
    }
  }, [isOpen, stage])

  const handleStage1Next = async () => {
    // Normalize input (remove possible 0x prefix) before validating length
    const normalized1 = part1.startsWith('0x') ? part1.slice(2) : part1
    if (normalized1.length < expectedPart1Length) {
      setError(
        t('errors.privatekeyIncomplete', language, {
          expected: expectedPart1Length,
        })
      )
      return
    }

    setError(null)
    setProcessing(true)

    try {
      // 生成混淆字符串
      const obfuscation = generateObfuscation()
      setManualObfuscationValue(obfuscation)

      // 尝试复制到剪贴板
      if (navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(obfuscation)
          setClipboardStatus('copied')
          setObfuscationLog([
            ...obfuscationLog,
            `Stage 1: ${new Date().toISOString()} - Auto copied obfuscation`,
          ])
          toast.success(t('twoStageKey.obfuscationCopied', language))
        } catch {
          setClipboardStatus('failed')
          setObfuscationLog([
            ...obfuscationLog,
            `Stage 1: ${new Date().toISOString()} - Auto copy failed, manual required`,
          ])
          toast.error(t('twoStageKey.obfuscationCopyFailed', language))
        }
      } else {
        setClipboardStatus('failed')
        setObfuscationLog([
          ...obfuscationLog,
          `Stage 1: ${new Date().toISOString()} - Clipboard API not available`,
        ])
        toast(t('twoStageKey.clipboardNotSupported', language))
      }

      setTimeout(() => {
        setStage(2)
        setProcessing(false)
      }, 2000)
    } catch (err) {
      setError(t('errors.privatekeyObfuscationFailed', language))
      setProcessing(false)
    }
  }

  const handleStage2Complete = () => {
    // Normalize input (remove possible 0x prefix) before validating length
    const normalized2 = part2.startsWith('0x') ? part2.slice(2) : part2
    if (normalized2.length < expectedPart2Length) {
      setError(
        t('errors.privatekeyIncomplete', language, {
          expected: expectedPart2Length,
        })
      )
      return
    }

    // Concatenate after removing 0x prefix from both parts
    const normalized1 = part1.startsWith('0x') ? part1.slice(2) : part1
    const fullKey = normalized1 + normalized2
    if (!validatePrivateKeyFormat(fullKey, expectedLength)) {
      setError(t('errors.privatekeyInvalidFormat', language))
      return
    }

    const finalLog = [
      ...obfuscationLog,
      `Stage 2: ${new Date().toISOString()} - Completed`,
    ]
    onComplete({
      value: fullKey,
      obfuscationLog: finalLog,
    })
  }

  const handleReset = () => {
    setStage(1)
    setPart1('')
    setPart2('')
    setError(null)
    setClipboardStatus('idle')
    setObfuscationLog([])
    setProcessing(false)
    setManualObfuscationValue(null)
  }

  const modalContent = useMemo(() => {
    if (!isOpen) return null

    return (
      <div className="gl-modal-overlay" onClick={onCancel}>
        <div
          className="gl-modal-panel gl-glow-border max-w-lg w-full"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="gl-modal-head">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <span className="dash-ico shrink-0">
                <HugeiconsIcon
                  icon={SquareLockPasswordIcon}
                  size={18}
                  strokeWidth={1.9}
                />
              </span>
              <div className="min-w-0">
                <h2 className="gl-modal-title gl-metal-text truncate">
                  {t('twoStageKey.title', language)}
                </h2>
                {contextLabel && (
                  <span
                    className="text-xs truncate block"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {contextLabel}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onCancel}
              className="gl-modal-close"
              aria-label={t('twoStageKey.cancelButton', language)}
            >
              <HugeiconsIcon icon={Cancel01Icon} size={18} strokeWidth={1.9} />
            </button>
          </div>

          {/* Content */}
          <div className="gl-modal-scroll space-y-4">
            {/* Stage indicator */}
            <div className="gl-seg">
              <div className="gl-seg-item" data-active={String(stage === 1)}>
                <span className="tabular-nums">1</span>
                <span className="ml-1.5">
                  {t('twoStageKey.stage1InputLabel', language)}
                </span>
              </div>
              <div className="gl-seg-item" data-active={String(stage === 2)}>
                <span className="tabular-nums">2</span>
                <span className="ml-1.5">
                  {t('twoStageKey.stage2InputLabel', language)}
                </span>
              </div>
            </div>

            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {stage === 1
                ? t('twoStageKey.stage1Description', language, {
                    length: expectedPart1Length,
                  })
                : t('twoStageKey.stage2Description', language, {
                    length: expectedPart2Length,
                  })}
            </p>

            {/* Stage 1 */}
            {stage === 1 && (
              <>
                <div className="space-y-1.5">
                  <label className="gl-field-label">
                    {t('twoStageKey.stage1InputLabel', language)} (
                    {expectedPart1Length}{' '}
                    {t('twoStageKey.characters', language)})
                  </label>
                  <input
                    ref={stage1Ref}
                    type="password"
                    value={part1}
                    onChange={(e) => setPart1(e.target.value)}
                    placeholder="0x1234..."
                    className="gl-input font-mono tabular-nums"
                    maxLength={expectedPart1Length + 2}
                    disabled={processing}
                  />
                </div>

                {error && (
                  <div className="gl-field-error flex items-center gap-1.5">
                    <HugeiconsIcon
                      icon={InformationCircleIcon}
                      size={14}
                      strokeWidth={1.9}
                    />
                    {error}
                  </div>
                )}

                <div className="gl-modal-foot">
                  <button
                    type="button"
                    onClick={onCancel}
                    disabled={processing}
                    className="gl-modal-btn-ghost flex-1 inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('twoStageKey.cancelButton', language)}
                  </button>
                  <button
                    type="button"
                    onClick={handleStage1Next}
                    disabled={
                      (part1.startsWith('0x') ? part1.slice(2) : part1).length <
                        expectedPart1Length || processing
                    }
                    className="gl-modal-btn-primary flex-1 inline-flex items-center justify-center px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processing
                      ? t('twoStageKey.processing', language)
                      : t('twoStageKey.nextButton', language)}
                  </button>
                </div>
              </>
            )}

            {/* Transition Message */}
            {stage === 2 && clipboardStatus !== 'idle' && (
              <div
                className="gl-onyx-panel rounded-xl overflow-hidden p-3.5"
                style={{
                  boxShadow:
                    'inset 0 1px 0 rgba(255,255,255,0.05), 0 0 18px rgba(61,107,255,0.14)',
                }}
              >
                {clipboardStatus === 'copied' && (
                  <div style={{ color: 'var(--text-secondary)' }}>
                    <div
                      className="font-semibold text-sm flex items-center gap-2"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      <HugeiconsIcon
                        icon={CheckmarkCircle01Icon}
                        size={16}
                        strokeWidth={1.9}
                        style={{ color: 'var(--binance-green)' }}
                      />
                      {t('twoStageKey.obfuscationCopied', language)}
                    </div>
                    <div className="text-xs mt-1.5">
                      {t('twoStageKey.obfuscationInstruction', language)}
                    </div>
                  </div>
                )}
                {clipboardStatus === 'failed' && manualObfuscationValue && (
                  <div style={{ color: 'var(--text-secondary)' }}>
                    <div
                      className="font-semibold text-sm flex items-center gap-2"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      <HugeiconsIcon
                        icon={Key01Icon}
                        size={16}
                        strokeWidth={1.9}
                        style={{ color: '#86efac' }}
                      />
                      {t('twoStageKey.obfuscationManual', language)}
                    </div>
                    <div
                      className="text-xs mt-2 p-2.5 rounded-lg font-mono break-all tabular-nums"
                      style={{
                        background: 'var(--surface-primary)',
                        border: '1px solid var(--panel-border)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      {manualObfuscationValue}
                    </div>
                    <div className="text-xs mt-1.5">
                      {t('twoStageKey.obfuscationInstruction', language)}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Stage 2 */}
            {stage === 2 && (
              <>
                <div className="space-y-1.5">
                  <label className="gl-field-label">
                    {t('twoStageKey.stage2InputLabel', language)} (
                    {expectedPart2Length}{' '}
                    {t('twoStageKey.characters', language)})
                  </label>
                  <input
                    ref={stage2Ref}
                    type="password"
                    value={part2}
                    onChange={(e) => setPart2(e.target.value)}
                    placeholder="...5678"
                    className="gl-input font-mono tabular-nums"
                    maxLength={expectedPart2Length + 2}
                  />
                </div>

                {error && (
                  <div className="gl-field-error flex items-center gap-1.5">
                    <HugeiconsIcon
                      icon={InformationCircleIcon}
                      size={14}
                      strokeWidth={1.9}
                    />
                    {error}
                  </div>
                )}

                <div className="gl-modal-foot">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="gl-modal-btn-ghost flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold"
                  >
                    <HugeiconsIcon
                      icon={ArrowLeft01Icon}
                      size={16}
                      strokeWidth={1.9}
                    />
                    {t('twoStageKey.backButton', language)}
                  </button>
                  <button
                    type="button"
                    onClick={handleStage2Complete}
                    disabled={
                      (part2.startsWith('0x') ? part2.slice(2) : part2).length <
                      expectedPart2Length
                    }
                    className="gl-modal-btn-primary flex-1 inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <HugeiconsIcon
                      icon={SquareLockPasswordIcon}
                      size={16}
                      strokeWidth={1.9}
                    />
                    {t('twoStageKey.encryptButton', language)}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }, [
    isOpen,
    stage,
    part1,
    part2,
    error,
    processing,
    clipboardStatus,
    manualObfuscationValue,
    language,
    expectedPart1Length,
    expectedPart2Length,
    contextLabel,
    obfuscationLog,
    onCancel,
    onComplete,
  ])

  if (!isOpen) return null

  return createPortal(modalContent, document.body)
}
