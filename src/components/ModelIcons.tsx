interface IconProps {
  width?: number
  height?: number
  className?: string
}

const PROVIDER_ICON_PATHS: Record<string, string> = {
  deepseek: '/icons/deepseek.svg',
  qwen: '/icons/qwen.svg',
  claude: '/icons/claude.svg',
  kimi: '/icons/kimi.svg',
  gemini: '/icons/gemini.svg',
  grok: '/icons/grok.svg',
  openai: '/icons/openai.svg',
}

const PROVIDER_MATCH_ORDER = [
  'deepseek',
  'qwen',
  'claude',
  'kimi',
  'gemini',
  'grok',
  'openai',
  'gpt',
] as const

// AI model colors for fallback display
const MODEL_COLORS: Record<string, string> = {
  deepseek: '#4A90E2',
  qwen: '#9B59B6',
  claude: '#D97757',
  kimi: '#6366F1',
  gemini: '#4285F4',
  grok: '#000000',
  openai: '#10A37F',
}

export function resolveModelProvider(modelType: string): string | null {
  if (!modelType) return null

  const normalized = modelType.trim().toLowerCase()
  if (PROVIDER_ICON_PATHS[normalized]) {
    return normalized
  }

  if (modelType.includes('_')) {
    const suffix = modelType.split('_').pop()?.toLowerCase()
    if (suffix === 'gpt') return 'openai'
    if (suffix && PROVIDER_ICON_PATHS[suffix]) {
      return suffix
    }
  }

  for (const key of PROVIDER_MATCH_ORDER) {
    if (normalized.includes(key)) {
      return key === 'gpt' ? 'openai' : key
    }
  }

  return null
}

export const getModelIcon = (modelType: string, props: IconProps = {}) => {
  const provider = resolveModelProvider(modelType)
  if (!provider) return null

  const iconPath = PROVIDER_ICON_PATHS[provider]
  if (!iconPath) return null

  return (
    <img
      src={iconPath}
      alt={`${provider} icon`}
      width={props.width || 24}
      height={props.height || 24}
      className={props.className}
    />
  )
}

export const getModelColor = (modelType: string): string => {
  const provider = resolveModelProvider(modelType)
  return (provider && MODEL_COLORS[provider]) || '#4ade80'
}

interface ModelAvatarProps {
  name: string
  provider?: string
  size?: number
  className?: string
}

/** Provider logo with letter fallback — used in debate, traders, etc. */
export function ModelAvatar({
  name,
  provider,
  size = 24,
  className = '',
}: ModelAvatarProps) {
  const iconSize = Math.max(10, Math.round(size * 0.72))
  const icon = getModelIcon(provider || name, {
    width: iconSize,
    height: iconSize,
    className: 'object-contain',
  })

  if (icon) {
    return (
      <div
        className={`rounded-md flex items-center justify-center overflow-hidden shrink-0 ${className}`}
        style={{
          width: size,
          height: size,
          background: 'var(--surface-tertiary)',
        }}
      >
        {icon}
      </div>
    )
  }

  const color = getModelColor(provider || name)
  return (
    <div
      className={`rounded-md flex items-center justify-center font-bold text-white shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.45,
        background: color,
      }}
    >
      {name[0]?.toUpperCase() || '?'}
    </div>
  )
}
