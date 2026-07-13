/** EVA → Reown AppKit theme (dark metal + electric blue). Single source of truth. */
export const EVA_APPKIT_ACCENT = '#00c853'
export const EVA_APPKIT_BG = '#050505'
export const EVA_APPKIT_SURFACE = '#0c0d12'
export const EVA_APPKIT_SURFACE_HIGH = '#15171f'

/** Passed to createAppKit({ themeVariables }) and useAppKitTheme().setThemeVariables(). */
export const APPKIT_THEME_VARIABLES: Record<string, string | number> = {
  // AppKit 1.x
  '--apkt-accent': EVA_APPKIT_ACCENT,
  '--apkt-color-mix': EVA_APPKIT_BG,
  '--apkt-color-mix-strength': 48,
  '--apkt-font-family': 'Inter, system-ui, -apple-system, sans-serif',
  '--apkt-border-radius-master': '12px',
  // Legacy Web3Modal aliases (still applied by useAppKitTheme)
  '--w3m-accent': EVA_APPKIT_ACCENT,
  '--w3m-color-mix': EVA_APPKIT_BG,
  '--w3m-color-mix-strength': 48,
  '--w3m-background-color': EVA_APPKIT_BG,
  '--w3m-border-radius-master': '12px',
}
