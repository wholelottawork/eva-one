import { LogIn, UserPlus, Lock } from 'lucide-react'
import { goTo as navGoTo } from '../lib/nav'

interface AuthGatePageProps {
  returnPath?: string
}

export function AuthGatePage({ returnPath }: AuthGatePageProps) {
  const goTo = (path: string) => {
    if (returnPath) {
      try {
        sessionStorage.setItem('returnUrl', returnPath)
      } catch {
        /* storage blocked */
      }
    }
    navGoTo(path) // SPA nav (no full reload)
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'var(--surface-primary)' }}
    >
      {/* background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 60% 40% at 50% 30%, rgba(0,200,83,0.06) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 flex flex-col items-center text-center max-w-sm w-full">
        {/* Icon */}
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
          style={{
            background: 'rgba(0,200,83,0.1)',
            border: '1px solid rgba(0,200,83,0.2)',
          }}
        >
          <Lock className="w-7 h-7" style={{ color: '#00c853' }} />
        </div>

        {/* Brand */}
        <div
          className="text-sm font-mono tracking-[0.3em] mb-3"
          style={{ color: 'rgba(0,200,83,0.7)' }}
        >
          EVA PROTOCOL
        </div>

        <h1 className="text-2xl font-bold mb-3" style={{ color: '#fff' }}>
          Sign in required
        </h1>
        <p
          className="text-sm leading-relaxed mb-8"
          style={{ color: 'rgba(255,255,255,0.45)' }}
        >
          This page requires an account. Sign in to your existing account or
          create a new one to continue.
        </p>

        {/* Buttons */}
        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={() => goTo('/login')}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
            style={{
              background: 'linear-gradient(135deg, #00c853 0%, #15803d 100%)',
              color: '#fff',
            }}
          >
            <LogIn className="w-4 h-4" />
            Sign In
          </button>
          <button
            onClick={() => goTo('/register')}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#fff',
            }}
          >
            <UserPlus className="w-4 h-4" />
            Create Account
          </button>
        </div>

        <button
          onClick={() => navGoTo('/')}
          className="mt-6 text-xs font-bold transition-opacity hover:opacity-60"
          style={{ color: '#ffffff' }}
        >
          ← Return to home
        </button>
      </div>
    </div>
  )
}
