import { useEffect, useState, lazy, Suspense, type ComponentType } from 'react'
import useSWR from 'swr'
import { api } from './lib/api'
import { LoadingScreen } from './components/LoadingScreen'
import HeaderBar from './components/HeaderBar'
import { OnboardingDialog } from './components/OnboardingDialog'
import { ErrorBoundary } from './components/ErrorBoundary'
import { LoginRequiredOverlay } from './components/LoginRequiredOverlay'
import { SiteFooter } from './components/SiteFooter'
import { DataPage } from './pages/DataPage'
import { NewsPage } from './pages/NewsPage'
import { goTo, getPageFromPath, PAGE_PATHS, type AppPage } from './lib/nav'
import { type Language } from './i18n/translations'
import type {
  SystemStatus,
  AccountInfo,
  Position,
  DecisionRecord,
  Statistics,
  TraderInfo,
  Exchange,
} from './types'

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

const TraderDashboardPage = lazyWithReload(() =>
  import('./pages/TraderDashboardPage').then((m) => ({
    default: m.TraderDashboardPage,
  }))
)
const AITradersPage = lazyWithReload(() =>
  import('./components/AITradersPage').then((m) => ({
    default: m.AITradersPage,
  }))
)
const CompetitionPage = lazyWithReload(() =>
  import('./components/CompetitionPage').then((m) => ({
    default: m.CompetitionPage,
  }))
)
const BacktestPage = lazyWithReload(() =>
  import('./components/BacktestPage').then((m) => ({ default: m.BacktestPage }))
)
const StrategyStudioPage = lazyWithReload(() =>
  import('./pages/StrategyStudioPage').then((m) => ({
    default: m.StrategyStudioPage,
  }))
)
const DebateArenaPage = lazyWithReload(() =>
  import('./pages/DebateArenaPage').then((m) => ({
    default: m.DebateArenaPage,
  }))
)
const StrategyMarketPage = lazyWithReload(() =>
  import('./pages/StrategyMarketPage').then((m) => ({
    default: m.StrategyMarketPage,
  }))
)

type Page = AppPage

type AuthUser = { id: string; email: string }

type Props = {
  route: string
  user: AuthUser
  logout: () => void
  language: Language
  setLanguage: (lang: Language) => void
}

