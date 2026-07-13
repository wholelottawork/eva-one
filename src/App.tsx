import {
  useEffect,
  useState,
  useSyncExternalStore,
  lazy,
  Suspense,
  type ComponentType,
} from 'react'
import { LoginRequiredOverlay } from './components/LoginRequiredOverlay'
import { LoadingScreen } from './components/LoadingScreen'
import HeaderBar from './components/HeaderBar'
import { ErrorBoundary } from './components/ErrorBoundary'
import { DataPage } from './pages/DataPage'
import { NewsPage } from './pages/NewsPage'
import { LoginPage } from './components/LoginPage'
import { RegisterPage } from './components/RegisterPage'
import { ResetPasswordPage } from './components/ResetPasswordPage'
import { AuthGatePage } from './components/AuthGatePage'
import { LandingPage } from './pages/LandingPage'
import { AuthenticatedShell } from './AuthenticatedShell'
import { LanguageProvider, useLanguage } from './contexts/LanguageContext'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { ConfirmDialogProvider } from './components/ConfirmDialog'
import { AppKitThemeSync } from './components/AppKitThemeSync'
import { SiteFooter } from './components/SiteFooter'
import { goTo, PAGE_PATHS, NAVIGATION_EVENT, type AppPage } from './lib/nav'

function lazyWithReload(
  factory: () => Promise<{ default: ComponentType<any> }>
) {
  return lazy(() =>
    factory().catch((err) => {
      const KEY = 'eva:chunk-reloaded'
      if (
        typeof sessionStorage !== 'undefined' &&
        !sessionStorage.getItem(KEY)
      ) {
        sessionStorage.setItem(KEY, '1')
        window.location.reload()
        return new Promise<{ default: ComponentType<any> }>(() => {})
      }
      throw err
    })
  )
}

const TradePage = lazyWithReload(() =>
  import('./pages/TradePage').then((m) => ({ default: m.TradePage }))
)
const TokenomicsPage = lazyWithReload(() =>
  import('./pages/TokenomicsPage').then((m) => ({ default: m.TokenomicsPage }))
)
const UpgradePage = lazyWithReload(() =>
  import('./pages/UpgradePage').then((m) => ({ default: m.UpgradePage }))
)
const DocsPage = lazyWithReload(() =>
  import('./pages/DocsPage').then((m) => ({ default: m.DocsPage }))
)

function subscribePathname(onStoreChange: () => void) {
  window.addEventListener('popstate', onStoreChange)
  window.addEventListener(NAVIGATION_EVENT, onStoreChange)
  return () => {
    window.removeEventListener('popstate', onStoreChange)
    window.removeEventListener(NAVIGATION_EVENT, onStoreChange)
  }
}
function getPathnameSnapshot() {
  return window.location.pathname
}

type Page = AppPage

function App() {
  const { language, setLanguage } = useLanguage()
  const { user, token, logout, isLoading } = useAuth()
  const route = useSyncExternalStore(subscribePathname, getPathnameSnapshot)
  const [loginOverlayOpen, setLoginOverlayOpen] = useState(false)
  const [loginOverlayFeature, setLoginOverlayFeature] = useState('')

  useEffect(() => {
    try {
      sessionStorage.removeItem('eva:chunk-reloaded')
    } catch {
      /* ignore */
    }
  }, [])

  const navigateToPage = (page: Page) => {
    const path = PAGE_PATHS[page]
    if (path) goTo(path)
  }

  const handleLoginRequired = (featureName: string) => {
    setLoginOverlayFeature(featureName)
    setLoginOverlayOpen(true)
  }

  if (isLoading) {
    return <LoadingScreen fadingOut={false} />
  }

  if (route === '/login') {
    return <LoginPage />
  }
  if (route === '/register') {
    return <RegisterPage />
  }
  if (route === '/faq' || route === '/docs') {
    return (
      <div
        className="min-h-screen"
        style={{
          background: 'var(--surface-primary)',
          color: 'var(--text-primary)',
        }}
      >
        <Suspense fallback={<LoadingScreen fadingOut={false} />}>
          <DocsPage />
        </Suspense>
        <LoginRequiredOverlay
          isOpen={loginOverlayOpen}
          onClose={() => setLoginOverlayOpen(false)}
          featureName={loginOverlayFeature}
        />
      </div>
    )
  }
  if (route === '/reset-password') {
    return <ResetPasswordPage />
  }
  if (route === '/trade') {
    return (
      <Suspense fallback={<LoadingScreen fadingOut={false} />}>
        <TradePage />
      </Suspense>
    )
  }
  if (route === '/tokenomics') {
    return (
      <Suspense fallback={<LoadingScreen fadingOut={false} />}>
        <TokenomicsPage />
      </Suspense>
    )
  }
  if (route === '/upgrade') {
    return (
      <Suspense fallback={<LoadingScreen fadingOut={false} />}>
        <UpgradePage />
      </Suspense>
    )
  }
  if (route === '/data' && (!user || !token)) {
    return (
      <div
        key="public-data"
        className="min-h-screen"
        style={{
          background: 'var(--surface-primary)',
          color: 'var(--text-primary)',
        }}
      >
        <HeaderBar
          isLoggedIn={false}
          currentPage="data"
          language={language}
          onLanguageChange={setLanguage}
          user={null}
          onLogout={logout}
          onLoginRequired={handleLoginRequired}
          onPageChange={navigateToPage}
        />
        <main key="data" className="pt-16">
          <ErrorBoundary name="public-data" resetKey={route}>
            <DataPage />
          </ErrorBoundary>
        </main>
        <LoginRequiredOverlay
          isOpen={loginOverlayOpen}
          onClose={() => setLoginOverlayOpen(false)}
          featureName={loginOverlayFeature}
        />
      </div>
    )
  }
  if (route === '/news' && (!user || !token)) {
    return (
      <div
        key="public-news"
        className="min-h-screen"
        style={{
          background: 'var(--surface-primary)',
          color: 'var(--text-primary)',
        }}
      >
        <HeaderBar
          isLoggedIn={false}
          currentPage="news"
          language={language}
          onLanguageChange={setLanguage}
          user={null}
          onLogout={logout}
          onLoginRequired={handleLoginRequired}
          onPageChange={navigateToPage}
        />
        <main key="news" className="pt-16">
          <ErrorBoundary name="public-news" resetKey={route}>
            <NewsPage />
          </ErrorBoundary>
        </main>
        <LoginRequiredOverlay
          isOpen={loginOverlayOpen}
          onClose={() => setLoginOverlayOpen(false)}
          featureName={loginOverlayFeature}
        />
      </div>
    )
  }
  if (route === '/' || route === '') {
    return <LandingPage />
  }

  if (!user || !token) {
    return <AuthGatePage returnPath={route} />
  }

  return (
    <AuthenticatedShell
      route={route}
      user={user}
      logout={logout}
      language={language}
      setLanguage={setLanguage}
    />
  )
}

export default function AppWithProviders() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <ConfirmDialogProvider>
            <AppKitThemeSync />
            <ErrorBoundary name="app">
              <App />
            </ErrorBoundary>
          </ConfirmDialogProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}
