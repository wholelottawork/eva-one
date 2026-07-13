import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import {
  RefreshCw,
  ChevronUp,
  ChevronDown,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  BookUser,
  ArrowRight,
} from 'lucide-react'
import {
  Wallet as PhWallet,
  CheckCircle as PhCheck,
} from '@phosphor-icons/react'
import { TokenIcon } from '@web3icons/react/dynamic'
import HeaderBar from '../components/HeaderBar'
import { LoginRequiredOverlay } from '../components/LoginRequiredOverlay'
import ContactsPanel from '../components/ContactsPanel'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { useTheme } from '../contexts/ThemeContext'
import { useAppKit } from '@reown/appkit/react'
import { useAccount, useSwitchChain } from 'wagmi'
import { DEFAULT_WALLET_NETWORK } from '../config/wallet'
import { api } from '../lib/api'
import type { WalletChatSwapIntent } from '../lib/api'
import { apiUrl } from '../lib/config'
import type { WalletBalancesResponse, WalletTokenBalance } from '../types'
import { InlineSwapWidget } from '../components/InlineSwapWidget'
import { getContacts, resolveContacts, type Contact } from '../lib/contacts'
import { goTo } from '../lib/nav'
import { t } from '../i18n/translations'

// DarkVeil WebGL background (ReactBits) — replaces the heavy 3D CoinField on the
// landing (the coin chunk was ~3.2MB + slow). CoinField.tsx is KEPT for reuse.
import DarkVeil from '../components/three/DarkVeil'
import { LoadingScreen } from '../components/LoadingScreen'
import LiquidMetalButton from '../components/LiquidMetalButton'
import { ErrorBoundary } from '../components/ErrorBoundary'

const HERO_NAME = 'EVA'
const HERO_LETTERS = HERO_NAME.split('')

const TYPEWRITER_KEYS = [
  'defi',
  'movers',
  'portfolio',
  'rebalance',
  'staking',
  'chains',
] as const

const COMMAND_KEYS = [
  { id: 'analyze', hint: '/analyze' },
  { id: 'defi', hint: '/defi' },
  { id: 'news', hint: '/news' },
  { id: 'trend', hint: '/trend' },
] as const

const SUPPORTED_AI_MODELS = [
  { name: 'DeepSeek', icon: '/icons/deepseek.svg' },
  { name: 'OpenAI', icon: '/icons/openai.svg' },
  { name: 'Claude', icon: '/icons/claude.svg' },
  { name: 'Gemini', icon: '/icons/gemini.svg' },
  { name: 'Grok', icon: '/icons/grok.svg' },
  { name: 'Qwen', icon: '/icons/qwen.svg' },
]

// ── helpers ──────────────────────────────────────────────────────────────────

function extractAddress(text: string): string | null {
  const t = text.trim()
  // Full address only
  if (/^0x[0-9a-fA-F]{40}$/.test(t)) return t
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(t)) return t
  // Address embedded in sentence
  const eth = text.match(/0x[0-9a-fA-F]{40}/)
  if (eth) return eth[0]
  const sol = text.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/)
  if (sol) return sol[0]
  return null
}

type Message = {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  swapIntent?: WalletChatSwapIntent
  streaming?: boolean
}

const MARKDOWN_COMPONENTS = {
  h1: ({ children }: any) => (
    <h1
      className="text-base font-bold mt-4 mb-2 first:mt-0"
      style={{ color: 'var(--text-primary)' }}
    >
      {children}
    </h1>
  ),
  h2: ({ children }: any) => (
    <h2
      className="text-sm font-semibold mt-4 mb-1.5 first:mt-0"
      style={{ color: 'var(--text-primary)' }}
    >
      {children}
    </h2>
  ),
  h3: ({ children }: any) => (
    <h3
      className="text-sm font-medium mt-3 mb-1 first:mt-0"
      style={{ color: 'var(--accent-primary)' }}
    >
      {children}
    </h3>
  ),
  p: ({ children }: any) => (
    <p
      className="mb-2.5 last:mb-0 leading-relaxed"
      style={{ color: 'var(--text-secondary)' }}
    >
      {children}
    </p>
  ),
  ul: ({ children }: any) => (
    <ul
      className="mb-2.5 ml-4 space-y-1"
      style={{ color: 'var(--text-secondary)' }}
    >
      {children}
    </ul>
  ),
  ol: ({ children }: any) => (
    <ol
      className="mb-2.5 ml-4 space-y-1 list-decimal"
      style={{ color: 'var(--text-secondary)' }}
    >
      {children}
    </ol>
  ),
  li: ({ children }: any) => (
    <li className="leading-relaxed list-disc">{children}</li>
  ),
  strong: ({ children }: any) => (
    <strong className="font-semibold" style={{ color: 'var(--text-primary)' }}>
      {children}
    </strong>
  ),
  em: ({ children }: any) => (
    <em className="italic" style={{ color: 'var(--text-secondary)' }}>
      {children}
    </em>
  ),
  hr: () => (
    <hr
      className="my-3 border-t"
      style={{ borderColor: 'var(--accent-primary-border)' }}
    />
  ),
  code: ({ children }: any) => (
    <code
      className="px-1.5 py-0.5 rounded text-xs font-mono"
      style={{
        background: 'var(--accent-primary-bg)',
        color: 'var(--accent-primary)',
      }}
    >
      {children}
    </code>
  ),
  a: ({ children, href }: any) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="underline"
      style={{ color: 'var(--accent-primary)' }}
    >
      {children}
    </a>
  ),
  table: ({ children }: any) => (
    <div className="overflow-x-auto mb-2.5">
      <table
        className="w-full text-xs border-collapse"
        style={{ color: 'var(--text-secondary)' }}
      >
        {children}
      </table>
    </div>
  ),
  th: ({ children }: any) => (
    <th
      className="px-2 py-1.5 text-left font-semibold border-b"
      style={{
        borderColor: 'var(--accent-primary-border)',
        color: 'var(--text-primary)',
      }}
    >
      {children}
    </th>
  ),
  td: ({ children }: any) => (
    <td
      className="px-2 py-1.5 border-b"
      style={{ borderColor: 'var(--accent-primary-border)' }}
    >
      {children}
    </td>
  ),
}