export function AuthenticatedShell({
  route,
  user,
  logout,
  language,
  setLanguage,
}: Props) {
  const currentPage = getPageFromPath(route)
  const [loginOverlayOpen, setLoginOverlayOpen] = useState(false)
  const [loginOverlayFeature, setLoginOverlayFeature] = useState('')
  const [selectedTraderSlug, setSelectedTraderSlug] = useState<
    string | undefined
  >(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('trader') || undefined
  })
  const [selectedTraderId, setSelectedTraderId] = useState<string | undefined>()
  const [lastUpdate, setLastUpdate] = useState<string>('--:--:--')
  const [decisionsLimit, setDecisionsLimit] = useState<number>(5)

  const getTraderSlug = (trader: TraderInfo) => {
    const idPrefix = trader.trader_id.slice(0, 4)
    return `${trader.trader_name}-${idPrefix}`
  }

  const findTraderBySlug = (slug: string, traderList: TraderInfo[]) => {
    const lastDashIndex = slug.lastIndexOf('-')
    if (lastDashIndex === -1) {
      return traderList.find((t) => t.trader_name === slug)
    }
    const name = slug.slice(0, lastDashIndex)
    const idPrefix = slug.slice(lastDashIndex + 1)
    return traderList.find(
      (t) => t.trader_name === name && t.trader_id.startsWith(idPrefix)
    )
  }

  const navigateToPage = (page: Page) => {
    const path = PAGE_PATHS[page]
    if (path) goTo(path)
  }

  const handleLoginRequired = (featureName: string) => {
    setLoginOverlayFeature(featureName)
    setLoginOverlayOpen(true)
  }

  useEffect(() => {
    const traderParam = new URLSearchParams(window.location.search).get(
      'trader'
    )
    if (traderParam) setSelectedTraderSlug(traderParam)
  }, [route])

  const routesNeedingTraderData = [
    '/dashboard',
    '/traders',
    '/competition',
    '/backtest',
    '/strategy',
    '/debate',
    '/strategy-market',
  ]
  const shouldLoadTraderData = routesNeedingTraderData.includes(
    route.split('?')[0] || '/'
  )

  const { data: traders, error: tradersError } = useSWR<TraderInfo[]>(
    shouldLoadTraderData ? 'traders' : null,
    api.getTraders,
    {
      refreshInterval: 10000,
      shouldRetryOnError: false,
    }
  )

  const { data: exchanges } = useSWR<Exchange[]>(
    shouldLoadTraderData ? 'exchanges' : null,
    api.getExchangeConfigs,
    {
      refreshInterval: 60000,
      shouldRetryOnError: false,
    }
  )

  useEffect(() => {
    if (traders && traders.length > 0 && !selectedTraderId) {
      if (selectedTraderSlug) {
        const trader = findTraderBySlug(selectedTraderSlug, traders)
        if (trader) {
          setSelectedTraderId(trader.trader_id)
        } else {
          setSelectedTraderId(traders[0].trader_id)
        }
      } else {
        setSelectedTraderId(traders[0].trader_id)
      }
    }
  }, [traders, selectedTraderId, selectedTraderSlug])

  const { data: status } = useSWR<SystemStatus>(
    currentPage === 'trader' && selectedTraderId
      ? `status-${selectedTraderId}`
      : null,
    () => api.getStatus(selectedTraderId),
    {
      refreshInterval: 15000,
      revalidateOnFocus: false,
      dedupingInterval: 10000,
    }
  )

  const { data: account } = useSWR<AccountInfo>(
    currentPage === 'trader' && selectedTraderId
      ? `account-${selectedTraderId}`
      : null,
    () => api.getAccount(selectedTraderId),
    {
      refreshInterval: 15000,
      revalidateOnFocus: false,
      dedupingInterval: 10000,
    }
  )

  const { data: positions } = useSWR<Position[]>(
    currentPage === 'trader' && selectedTraderId
      ? `positions-${selectedTraderId}`
      : null,
    () => api.getPositions(selectedTraderId),
    {
      refreshInterval: 15000,
      revalidateOnFocus: false,
      dedupingInterval: 10000,
    }
  )

  const { data: decisions } = useSWR<DecisionRecord[]>(
    currentPage === 'trader' && selectedTraderId
      ? `decisions/latest-${selectedTraderId}-${decisionsLimit}`
      : null,
    () => api.getLatestDecisions(selectedTraderId, decisionsLimit),
    {
      refreshInterval: 30000,
      revalidateOnFocus: false,
      dedupingInterval: 20000,
    }
  )

  const { data: stats } = useSWR<Statistics>(
    currentPage === 'trader' && selectedTraderId
      ? `statistics-${selectedTraderId}`
      : null,
    () => api.getStatistics(selectedTraderId),
    {
      refreshInterval: 30000,
      revalidateOnFocus: false,
      dedupingInterval: 20000,
    }
  )

  useEffect(() => {
    if (account) {
      setLastUpdate(new Date().toLocaleTimeString())
    }
  }, [account])

  const selectedTrader = traders?.find((t) => t.trader_id === selectedTraderId)

  return (
    <div
      className="min-h-screen"
      style={{
        background: 'var(--surface-primary)',
        color: 'var(--text-primary)',
      }}
    >
      <HeaderBar
        isLoggedIn
        currentPage={
          currentPage as Parameters<typeof HeaderBar>[0]['currentPage']
        }
        language={language}
        onLanguageChange={setLanguage}
        user={user}
        onLogout={logout}
        onLoginRequired={handleLoginRequired}
        onPageChange={navigateToPage}
      />

      <main className="min-h-screen pt-16">
        <ErrorBoundary name="page" resetKey={currentPage}>
          <Suspense fallback={<LoadingScreen fadingOut={false} />}>
            {currentPage === 'competition' ? (
              <CompetitionPage />
            ) : currentPage === 'data' ? (
              <DataPage />
            ) : currentPage === 'news' ? (
              <NewsPage />
            ) : currentPage === 'strategy-market' ? (
              <StrategyMarketPage />
            ) : currentPage === 'traders' ? (
              <AITradersPage
                onTraderSelect={(traderId: string) => {
                  setSelectedTraderId(traderId)
                  goTo('/dashboard')
                }}
              />
            ) : currentPage === 'backtest' ? (
              <BacktestPage />
            ) : currentPage === 'strategy' ? (
              <StrategyStudioPage />
            ) : currentPage === 'debate' ? (
              <DebateArenaPage />
            ) : (
              <TraderDashboardPage
                selectedTrader={selectedTrader}
                status={status}
                account={account}
                positions={positions}
                decisions={decisions}
                decisionsLimit={decisionsLimit}
                onDecisionsLimitChange={setDecisionsLimit}
                stats={stats}
                lastUpdate={lastUpdate}
                language={language}
                traders={traders}
                tradersError={tradersError}
                selectedTraderId={selectedTraderId}
                onTraderSelect={(traderId: string) => {
                  setSelectedTraderId(traderId)
                  const trader = traders?.find((t) => t.trader_id === traderId)
                  if (trader) {
                    const url = new URL(window.location.href)
                    url.searchParams.set('trader', getTraderSlug(trader))
                    window.history.replaceState({}, '', url.toString())
                  }
                }}
                onNavigateToTraders={() => goTo('/traders')}
                exchanges={exchanges}
              />
            )}
          </Suspense>
        </ErrorBoundary>
      </main>

      {currentPage !== 'debate' && currentPage !== 'news' && currentPage !== 'data' && <SiteFooter language={language} />}

      <LoginRequiredOverlay
        isOpen={loginOverlayOpen}
        onClose={() => setLoginOverlayOpen(false)}
        featureName={loginOverlayFeature}
      />

      <OnboardingDialog language={language} />
    </div>
  )
}
