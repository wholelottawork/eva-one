import { useRef, useEffect } from 'react'

interface Props { paused?: boolean }

export default function AnimatedWave({ paused }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pausedRef = useRef(paused)
  pausedRef.current = paused

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    let t = 0

    const resize = () => {
      canvas.width = canvas.offsetWidth * (window.devicePixelRatio || 1)
      canvas.height = canvas.offsetHeight * (window.devicePixelRatio || 1)
      ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1)
    }
    window.addEventListener('resize', resize)
    resize()

    const draw = () => {
      if (!pausedRef.current) {
        const w = canvas.offsetWidth
        const h = canvas.offsetHeight

        ctx.clearRect(0, 0, w, h)

        // Build wave path once per wave, render multiple times with different blur/alpha for glow
        const waves = [
          { amp: 0.14, freq: 1.2, speed: 0.22, yBase: 0.38, hue: 0 },
          { amp: 0.10, freq: 1.8, speed: 0.31, yBase: 0.42, hue: 5 },
          { amp: 0.08, freq: 0.8, speed: 0.17, yBase: 0.35, hue: -5 },
          { amp: 0.06, freq: 2.4, speed: 0.44, yBase: 0.40, hue: 8 },
          { amp: 0.12, freq: 1.5, speed: 0.19, yBase: 0.45, hue: -8 },
        ]

        const buildPath = (amp: number, freq: number, speed: number, yBase: number) => {
          const path = new Path2D()
          for (let x = 0; x <= w; x += 2) {
            const nx = x / w
            const y = h * yBase + Math.sin(nx * Math.PI * 2 * freq + t * speed) * h * amp
                     + Math.sin(nx * Math.PI * 4 * freq * 0.7 - t * speed * 1.3) * h * amp * 0.3
            x === 0 ? path.moveTo(x, y) : path.lineTo(x, y)
          }
          return path
        }

        waves.forEach(({ amp, freq, speed, yBase }) => {
          const path = buildPath(amp, freq, speed, yBase)

          // Wide outer glow
          ctx.save()
          ctx.filter = 'blur(18px)'
          ctx.strokeStyle = 'rgba(180, 0, 0, 0.35)'
          ctx.lineWidth = 22
          ctx.stroke(path)
          ctx.restore()

          // Mid glow
          ctx.save()
          ctx.filter = 'blur(8px)'
          ctx.strokeStyle = 'rgba(220, 20, 20, 0.55)'
          ctx.lineWidth = 10
          ctx.stroke(path)
          ctx.restore()

          // Inner bright glow
          ctx.save()
          ctx.filter = 'blur(3px)'
          ctx.strokeStyle = 'rgba(255, 40, 40, 0.75)'
          ctx.lineWidth = 4
          ctx.stroke(path)
          ctx.restore()

          // Sharp core line
          ctx.save()
          ctx.filter = 'none'
          ctx.strokeStyle = 'rgba(255, 80, 80, 0.9)'
          ctx.lineWidth = 1.2
          ctx.stroke(path)
          ctx.restore()
        })

        t += 0.012
      }

      animId = requestAnimationFrame(draw)
    }

    animId = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ pointerEvents: 'none' }}
    />
  )
}