function sanitizeStreamingMarkdown(text: string): string {
  let s = text
  // Keep markdown stable while progressively revealing content.
  const fenceCount = (s.match(/```/g) || []).length
  if (fenceCount % 2 !== 0) s += '\n```'
  const boldCount = (s.match(/\*\*/g) || []).length
  if (boldCount % 2 !== 0) s += '**'
  const noBold = s.replace(/\*\*/g, '')
  const italicCount = (noBold.match(/\*/g) || []).length
  if (italicCount % 2 !== 0) s += '*'
  return s
}

function StreamingMarkdown({ content }: { content: string }) {
  const [visibleText, setVisibleText] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    let idx = 0
    let timer: ReturnType<typeof setTimeout> | null = null
    setVisibleText('')
    setDone(false)

    const nextStep = () => {
      if (idx >= content.length) {
        setDone(true)
        return
      }

      const ch = content[idx]
      let step = 2
      if (ch === '\n') step = 1
      else if (ch === ' ') step = 3

      idx = Math.min(content.length, idx + step)
      setVisibleText(content.slice(0, idx))

      const delay = ch === '\n' ? 24 : 14
      timer = setTimeout(nextStep, delay)
    }

    timer = setTimeout(nextStep, 70)
    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [content])

  return (
    <div>
      <ReactMarkdown components={MARKDOWN_COMPONENTS}>
        {done ? content : sanitizeStreamingMarkdown(visibleText)}
      </ReactMarkdown>
      {!done && (
        <span
          className="inline-block w-1.5 h-4 ml-0.5 align-middle animate-pulse rounded-sm"
          style={{ background: 'var(--accent-primary)' }}
          aria-hidden
        />
      )}
    </div>
  )
}

type LandingCommand = {
  icon: string
  label: string
  hint: string
  prompt: string
}

// ── component ─────────────────────────────────────────────────────────────────

export function LandingPage() {
  const { user, logout } = useAuth()
  const { language, setLanguage } = useLanguage()
  const { theme } = useTheme()
  const isLoggedIn = !!user

  const tr = (key: string, params?: Record<string, string | number>) =>
    t(`landingPage.${key}`, language, params)

  const typewriterPrompts = useMemo(
    () =>
      TYPEWRITER_KEYS.map((key) =>
        t(`landingPage.typewriter.${key}`, language)
      ),
    [language]
  )

  const commands = useMemo<LandingCommand[]>(
    () =>
      COMMAND_KEYS.map(({ id, hint }) => ({
        icon: '→',
        hint,
        label: t(`landingPage.commands.${id}.label`, language),
        prompt: t(`landingPage.commands.${id}.prompt`, language),
      })),
    [language]
  )

  const analyzePromptPrefix = t(
    'landingPage.commands.analyze.prompt',
    language
  ).trim()

  const { open } = useAppKit()
  const { address: connectedAddress, isConnected, chainId } = useAccount()
  const { switchChainAsync } = useSwitchChain()

  // Landing AI agent is Base-first — nudge connected EVM wallets onto Base.
  useEffect(() => {
    if (
      !isConnected ||
      chainId === DEFAULT_WALLET_NETWORK.id ||
      !switchChainAsync
    )
      return
    switchChainAsync({ chainId: DEFAULT_WALLET_NETWORK.id }).catch(() => {
      /* user declined or wallet cannot switch */
    })
  }, [isConnected, chainId, switchChainAsync])

  const [input, setInput] = useState('')
  const [panelOpen, setPanelOpen] = useState(false)
  const [loginOverlayOpen, setLoginOverlayOpen] = useState(false)
  const [loginOverlayFeature, setLoginOverlayFeature] = useState('')
  const [typewriterText, setTypewriterText] = useState('')
  const [typewriterIndex, setTypewriterIndex] = useState(0)
  const [typewriterDeleting, setTypewriterDeleting] = useState(false)
  const [inputFocused, setInputFocused] = useState(false)

  // contacts
  const [contacts, setContacts] = useState<Contact[]>([])
  const [contactsPanelOpen, setContactsPanelOpen] = useState(false)

  useEffect(() => {
    getContacts().then(setContacts)
  }, [])

  // chat state
  const [phase, setPhase] = useState<'idle' | 'chat'>('idle')
  const typewriterPaused = inputFocused || input.length > 0 || phase !== 'idle'
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setChatLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [balances, setBalances] = useState<WalletBalancesResponse | null>(null)
  const [balancesLoading, setBalancesLoading] = useState(false)
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const [feedbackByMessageId, setFeedbackByMessageId] = useState<
    Record<string, 'up' | 'down' | undefined>
  >({})
  const analysisRef = useRef('') // accumulated SSE text
  const analysisSourceRef = useRef<EventSource | null>(null)
  const pendingFollowUpRef = useRef<string | null>(null) // command queued to send after analysis
  const pendingHintRef = useRef<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const chatBoxRef = useRef<HTMLDivElement>(null) // collision target for the coins

  const panelRef = useRef<HTMLDivElement>(null)
  const dotRef = useRef<HTMLButtonElement>(null)
  // mobile detection + holdings minimized state
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
  const [holdingsMinimized, setHoldingsMinimized] = useState(true)
  // Defer mounting the 3D coin field until after first paint so the UI shows instantly
  const [coinsEnabled, setCoinsEnabled] = useState(false)
  // ── loading screen + coordinated reveal ──────────────────────────────────
  // The coin canvas warms up (physics already running) behind the 3-dot loader,
  // then the loader fades out while the whole section fades in — so the coins
  // are caught mid-bounce instead of popping in abruptly.
  const [loaderVisible, setLoaderVisible] = useState(true)
  const [loaderFading, setLoaderFading] = useState(false)
  const [sceneRevealed, setSceneRevealed] = useState(false)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.has('nocoins')) {
      setLoaderVisible(false)
      setSceneRevealed(true)
      return
    }
    // ?loader keeps the dots on screen with no canvas behind (debug capture)
    if (params.has('loader')) return
    const HOLD = 700 // brief hold — DarkVeil needs no warm-up (unlike the old coins)
    const FADE = 700 // loader fade-out duration (matches the CSS transition)
    const timers = [
      window.setTimeout(() => setCoinsEnabled(true), 120), // mount the veil behind loader
      window.setTimeout(() => {
        setSceneRevealed(true) // start the section fade-in…
        setLoaderFading(true) // …a beat before the loader finishes fading out
      }, HOLD),
      window.setTimeout(() => setLoaderVisible(false), HOLD + FADE),
    ]
    return () => timers.forEach(window.clearTimeout)
  }, [])

  // ── Unmount cleanup ──────────────────────────────────────────────────────
  // Close any in-flight wallet-analysis EventSource when the landing page
  // unmounts. Without this, navigating away via the navbar (a soft SPA nav, not
  // a full reload) left the SSE stream open with pending setState callbacks; the
  // collision between that and the route swap froze the page. Direct-URL loads
  // never hit this because they fully reload. (Root cause of the dashboard freeze.)
  useEffect(() => {
    return () => {
      if (analysisSourceRef.current) {
        analysisSourceRef.current.close()
        analysisSourceRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // ── fetch holdings when analyzing a wallet in chat ───────────────────────
  useEffect(() => {
    if (!walletAddress || phase !== 'chat') {
      if (!walletAddress) setBalances(null)
      return
    }
    setBalances(null)
    setBalancesLoading(true)
    api
      .getWalletBalances(walletAddress)
      .then(setBalances)
      .catch(() => setBalances(null))
      .finally(() => setBalancesLoading(false))
  }, [walletAddress, phase])

  // ── close commands panel on outside click ───────────────────────────────
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        dotRef.current &&
        !dotRef.current.contains(e.target as Node)
      )
        setPanelOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ── typewriter loop for prompts ─────────────────────────────────────────
  useEffect(() => {
    if (typewriterPaused) return
    const prompt = typewriterPrompts[typewriterIndex]
    const isFull = typewriterText.length === prompt.length
    let delay = 38
    if (!typewriterDeleting && isFull) {
      delay = 1600
    } else if (typewriterDeleting && typewriterText.length === 0) {
      delay = 500
    } else if (typewriterDeleting) {
      delay = 22
    }
    const timer = window.setTimeout(() => {
      if (!typewriterDeleting) {
        if (!isFull) {
          setTypewriterText(prompt.slice(0, typewriterText.length + 1))
        } else {
          setTypewriterDeleting(true)
        }
      } else {
        if (typewriterText.length > 0) {
          setTypewriterText(prompt.slice(0, typewriterText.length - 1))
        } else {
          setTypewriterDeleting(false)
          setTypewriterIndex((prev) => (prev + 1) % typewriterPrompts.length)
        }
      }
    }, delay)
    return () => window.clearTimeout(timer)
  }, [typewriterText, typewriterIndex, typewriterDeleting, typewriterPaused, typewriterPrompts])

  // ── flush pending hint after analysis completes ──────────
  useEffect(() => {
    if (pendingHintRef.current) {
      const hint = pendingHintRef.current
      pendingHintRef.current = null
      setMessages((prev) => [
        ...prev,
        { id: `hint-${Date.now()}`, role: 'system', content: hint },
      ])
      inputRef.current?.focus()
    }
  }, [messages])

  // ── scroll to bottom when messages update ───────────────────────────────
  useEffect(() => {
    const container = messagesContainerRef.current
    if (container) {
      container.scrollTop = container.scrollHeight
    }
  }, [messages])

  // ── SSE analysis ─────────────────────────────────────────────────────────
  const startAnalysis = useCallback(
    (address: string) => {
      if (analysisSourceRef.current) analysisSourceRef.current.close()
      analysisRef.current = ''
      setAnalyzing(true)

      const msgId = `analysis-${Date.now()}`
      setMessages((prev) => [
        ...prev,
        { id: msgId, role: 'assistant', content: '' },
      ])

      const lang = language === 'zh' ? 'zh' : 'en'
      const url = apiUrl(
        `/api/wallet/${encodeURIComponent(address)}/analyze?lang=${lang}`
      )
      const es = new EventSource(url)
      analysisSourceRef.current = es

      es.onmessage = (e) => {
        analysisRef.current += (e.data || '') + '\n'
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId ? { ...m, content: analysisRef.current } : m
          )
        )
        // Scroll immediately on each chunk without waiting for React re-render
        requestAnimationFrame(() => {
          const container = messagesContainerRef.current
          if (container) container.scrollTop = container.scrollHeight
        })
      }

      es.addEventListener('done', () => {
        es.close()
        analysisSourceRef.current = null
        setAnalyzing(false)

        const followUp = pendingFollowUpRef.current
        pendingFollowUpRef.current = null

        if (followUp) {
          // Send the queued command as a follow-up now that analysis is ready
          setMessages((prev) => [
            ...prev,
            { id: `u-${Date.now()}`, role: 'user', content: followUp },
          ])
          // sendChat reads walletAddress + analysisRef — both are set by now
          // Use a tiny delay so state has settled
          setTimeout(() => {
            setMessages((prev) => {
              const addr = walletAddress
              const analysis = analysisRef.current
              if (!addr || !analysis) return prev
              api
                .postWalletChat(
                  addr,
                  {
                    message: followUp,
                    initialAnalysis: analysis,
                    history: prev
                      .filter((m) => m.role !== 'system')
                      .map((m) => ({
                        role: m.role as 'user' | 'assistant',
                        content: m.content,
                      })),
                  },
                  language === 'zh' ? 'zh' : 'en'
                )
                .then(({ reply }) => {
                  setMessages((p) => [
                    ...p,
                    {
                      id: `a-${Date.now()}`,
                      role: 'assistant',
                      content: reply,
                      streaming: true,
                    },
                  ])
                })
                .catch(() => {
                  setMessages((p) => [
                    ...p,
                    {
                      id: `err-${Date.now()}`,
                      role: 'system',
                      content: tr('followUpFailed'),
                    },
                  ])
                })
              return prev
            })
          }, 100)
        } else {
          pendingHintRef.current = tr('analysisComplete')
        }
      })

      es.onerror = () => {
        es.close()
        analysisSourceRef.current = null
        setAnalyzing(false)
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'system',
            content: tr('connectionFailed'),
          },
        ])
      }
    },
    [language, walletAddress]
  )

  const beginWalletAnalysis = useCallback(
    (address: string, userMessage: string) => {
      setPhase('chat')
      setWalletAddress(address)
      setHoldingsMinimized(false)
      setMessages([
        { id: `u-${Date.now()}`, role: 'user', content: userMessage },
      ])
      startAnalysis(address)
    },
    [startAnalysis]
  )

  // ── follow-up chat (wallet context) ────────────────────────────────────────
  const sendChat = useCallback(
    async (text: string) => {
      if (!walletAddress || !analysisRef.current || loading) return
      setChatLoading(true)
      const history = messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }))
      try {
        const { reply, swapIntent } = await api.postWalletChat(
          walletAddress,
          { message: text, initialAnalysis: analysisRef.current, history },
          language === 'zh' ? 'zh' : 'en'
        )
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: 'assistant',
            content: reply,
            swapIntent: swapIntent ?? undefined,
            streaming: true,
          },
        ])
      } catch (e) {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'system',
            content: e instanceof Error ? e.message : tr('chatFailed'),
          },
        ])
      } finally {
        setChatLoading(false)
      }
    },
    [walletAddress, analysisRef, loading, messages, language]
  )

  // ── general chat (no wallet) ─────────────────────────────────────────────
  const sendGeneralChat = useCallback(
    async (text: string) => {
      if (loading) return
      setChatLoading(true)
      const history = messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }))
      try {
        const { reply, swapIntent } = await api.postGeneralChat(
          { message: text, history },
          language === 'zh' ? 'zh' : 'en'
        )
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: 'assistant',
            content: reply,
            swapIntent: swapIntent ?? undefined,
            streaming: true,
          },
        ])
      } catch (e) {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'system',
            content: e instanceof Error ? e.message : tr('chatFailed'),
          },
        ])
      } finally {
        setChatLoading(false)
      }
    },
    [loading, messages, language]
  )

  // ── core submit logic (accepts explicit text so commands can call it directly) ──
  const processInput = useCallback(
    (val: string) => {
      if (!val || loading || analyzing) return
      // Resolve contact names → addresses before sending to AI
      const resolved = resolveContacts(val, contacts)
      setInput('')
      setPanelOpen(false)

      const addr = extractAddress(resolved)

      // Already in chat mode with a wallet → wallet follow-up
      if (phase === 'chat' && walletAddress && analysisRef.current) {
        setMessages((prev) => [
          ...prev,
          { id: `u-${Date.now()}`, role: 'user', content: val },
        ])
        sendChat(resolved)
        return
      }

      // Already in chat mode without wallet → general chat follow-up
      if (phase === 'chat' && !walletAddress) {
        setMessages((prev) => [
          ...prev,
          { id: `u-${Date.now()}`, role: 'user', content: val },
        ])
        sendGeneralChat(resolved)
        return
      }

      // Enter chat phase
      setPhase('chat')

      // Only trigger wallet analysis if the message is address-only, or an explicit
      // "Analyze my wallet: 0x…" command (not general chat with an address in it).
      const trailingText = addr ? resolved.trim().replace(addr, '').trim() : ''
      const isAnalyzeCommand = resolved
        .trim()
        .toLowerCase()
        .startsWith(analyzePromptPrefix.toLowerCase())
      const isAddressOnly =
        addr && (trailingText.length < 10 || isAnalyzeCommand)
      if (isAddressOnly && addr) {
        setHoldingsMinimized(false)
        setWalletAddress(addr)
        setMessages([{ id: `u-${Date.now()}`, role: 'user', content: val }])
        startAnalysis(addr)
      } else {
        // Has other words alongside the address → general chat (e.g. "Send 1 BNB to 0x...")
        setMessages((prev) => [
          ...prev,
          { id: `u-${Date.now()}`, role: 'user', content: val },
        ])
        sendGeneralChat(resolved)
      }
    },
    [
      loading,
      analyzing,
      phase,
      walletAddress,
      contacts,
      sendChat,
      sendGeneralChat,
      startAnalysis,
      analyzePromptPrefix,
    ]
  )

  const handleSubmit = useCallback(() => {
    processInput(input.trim())
  }, [input, processInput])

  const resetChat = useCallback(() => {
    if (analysisSourceRef.current) {
      analysisSourceRef.current.close()
      analysisSourceRef.current = null
    }
    analysisRef.current = ''
    pendingFollowUpRef.current = null
    setPhase('idle')
    setMessages([])
    setWalletAddress(null)
    setBalances(null)
    setAnalyzing(false)
    setChatLoading(false)
    setInput('')
    setPanelOpen(false)
  }, [])

  const sortedAssets = useMemo(() => {
    if (!balances?.assets?.length) return []
    return [...balances.assets]
      .filter((a) => parseFloat(a.balanceUsd || '0') >= 5)
      .sort(
        (a, b) =>
          parseFloat(b.balanceUsd || '0') - parseFloat(a.balanceUsd || '0')
      )
  }, [balances])

  const groupedAssets = useMemo(() => {
    return sortedAssets.reduce<
      { chain: string; items: WalletTokenBalance[] }[]
    >((acc, item) => {
      const last = acc[acc.length - 1]
      if (last && last.chain === item.blockchain) {
        last.items.push(item)
      } else {
        acc.push({ chain: item.blockchain, items: [item] })
      }
      return acc
    }, [])
  }, [sortedAssets])

  const copyMessage = useCallback(async (id: string, content: string) => {
    const text = content.trim()
    if (!text) return
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.focus()
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      setCopiedMessageId(id)
      window.setTimeout(
        () => setCopiedMessageId((curr) => (curr === id ? null : curr)),
        1200
      )
    } catch {
      // noop
    }
  }, [])

  const toggleFeedback = useCallback((id: string, value: 'up' | 'down') => {
    setFeedbackByMessageId((prev) => ({
      ...prev,
      [id]: prev[id] === value ? undefined : value,
    }))
  }, [])

  const handleCommand = (cmd: LandingCommand) => {
    setPanelOpen(false)

    // "Analyze my wallet" — if wallet already connected use it, else let user type address
    if (cmd.prompt.endsWith(': ')) {
      if (isConnected && connectedAddress) {
        beginWalletAnalysis(
          connectedAddress,
          `${cmd.prompt}${connectedAddress}`
        )
      } else {
        setInput(cmd.prompt)
        inputRef.current?.focus()
      }
      return
    }

    // General question command — always send as general chat (never auto-analyze)
    processInput(cmd.prompt)
  }

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <>
      {loaderVisible && <LoadingScreen fadingOut={loaderFading} />}

      <HeaderBar
        isLoggedIn={isLoggedIn}
        language={language}
        onLanguageChange={setLanguage}
        user={user}
        onLogout={logout}
        onLoginRequired={(f) => {
          setLoginOverlayFeature(f)
          setLoginOverlayOpen(true)
        }}
        onPageChange={(page) => {
          const pathMap: Record<string, string> = {
            data: '/data',
            competition: '/competition',
            'strategy-market': '/strategy-market',
            traders: '/traders',
            trader: '/dashboard',
            backtest: '/backtest',
            strategy: '/strategy',
            debate: '/debate',
            faq: '/faq',
            wallet: '/wallet',
            tokenomics: '/tokenomics',
            upgrade: '/upgrade',
          }
          const path = pathMap[page]
          if (path) goTo(path) // SPA nav — no full reload, unmounts the 3D canvas
        }}
      />

      {/* Shared background — super-black */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ background: '#000000' }}
      />

      {/* ── IDLE: ghostlink noir terminal ── */}
      {phase === 'idle' && (
        <div
          className="fixed inset-0 flex flex-col items-center justify-center"
          style={{
            paddingTop: '64px',
            opacity: sceneRevealed ? 1 : 0,
            transition: 'opacity 0.9s ease',
          }}
        >
          {/* Soft center glow (the 3D canvas adds its own CenterGlowPlane behind the coins) */}
          <div
            className="absolute inset-0 pointer-events-none gl-center-glow"
            style={{ zIndex: 0 }}
          />

          {/* DarkVeil WebGL background (ReactBits) — kept at the native PURPLE
              default (like reactbits.dev/backgrounds/dark-veil), just brightened
              + a light bottom vignette for hero-text legibility. Silent
              ErrorBoundary: if WebGL drops, the page's solid bg remains. Tune the
              `filter` (saturate/brightness) + vignette for the exact look. */}
          {coinsEnabled && (
            <div
              className="fixed inset-0 pointer-events-none overflow-hidden"
              style={{ zIndex: 0 }}
            >
              <ErrorBoundary name="darkveil" silent>
                <div
                  className="absolute inset-0"
                  style={{
                    filter: 'hue-rotate(-150deg) saturate(1.4) brightness(1.0)',
                  }}
                >
                  <DarkVeil
                    hueShift={0}
                    speed={0.42}
                    warpAmount={0.045}
                    resolutionScale={isMobile ? 0.6 : 0.8}
                    maxDpr={1}
                    paused={inputFocused}
                  />
                </div>
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      'radial-gradient(130% 105% at 50% 2%, rgba(4,6,18,0) 0%, rgba(4,6,18,0.18) 45%, rgba(4,6,18,0.6) 88%)',
                  }}
                />
              </ErrorBoundary>
            </div>
          )}

          {/* Background accents — corner lines only */}
          <div className="absolute inset-0 pointer-events-none">
            <div
              className="absolute top-0 left-0 w-24 h-px"
              style={{
                background:
                  'linear-gradient(to right, rgba(255,255,255,0.18), transparent)',
              }}
            />
            <div
              className="absolute top-0 left-0 w-px h-24"
              style={{
                background:
                  'linear-gradient(to bottom, rgba(255,255,255,0.18), transparent)',
              }}
            />
            <div
              className="absolute bottom-0 right-0 w-24 h-px"
              style={{
                background:
                  'linear-gradient(to left, rgba(255,255,255,0.18), transparent)',
              }}
            />
            <div
              className="absolute bottom-0 right-0 w-px h-24"
              style={{
                background:
                  'linear-gradient(to top, rgba(255,255,255,0.18), transparent)',
              }}
            />
          </div>

          {/* Main content */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-xl px-4 sm:px-6 flex flex-col items-center gap-7"
          >
            {/* Brand lockup */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.75, delay: 0.08 }}
              className="select-none"
            >
              <span
                className="eva-shimmer display-font font-bold leading-none"
                style={{
                  fontSize: isMobile ? '1.4rem' : '1.9rem',
                  letterSpacing: '0.22em',
                }}
              >
                EVA PROTOCOL
              </span>
            </motion.div>

            {/* Input area */}
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.22 }}
              className="w-full"
            >
              <div className="gl-chatbox-shell w-full">
                <div ref={chatBoxRef} className="flex items-stretch gap-2">
                  <div className="relative flex-1">
                    <input
                      ref={inputRef}
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onFocus={() => setInputFocused(true)}
                      onBlur={() => setInputFocused(false)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSubmit()
                        if (e.key === 'Escape') setPanelOpen(false)
                      }}
                      placeholder={
                        typewriterPaused
                          ? typewriterPrompts[typewriterIndex]
                          : typewriterText
                      }
                      className="w-full pl-5 pr-14 py-4 outline-none transition-all"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-primary)',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                      }}
                    />
                    <button
                      ref={dotRef}
                      onClick={() =>
                        input.trim() ? handleSubmit() : setPanelOpen((o) => !o)
                      }
                      className="input-icon-btn absolute right-3 inset-y-0 my-auto w-9 h-9 rounded-lg flex items-center justify-center transition-all focus:outline-none"
                      style={{
                        background: input.trim()
                          ? 'var(--accent-primary)'
                          : 'transparent',
                        border: input.trim()
                          ? '1px solid var(--accent-primary-border-strong)'
                          : 'none',
                        color: input.trim() ? '#fff' : 'rgba(255,255,255,0.7)',
                        boxShadow: 'none',
                      }}
                      aria-label={
                        input.trim() ? tr('send') : tr('commandsAria')
                      }
                    >
                      {input.trim() ? (
                        <ArrowRight className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {/* Connect Wallet — liquid-metal circular button */}
                  <div className="flex items-center shrink-0">
                    <LiquidMetalButton
                      size={isMobile ? 48 : 56}
                      connected={isConnected}
                      onClick={() => open()}
                      ariaLabel={
                        isConnected
                          ? tr('walletConnected')
                          : tr('connectWallet')
                      }
                      title={
                        isConnected && connectedAddress
                          ? tr('connectedOnBase', { address: connectedAddress })
                          : tr('connectWalletOnBase')
                      }
                    >
                      {isConnected ? (
                        <PhCheck weight="bold" />
                      ) : (
                        <PhWallet weight="bold" />
                      )}
                    </LiquidMetalButton>
                  </div>
                </div>
              </div>

              {/* Commands dropdown */}
              {panelOpen && (
                <div
                  ref={panelRef}
                  className="w-full mt-2 rounded-xl overflow-hidden gl-expand-in"
                  style={{
                    background:
                      'linear-gradient(180deg, #14151a 0%, #090a0d 100%)',
                    border: '1px solid rgba(255,255,255,0.10)',
                    borderTop: '1px solid rgba(255,255,255,0.16)',
                    boxShadow:
                      'inset 0 1px 0 rgba(255,255,255,0.06), 0 28px 70px rgba(0,0,0,0.9)',
                  }}
                >
                  <div
                    className="px-4 pt-3 pb-1 text-[10px] uppercase tracking-[0.22em] font-black"
                    style={{ color: 'rgba(255,255,255,0.45)' }}
                  >
                    <span style={{ color: 'var(--accent-primary)' }}>/</span>{' '}
                    {tr('commandsTitle')}
                  </div>
                  <div className="p-2 flex flex-col gap-0.5">
                    <button
                      onClick={() => {
                        setPanelOpen(false)
                        setContactsPanelOpen(true)
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left transition-all focus:outline-none"
                      style={{
                        color: 'var(--text-secondary)',
                        fontSize: '0.875rem',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background =
                          'rgba(255,255,255,0.06)'
                        e.currentTarget.style.color = '#9fb4ff'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent'
                        e.currentTarget.style.color = 'var(--text-secondary)'
                      }}
                    >
                      <BookUser
                        className="w-4 h-4 shrink-0"
                        style={{ color: 'var(--accent-primary)' }}
                      />
                      <span className="flex-1">{tr('contacts')}</span>
                      <span
                        className="text-[10px] font-mono font-black"
                        style={{ color: 'rgba(255,255,255,0.7)' }}
                      >
                        /addr
                      </span>
                    </button>
                    {commands.map((cmd) => (
                      <button
                        key={cmd.hint}
                        onClick={() => handleCommand(cmd)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left transition-all focus:outline-none"
                        style={{
                          color: 'var(--text-secondary)',
                          fontSize: '0.875rem',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background =
                            'rgba(255,255,255,0.06)'
                          e.currentTarget.style.color = '#9fb4ff'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent'
                          e.currentTarget.style.color = 'var(--text-secondary)'
                        }}
                      >
                        <ArrowRight
                          className="w-4 h-4 shrink-0"
                          style={{ color: 'var(--accent-primary)' }}
                        />
                        <span className="flex-1">{cmd.label}</span>
                        <span
                          className="text-[10px] font-mono font-black"
                          style={{ color: 'rgba(255,255,255,0.7)' }}
                        >
                          {cmd.hint}
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="pb-2" />
                </div>
              )}

              {/* Tagline */}
              <p
                className="text-center text-sm font-semibold tracking-wide mt-8"
                style={{ color: 'rgba(255,255,255,0.8)' }}
              >
                {tr('tagline')}
              </p>
            </motion.div>
          </motion.div>

          {/* AI model icons — bottom */}
          <div className="fixed bottom-0 left-0 right-0 z-10 pb-7 flex justify-center pointer-events-none">
            <div className="flex items-center gap-3">
              {SUPPORTED_AI_MODELS.map((ai, i) => (
                <motion.img
                  key={ai.name}
                  src={ai.icon}
                  alt={ai.name}
                  title={ai.name}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 0.72, y: 0 }}
                  transition={{ delay: 0.48 + i * 0.06, duration: 0.4 }}
                  whileHover={{ opacity: 1, scale: 1.15 }}
                  className="w-4 h-4 object-contain pointer-events-auto cursor-pointer"
                  style={{ filter: 'brightness(0) invert(1)' }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── CHAT: logo top, messages middle, input bottom ── */}
      {phase === 'chat' && (
        <div
          className="fixed inset-0 flex flex-col overflow-x-hidden"
          style={{ paddingTop: '64px' }}
        >
          {/* Holdings panel — desktop: left sidebar, mobile: bottom sheet (minimized by default) */}
          <AnimatePresence>
            {walletAddress && (
              <motion.div
                initial={
                  isMobile ? { opacity: 0, y: 60 } : { opacity: 0, x: -24 }
                }
                animate={isMobile ? { opacity: 1, y: 0 } : { opacity: 1, x: 0 }}
                exit={isMobile ? { opacity: 0, y: 60 } : { opacity: 0, x: -24 }}
                transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
                className={
                  isMobile
                    ? 'fixed left-0 right-0 bottom-0 z-30 flex flex-col overflow-hidden rounded-t-2xl'
                    : 'fixed left-4 top-[76px] bottom-4 z-20 w-[280px] flex flex-col overflow-hidden rounded-2xl'
                }
                style={{
                  background: 'var(--surface-secondary)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid var(--accent-primary-border)',
                  boxShadow: isMobile
                    ? `0 -8px 30px -4px ${theme === 'dark' ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.1)'}`
                    : `0 12px 40px -8px ${theme === 'dark' ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.08)'}`,
                  ...(isMobile && !holdingsMinimized
                    ? { maxHeight: '60vh' }
                    : {}),
                }}
              >
                {/* Header bar — tappable on mobile to toggle */}
                <div
                  className={`flex items-center justify-between px-4 shrink-0 ${isMobile ? 'cursor-pointer active:bg-white/[0.03]' : ''}`}
                  style={{
                    borderBottom:
                      isMobile && holdingsMinimized
                        ? 'none'
                        : '1px solid var(--accent-primary-border)',
                    padding: isMobile ? '10px 16px' : '12px 16px',
                  }}
                  onClick={
                    isMobile ? () => setHoldingsMinimized((v) => !v) : undefined
                  }
                >
                  {/* Drag indicator on mobile */}
                  {isMobile && (
                    <div
                      className="absolute top-1.5 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full"
                      style={{ background: 'var(--accent-primary-border)' }}
                    />
                  )}
                  <div className="flex items-center gap-3">
                    <div>
                      <div
                        className="text-[10px] uppercase tracking-wider"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {tr('holdings')}
                      </div>
                      {balancesLoading ? (
                        <div
                          className="text-sm"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          …
                        </div>
                      ) : (
                        <div
                          className={`font-bold leading-tight ${isMobile ? 'text-base' : 'text-lg'}`}
                          style={{ color: 'var(--text-primary)' }}
                        >
                          $
                          {parseFloat(
                            balances?.totalBalanceUsd || '0'
                          ).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (!walletAddress) return
                        setBalancesLoading(true)
                        api
                          .getWalletBalances(walletAddress)
                          .then(setBalances)
                          .catch(() => {})
                          .finally(() => setBalancesLoading(false))
                      }}
                      disabled={balancesLoading}
                      className="p-1.5 rounded-lg transition-colors hover:bg-white/5 disabled:opacity-40"
                      style={{ color: 'var(--accent-primary)' }}
                      aria-label={tr('refresh')}
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                    {isMobile && (
                      <div
                        className="p-1"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {holdingsMinimized ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Token list — always visible on desktop, toggleable on mobile */}
                {(!isMobile || !holdingsMinimized) && (
                  <div className="overflow-y-auto flex-1">
                    {balancesLoading ? (
                      <div className="p-6 space-y-3">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div key={i} className="flex items-center gap-3">
                            <div
                              className="w-8 h-8 rounded-lg animate-pulse"
                              style={{ background: 'var(--accent-primary-bg)' }}
                            />
                            <div className="flex-1 space-y-1.5">
                              <div
                                className="h-3 rounded animate-pulse"
                                style={{
                                  background: 'var(--accent-primary-bg)',
                                  width: `${60 + i * 5}%`,
                                }}
                              />
                              <div
                                className="h-2 w-12 rounded animate-pulse"
                                style={{
                                  background: 'var(--accent-primary-bg)',
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : sortedAssets.length === 0 ? (
                      <div
                        className="p-6 text-center text-xs"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {tr('noTokens')}
                      </div>
                    ) : (
                      groupedAssets.map(({ chain, items }) => (
                        <div key={chain}>
                          <div
                            className="px-4 py-1.5 text-[10px] font-medium uppercase tracking-wider"
                            style={{
                              background: 'var(--accent-primary-bg)',
                              color: 'var(--text-secondary)',
                            }}
                          >
                            {chain}
                          </div>
                          {items.map((asset) => (
                            <div
                              key={`${asset.blockchain}-${asset.contractAddress}-${asset.balance}`}
                              className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-white/[0.03]"
                              style={{
                                borderBottom:
                                  '1px solid var(--accent-primary-bg)',
                              }}
                            >
                              <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden shrink-0"
                                style={{
                                  background: 'var(--accent-primary-bg)',
                                }}
                              >
                                {asset.thumbnail ? (
                                  <img
                                    src={asset.thumbnail}
                                    alt=""
                                    className="w-5 h-5 object-contain"
                                  />
                                ) : (
                                  <TokenIcon
                                    symbol={asset.tokenSymbol || ''}
                                    variant="branded"
                                    size={20}
                                    fallback={
                                      <span
                                        className="text-[10px] font-bold"
                                        style={{
                                          color: 'var(--text-secondary)',
                                        }}
                                      >
                                        {asset.tokenSymbol?.slice(0, 2) || '?'}
                                      </span>
                                    }
                                  />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div
                                  className="text-xs font-medium truncate"
                                  style={{ color: 'var(--text-primary)' }}
                                >
                                  {asset.tokenName || asset.tokenSymbol}
                                </div>
                                <div
                                  className="text-[10px]"
                                  style={{ color: 'var(--text-secondary)' }}
                                >
                                  {asset.balance} {asset.tokenSymbol}
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <div
                                  className="text-xs font-semibold"
                                  style={{ color: 'var(--text-primary)' }}
                                >
                                  $
                                  {parseFloat(
                                    asset.balanceUsd || '0'
                                  ).toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative z-10 flex flex-col flex-1 overflow-hidden max-w-2xl w-full mx-auto px-3 sm:px-6">
            {/* Logo + new chat */}
            <div
              className={`flex items-center ${isMobile ? 'justify-end mt-2 mb-2' : 'justify-between mt-5 mb-3'} flex-shrink-0`}
            >
              {!isMobile && (
                <div className="flex items-center gap-2 select-none">
                  <span
                    className="hero-logo-text font-bold"
                    style={{ fontSize: '1.3rem' }}
                  >
                    {HERO_LETTERS.map((letter, index) => (
                      <span
                        key={`chat-letter-${letter}-${index}`}
                        className="hero-logo-letter"
                        style={{ animationDelay: `${index * 0.12}s`, background: 'none', WebkitTextFillColor: '#ffffff', color: '#ffffff' }}
                      >
                        {letter}
                      </span>
                    ))}
                  </span>
                </div>
              )}
              <button
                onClick={resetChat}
                className="input-icon-btn flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all focus:outline-none"
                style={{
                  background: 'var(--surface-secondary)',
                  border: '1px solid var(--accent-primary-border)',
                  color: 'var(--text-secondary)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor =
                    'var(--accent-primary-border-strong)'
                  e.currentTarget.style.color = 'var(--text-primary)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor =
                    'var(--accent-primary-border)'
                  e.currentTarget.style.color = 'var(--text-secondary)'
                }}
              >
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 5v14M5 12l7-7 7 7" />
                </svg>
                {tr('newChat')}
              </button>
            </div>

            {/* Messages */}
            <div
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto overflow-x-hidden pb-4 space-y-4 pr-1 pl-1 scrollbar-hide"
            >
              {messages
                .filter(
                  (msg) => !(msg.role === 'assistant' && msg.content === '')
                )
                .map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex animate-fade-in group/turn ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'system' ? (
                      <span
                        className="text-xs px-3 py-1 rounded-full mx-auto"
                        style={{
                          color: 'var(--accent-primary)',
                          background: 'var(--accent-primary-bg)',
                          border: '1px solid var(--accent-primary-border)',
                        }}
                      >
                        {msg.content}
                      </span>
                    ) : msg.role === 'user' ? (
                      <div
                        className="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-br-md text-sm break-all"
                        style={{
                          background: 'var(--accent-primary-bg)',
                          border: '1px solid var(--accent-primary-border)',
                          color: 'var(--text-primary)',
                        }}
                      >
                        {msg.content}
                      </div>
                    ) : (
                      <div
                        className={`max-w-[85%] overflow-visible ${msg.swapIntent ? 'sm:min-w-[320px]' : ''}`}
                      >
                        <div
                          className="px-4 py-3 rounded-2xl rounded-bl-md text-sm overflow-hidden"
                          style={{
                            background: 'var(--surface-tertiary)',
                            border: '1px solid var(--accent-primary-border)',
                            color: 'var(--text-primary)',
                            overflowWrap: 'anywhere',
                          }}
                        >
                          {msg.streaming ? (
                            <StreamingMarkdown content={msg.content} />
                          ) : (
                            <ReactMarkdown components={MARKDOWN_COMPONENTS}>
                              {msg.content}
                            </ReactMarkdown>
                          )}
                          {msg.swapIntent && (
                            <InlineSwapWidget
                              intent={msg.swapIntent}
                              language={language === 'zh' ? 'zh' : 'en'}
                            />
                          )}
                        </div>
                        <div className="mt-1.5 flex items-center gap-0.5 opacity-0 pointer-events-none transition-opacity duration-200 group-hover/turn:opacity-100 group-hover/turn:pointer-events-auto group-focus-within/turn:opacity-100 group-focus-within/turn:pointer-events-auto">
                          <button
                            aria-label={tr('copyMessage')}
                            onClick={() => copyMessage(msg.id, msg.content)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                            style={{ color: 'var(--text-secondary)' }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background =
                                'var(--surface-secondary)'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'transparent'
                            }}
                          >
                            {copiedMessageId === msg.id ? (
                              <Check className="w-4 h-4" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            aria-label={tr('goodResponse')}
                            aria-pressed={feedbackByMessageId[msg.id] === 'up'}
                            onClick={() => toggleFeedback(msg.id, 'up')}
                            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                            style={{
                              color:
                                feedbackByMessageId[msg.id] === 'up'
                                  ? 'var(--accent-primary)'
                                  : 'var(--text-secondary)',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background =
                                'var(--surface-secondary)'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'transparent'
                            }}
                          >
                            <ThumbsUp className="w-4 h-4" />
                          </button>
                          <button
                            aria-label={tr('badResponse')}
                            aria-pressed={
                              feedbackByMessageId[msg.id] === 'down'
                            }
                            onClick={() => toggleFeedback(msg.id, 'down')}
                            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                            style={{
                              color:
                                feedbackByMessageId[msg.id] === 'down'
                                  ? 'var(--accent-primary)'
                                  : 'var(--text-secondary)',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background =
                                'var(--surface-secondary)'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'transparent'
                            }}
                          >
                            <ThumbsDown className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              {(loading ||
                (analyzing &&
                  messages[messages.length - 1]?.content === '')) && (
                <div className="flex justify-start">
                  <div
                    className="px-4 py-3 rounded-2xl rounded-bl-md"
                    style={{
                      background: 'var(--surface-tertiary)',
                      border: '1px solid var(--accent-primary-border)',
                    }}
                  >
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="w-1.5 h-1.5 rounded-full animate-bounce"
                          style={{
                            background: 'var(--accent-primary)',
                            animationDelay: `${i * 0.15}s`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div
              className="pt-2 flex-shrink-0"
              style={{
                paddingBottom: isMobile && walletAddress ? '68px' : '16px',
              }}
            >
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSubmit()
                    }}
                    placeholder="..."
                    disabled={analyzing}
                    className="w-full pr-12 pl-6 py-3 rounded-full text-base outline-none transition-all disabled:opacity-50"
                    style={{
                      background: 'var(--surface-secondary)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid var(--accent-primary-border)',
                      color: 'var(--text-primary)',
                      boxShadow:
                        theme === 'dark'
                          ? '0 8px 24px -6px rgba(0,0,0,0.6)'
                          : '0 4px 12px -4px rgba(0,0,0,0.08)',
                      fontSize: '1rem',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor =
                        'var(--accent-primary-border-strong)'
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor =
                        'var(--accent-primary-border)'
                    }}
                  />
                  <button
                    onClick={handleSubmit}
                    disabled={!input.trim() || loading || analyzing}
                    className="input-icon-btn absolute right-3 w-7 h-7 rounded-full flex items-center justify-center focus:outline-none disabled:opacity-40"
                    style={{
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'var(--accent-primary)',
                      color: '#000',
                    }}
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <LoginRequiredOverlay
        isOpen={loginOverlayOpen}
        onClose={() => setLoginOverlayOpen(false)}
        featureName={loginOverlayFeature}
      />
      <ContactsPanel
        open={contactsPanelOpen}
        language={language}
        onClose={() => setContactsPanelOpen(false)}
        onContactsChange={setContacts}
      />
    </>
  )
}
