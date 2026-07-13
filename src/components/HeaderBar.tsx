import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  ArrowDown01Icon,
  Logout01Icon,
  Settings02Icon,
} from '@hugeicons/core-free-icons'
import { t, type Language } from '../i18n/translations'
import { useSystemConfig } from '../hooks/useSystemConfig'
import { OFFICIAL_LINKS } from '../constants/branding'
import { useTheme } from '../contexts/ThemeContext'
import { useAccountUiStore } from '../stores/accountUiStore'
import { DesktopNav, MobileNav } from './nav/NavMenu'
import { SettingsModal } from './SettingsModal'
import { LanguageToggle } from './LanguageToggle'
import type { NavPage } from './nav/navConfig'

type Page =
  | 'competition'
  | 'traders'
  | 'trader'
  | 'backtest'
  | 'strategy'
  | 'strategy-market'
  | 'data'
  | 'news'
  | 'debate'
  | 'faq'
  | 'login'
  | 'register'
  | 'tokenomics'
  | 'upgrade'

interface HeaderBarProps {
  onLoginClick?: () => void
  isLoggedIn?: boolean
  currentPage?: Page
  language?: Language
  onLanguageChange?: (lang: Language) => void
  user?: { email: string } | null
  onLogout?: () => void
  onPageChange?: (page: Page) => void
  onLoginRequired?: (featureName: string) => void
}

export default function HeaderBar({
  isLoggedIn = false,
  currentPage,
  language = 'en' as Language,
  onLanguageChange,
  user,
  onLogout,
  onLoginClick: _onLoginClick,
}: HeaderBarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  const settingsOpen = useAccountUiStore((s) => s.settingsOpen)
  const openSettings = useAccountUiStore((s) => s.openSettings)
  const closeSettings = useAccountUiStore((s) => s.closeSettings)
  const userDropdownRef = useRef<HTMLDivElement>(null)
  const { config: systemConfig } = useSystemConfig()
  const registrationEnabled = systemConfig?.registration_enabled !== false
  useTheme()

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        userDropdownRef.current &&
        !userDropdownRef.current.contains(event.target as Node)
      ) {
        setUserDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // EVA logo → home. Use a normal document navigation from the global header:
  // several Chromium environments were freezing on the custom SPA route path.
  const goHome = useCallback(() => {
    setMobileMenuOpen(false)
    if (window.location.pathname !== '/') window.location.assign('/')
  }, [])

  // SPA-navigate an <a> on a plain left-click (no full bundle reload) while
  // still honoring the real href for middle/cmd/ctrl-click → open in new tab.
  const spaGo = useCallback(
    (e: ReactMouseEvent<HTMLAnchorElement>, path: string) => {
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      )
        return
      e.preventDefault()
      setMobileMenuOpen(false)
      window.location.assign(path)
    },
    []
  )

  const isEn = language !== 'zh'

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50">
        <div className="gl-navbar flex items-center justify-between gap-2">
          {/* Brand cluster — EVA wordmark = go home (the back arrow was removed;
            the animated EVA logo now owns "return home"). */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={goHome}
              className="gl-home-eva"
              aria-label={isEn ? 'Home' : '首页'}
            >
              EVA
            </button>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center justify-between flex-1 pl-4">
            {/* Left — unified dropdown nav (same on every page, driven by navConfig) */}
            <DesktopNav
              isEn={isEn}
              currentPage={currentPage as NavPage | undefined}
            />

            {/* Right Side - Social Links and User Actions */}
            <div className="flex items-center gap-4">
              {/* Social Links */}
              <div className="flex items-center gap-1">
                {OFFICIAL_LINKS.github ? (
                  <a
                    href={OFFICIAL_LINKS.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="social-link p-2 rounded-lg text-eva-text-muted"
                    title="GitHub"
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 16 16"
                      fill="currentColor"
                    >
                      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                    </svg>
                  </a>
                ) : (
                  <span
                    className="p-2 rounded-lg text-eva-text-muted cursor-default opacity-60"
                    title="GitHub"
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 16 16"
                      fill="currentColor"
                    >
                      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                    </svg>
                  </span>
                )}
                {OFFICIAL_LINKS.twitter ? (
                  <a
                    href={OFFICIAL_LINKS.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="social-link p-2 rounded-lg text-eva-text-muted"
                    title="Twitter"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  </a>
                ) : (
                  <span
                    className="p-2 rounded-lg text-eva-text-muted cursor-default opacity-60"
                    title="Twitter"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  </span>
                )}
                {OFFICIAL_LINKS.telegram ? (
                  <a
                    href={OFFICIAL_LINKS.telegram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="social-link p-2 rounded-lg text-eva-text-muted"
                    title="Telegram"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                    </svg>
                  </a>
                ) : (
                  <span
                    className="p-2 rounded-lg text-eva-text-muted cursor-default opacity-60"
                    title="Telegram"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                    </svg>
                  </span>
                )}
              </div>

              {/* Divider — a thin blue hairline separating the socials from the
                auth buttons (subtle differentiator). */}
              <div
                className="w-px h-6 shrink-0"
                style={{
                  background:
                    'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.12) 26%, rgba(255,255,255,0.12) 74%, transparent 100%)',
                }}
              />

              {/* User Info / Login Buttons */}
              {isLoggedIn && user ? (
                <div className="relative" ref={userDropdownRef}>
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="gl-user-trigger"
                    data-open={userDropdownOpen ? 'true' : 'false'}
                    aria-label={isEn ? 'Account menu' : '账户菜单'}
                  >
                    <span className="gl-user-avatar">
                      {user.email[0].toUpperCase()}
                    </span>
                    <span className="gl-user-email">{user.email}</span>
                    <HugeiconsIcon
                      icon={ArrowDown01Icon}
                      size={15}
                      strokeWidth={2.2}
                      className="gl-user-chev"
                    />
                  </button>

                  {userDropdownOpen && (
                    <div className="gl-user-menu">
                      <div className="gl-user-menu-head">
                        <span className="gl-user-avatar">
                          {user.email[0].toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <div className="gl-user-menu-label">
                            {t('loggedInAs', language)}
                          </div>
                          <div className="gl-user-menu-email">{user.email}</div>
                        </div>
                      </div>
                      {onLogout && (
                        <>
                          <button
                            onClick={() => {
                              openSettings()
                              setUserDropdownOpen(false)
                            }}
                            className="gl-user-menu-item"
                          >
                            <HugeiconsIcon
                              icon={Settings02Icon}
                              size={17}
                              strokeWidth={1.9}
                            />
                            {isEn ? 'Settings' : '设置'}
                          </button>
                          <button
                            onClick={() => {
                              onLogout()
                              setUserDropdownOpen(false)
                            }}
                            className="gl-user-logout"
                          >
                            <HugeiconsIcon
                              icon={Logout01Icon}
                              size={17}
                              strokeWidth={1.9}
                            />
                            {t('exitLogin', language)}
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                currentPage !== 'login' &&
                currentPage !== 'register' && (
                  <div className="flex items-center gap-3">
                    <a
                      href="/login"
                      onClick={(e) => spaGo(e, '/login')}
                      className="gl-text-link px-4 py-2 text-sm font-medium rounded-lg"
                    >
                      {t('signIn', language)}
                    </a>
                    {registrationEnabled && (
                      <a
                        href="/register"
                        onClick={(e) => spaGo(e, '/register')}
                        className="gl-navbar-btn px-4 py-2 rounded-lg font-medium text-sm"
                      >
                        {t('signUp', language)}
                      </a>
                    )}
                  </div>
                )
              )}

              {/* Theme is automatic: light on desktop, dark on mobile */}

              {onLanguageChange && (
                <LanguageToggle
                  language={language}
                  onLanguageChange={onLanguageChange}
                />
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <motion.button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden ml-auto text-eva-text-muted hover:text-white p-2"
            whileTap={{ scale: 0.9 }}
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </motion.button>
        </div>
      </nav>

      {/* Mobile Menu Overlay — rendered outside <nav> so backdrop-filter doesn't trap fixed positioning */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 md:hidden"
            style={{ background: 'var(--surface-primary)', top: '64px' }}
          >
            <motion.div
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.05, duration: 0.2 }}
              className="flex flex-col overflow-y-auto px-5 pt-6 pb-8"
              style={{ height: 'calc(100dvh - 64px)' }}
            >
              {/* Navigation — same NAV config as desktop, grouped, each row with its icon */}
              <div className="flex-1">
                <MobileNav
                  isEn={isEn}
                  currentPage={currentPage as NavPage | undefined}
                />
              </div>

              {/* Footer controls */}
              <div
                className="pt-4"
                style={{ borderTop: '1px solid var(--panel-border)' }}
              >
                {/* Auth */}
                <div className="mb-5">
                  {isLoggedIn && user ? (
                    <div className="space-y-2">
                      <div
                        className="gl-user-trigger"
                        style={{
                          display: 'flex',
                          width: '100%',
                          padding: '8px 10px',
                          cursor: 'default',
                        }}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className="gl-user-avatar"
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: 10,
                              fontSize: 14,
                            }}
                          >
                            {user.email[0].toUpperCase()}
                          </span>
                          <span
                            className="gl-user-email"
                            style={{ maxWidth: 170, fontSize: 13.5 }}
                          >
                            {user.email}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          openSettings()
                          setMobileMenuOpen(false)
                        }}
                        className="gl-user-menu-item"
                        style={{ borderRadius: 10, borderBottom: 'none' }}
                      >
                        <HugeiconsIcon
                          icon={Settings02Icon}
                          size={16}
                          strokeWidth={1.9}
                        />
                        {isEn ? 'Settings' : '设置'}
                      </button>
                      <button
                        onClick={() => {
                          onLogout?.()
                          setMobileMenuOpen(false)
                        }}
                        className="gl-user-logout"
                        style={{ borderRadius: 10 }}
                      >
                        <HugeiconsIcon
                          icon={Logout01Icon}
                          size={16}
                          strokeWidth={1.9}
                        />
                        {t('exitLogin', language)}
                      </button>
                    </div>
                  ) : (
                    currentPage !== 'login' &&
                    currentPage !== 'register' && (
                      <div className="flex gap-3">
                        {/* same premium hierarchy as desktop: ghost Sign in + filled Sign up */}
                        <a
                          href="/login"
                          onClick={(e) => spaGo(e, '/login')}
                          className="gl-text-link flex-1 flex items-center justify-center py-2.5 text-sm font-semibold"
                        >
                          {t('signIn', language)}
                        </a>
                        {registrationEnabled && (
                          <a
                            href="/register"
                            onClick={(e) => spaGo(e, '/register')}
                            className="gl-navbar-btn flex-1 flex items-center justify-center py-2.5 rounded-full text-sm font-semibold"
                          >
                            {t('signUp', language)}
                          </a>
                        )}
                      </div>
                    )
                  )}
                </div>

                {/* Preferences row */}
                <div className="flex items-center gap-3">
                  {onLanguageChange && (
                    <LanguageToggle
                      language={language}
                      onLanguageChange={onLanguageChange}
                      size="sm"
                    />
                  )}
                  <div className="flex-1" />

                  {/* Social icons */}
                  <div className="flex items-center gap-1">
                    {[
                      {
                        href: OFFICIAL_LINKS.github,
                        vb: '0 0 16 16',
                        icon: (
                          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                        ),
                      },
                      {
                        href: OFFICIAL_LINKS.twitter,
                        vb: '0 0 24 24',
                        icon: (
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                        ),
                      },
                      {
                        href: OFFICIAL_LINKS.telegram,
                        vb: '0 0 24 24',
                        icon: (
                          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                        ),
                      },
                    ].map((link, i) => (
                      <a
                        key={i}
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="social-link w-9 h-9 rounded-lg flex items-center justify-center text-[var(--text-tertiary)]"
                      >
                        <svg
                          width="15"
                          height="15"
                          viewBox={link.vb}
                          fill="currentColor"
                        >
                          {link.icon}
                        </svg>
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <SettingsModal
        isOpen={settingsOpen}
        onClose={closeSettings}
        language={language}
      />
    </>
  )
}
