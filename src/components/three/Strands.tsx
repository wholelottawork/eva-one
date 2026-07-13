// @ts-nocheck
// Based on ReactBits "Strands" (https://reactbits.dev/animations/strands) — an
// OGL (WebGL) flowing-strands background. EVA additions:
//   • cheap, smoothed (lerp) MOUSE INTERACTION — strands swell + bend gently
//     toward the cursor so the scene reads as live, not a video. Costs ~3 extra
//     ops/pixel (computed once, outside the strand loop).
//   • DPR capped at 1 (≤0.7 on mobile) + antialias off on mobile for perf.
//   • pauses rendering when the tab is hidden; honors prefers-reduced-motion.
import { Renderer, Program, Mesh, Color, Triangle, RenderTarget } from 'ogl'
import { useEffect, useRef, CSSProperties } from 'react'

const MAX_STRANDS = 12
const MAX_COLORS = 8

const VERT = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`

const FRAG = `#version 300 es
precision highp float;

uniform float uTime;
uniform vec2 uResolution;
uniform vec3 uColors[${MAX_COLORS}];
uniform int uColorCount;
uniform int uStrandCount;
uniform float uSpeed;
uniform float uAmplitude;
uniform float uWaviness;
uniform float uThickness;
uniform float uGlow;
uniform float uTaper;
uniform float uSpread;
uniform float uHueShift;
uniform float uIntensity;
uniform float uOpacity;
uniform float uScale;
uniform float uSaturation;
uniform vec2 uMouse;        // smoothed pointer in height-normalized space
uniform float uMouseStrength;
uniform float uBreath;       // glow breathing amplitude (0 = off)
uniform float uBreathSpeed;  // glow breathing speed (slow = relaxed)

out vec4 fragColor;

const float PI = 3.14159265;

vec3 spectrum(float t) {
  return 0.5 + 0.5 * cos(2.0 * PI * (t + vec3(0.00, 0.33, 0.67)));
}

vec3 samplePalette(float t) {
  t = fract(t);
  float scaled = t * float(uColorCount);
  int idx = int(floor(scaled));
  float blend = fract(scaled);
  int nextIdx = idx + 1;
  if (nextIdx >= uColorCount) nextIdx = 0;
  return mix(uColors[idx], uColors[nextIdx], blend);
}

vec3 strandColor(float t) {
  if (uColorCount > 0) return samplePalette(t);
  return spectrum(t);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / uResolution.y;
  uv /= max(uScale, 0.0001);

  float e = 0.06 + uIntensity * 0.94;
  float env = pow(max(cos(uv.x * PI * 1.3), 0.0), uTaper);

  // ── mouse influence (computed once, not per-strand) ──
  vec2 m = uMouse / max(uScale, 0.0001);
  float mdx = uv.x - m.x;
  float infl = exp(-mdx * mdx * 5.0) * uMouseStrength; // soft gaussian around cursor x
  float swell = 1.0 + infl * 0.7;                      // strands fatten near cursor
  float bend = m.y * env * infl * 0.5;                 // gentle pull toward cursor y

  vec3 col = vec3(0.0);

  for (int i = 0; i < ${MAX_STRANDS}; i++) {
    if (i >= uStrandCount) break;

    float fi = float(i);
    float ph = fi * 1.7 * uSpread;
    float freq = (2.0 + fi * 0.35) * uWaviness;
    float spd = 1.4 + fi * 1.2;

    float tt = uTime * uSpeed;
    float w = sin(uv.x * freq + tt * spd + ph) * 0.60
            + sin(uv.x * freq * 1.1 - tt * spd * 0.7 + ph * 1.7) * 0.40;

    float amp = (0.1 + 0.02 * e) * env * uAmplitude * swell;
    float y = w * amp + bend;

    float d = abs(uv.y - y);
    float thick = (0.001 + 0.05 * e) * (0.35 + env) * uThickness;
    float g = thick / (d + thick * 0.45);
    g = g * g;

    float h = fi / float(uStrandCount) + uv.x * 0.30 + uTime * 0.04 + uHueShift;
    col += strandColor(h) * g * env;
  }

  col *= 0.45 + 0.7 * e;
  // breathing bloom — the glow rises and falls but the base stays vivid
  float breath = 1.0 + uBreath * sin(uTime * uBreathSpeed);
  col = 1.0 - exp(-col * uGlow * breath);

  float gray = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = max(mix(vec3(gray), col, uSaturation), 0.0);

  float lum = max(max(col.r, col.g), col.b);
  float alpha = clamp(lum, 0.0, 1.0) * uOpacity;

  fragColor = vec4(col * uOpacity, alpha);
}
`

export interface StrandsProps {
  colors?: string[]
  count?: number
  speed?: number
  amplitude?: number
  waviness?: number
  thickness?: number
  glow?: number
  taper?: number
  spread?: number
  hueShift?: number
  intensity?: number
  saturation?: number
  opacity?: number
  scale?: number
  /** glow breathing amplitude (0 = off). Default 0.24. */
  breath?: number
  /** glow breathing speed (lower = more relaxed). Default 0.85. */
  breathSpeed?: number
  /** mouse reactivity (0 = off). Default 1. Cheap; smoothed with lerp. */
  mouseStrength?: number
  /** hard DPR ceiling; mobile auto-drops below this. Default 1. */
  maxDpr?: number
  className?: string
  style?: CSSProperties
}

const buildPalette = (colors: string[]): number[][] => {
  const filled = colors && colors.length ? colors : ['#ffffff']
  const padded: number[][] = []
  for (let i = 0; i < MAX_COLORS; i++) {
    const hex = filled[i] ?? filled[filled.length - 1]
    const c = new Color(hex)
    padded.push([c.r, c.g, c.b])
  }
  return padded
}

export default function Strands({
  colors = ['#166534', '#ffffff', '#8b3dff'],
  count = 5,
  speed = 0.28,
  amplitude = 1.15,
  waviness = 1.05,
  thickness = 0.72,
  glow = 2.6,
  taper = 1.2,
  spread = 1,
  hueShift = 0,
  intensity = 0.6,
  saturation = 1.5,
  opacity = 0.92,
  scale = 1.7,
  breath = 0.24,
  breathSpeed = 0.85,
  mouseStrength = 1,
  maxDpr = 1,
  className = '',
  style,
}: StrandsProps) {
  const propsRef = useRef({
    colors,
    count,
    speed,
    amplitude,
    waviness,
    thickness,
    glow,
    taper,
    spread,
    hueShift,
    intensity,
    saturation,
    opacity,
    scale,
    breath,
    breathSpeed,
    mouseStrength,
  })
  propsRef.current = {
    colors,
    count,
    speed,
    amplitude,
    waviness,
    thickness,
    glow,
    taper,
    spread,
    hueShift,
    intensity,
    saturation,
    opacity,
    scale,
    breath,
    breathSpeed,
    mouseStrength,
  }

  const ctnDom = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctn = ctnDom.current
    if (!ctn) return

    const reduceMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const isMobile = window.innerWidth < 768
    // DPR capped at maxDpr (≤1); mobile drops further for the heavy fragment work.
    const dpr = Math.min(
      window.devicePixelRatio || 1,
      isMobile ? Math.min(maxDpr, 0.7) : maxDpr
    )

    const renderer = new Renderer({
      alpha: true,
      premultipliedAlpha: true,
      antialias: !isMobile,
      dpr,
    })
    const gl = renderer.gl
    gl.clearColor(0, 0, 0, 0)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    gl.canvas.style.backgroundColor = 'transparent'

    const geometry = new Triangle(gl)
    if (geometry.attributes.uv) delete geometry.attributes.uv

    const program = new Program(gl, {
      vertex: VERT,
      fragment: FRAG,
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: [ctn.offsetWidth, ctn.offsetHeight] },
        uColors: { value: buildPalette(propsRef.current.colors) },
        uColorCount: {
          value: Math.min(propsRef.current.colors.length, MAX_COLORS),
        },
        uStrandCount: { value: Math.min(propsRef.current.count, MAX_STRANDS) },
        uSpeed: { value: speed },
        uAmplitude: { value: amplitude },
        uWaviness: { value: waviness },
        uThickness: { value: thickness },
        uGlow: { value: glow },
        uTaper: { value: taper },
        uSpread: { value: spread },
        uHueShift: { value: hueShift },
        uIntensity: { value: intensity },
        uOpacity: { value: opacity },
        uScale: { value: scale },
        uSaturation: { value: saturation },
        uMouse: { value: [0, 0] },
        uMouseStrength: { value: reduceMotion ? 0 : mouseStrength },
        uBreath: { value: reduceMotion ? 0 : breath },
        uBreathSpeed: { value: breathSpeed },
      },
    })

    const mesh = new Mesh(gl, { geometry, program })
    ctn.appendChild(gl.canvas)

    function resize() {
      if (!ctn) return
      const width = ctn.offsetWidth
      const height = ctn.offsetHeight
      renderer.setSize(width, height)
      program.uniforms.uResolution.value = [width, height]
    }
    window.addEventListener('resize', resize)
    resize()

    // ── smoothed pointer (canvas is pointer-events:none, so listen on window) ──
    const pointer = { tx: 0, ty: 0, cx: 0, cy: 0 }
    const onPointer = (ev: PointerEvent) => {
      const rect = ctn.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return
      pointer.tx = (ev.clientX - rect.left - 0.5 * rect.width) / rect.height
      pointer.ty = -(ev.clientY - rect.top - 0.5 * rect.height) / rect.height
    }
    if (!reduceMotion)
      window.addEventListener('pointermove', onPointer, { passive: true })

    let animateId = 0
    let running = true
    const update = (tm: number) => {
      if (document.hidden) {
        running = false
        return
      }
      animateId = requestAnimationFrame(update)
      const current = propsRef.current
      // very soft, slow lerp toward the cursor target — the scene trails the
      // pointer gently (low factor = much smoother / more relaxed)
      pointer.cx += (pointer.tx - pointer.cx) * 0.018
      pointer.cy += (pointer.ty - pointer.cy) * 0.018

      program.uniforms.uTime.value = tm * 0.001
      program.uniforms.uColors.value = buildPalette(current.colors)
      program.uniforms.uColorCount.value = Math.min(
        current.colors.length,
        MAX_COLORS
      )
      program.uniforms.uStrandCount.value = Math.min(
        Math.max(Math.round(current.count), 1),
        MAX_STRANDS
      )
      program.uniforms.uSpeed.value = current.speed
      program.uniforms.uAmplitude.value = current.amplitude
      program.uniforms.uWaviness.value = current.waviness
      program.uniforms.uThickness.value = current.thickness
      program.uniforms.uGlow.value = current.glow
      program.uniforms.uTaper.value = current.taper
      program.uniforms.uSpread.value = current.spread
      program.uniforms.uHueShift.value = current.hueShift
      program.uniforms.uIntensity.value = current.intensity
      program.uniforms.uOpacity.value = current.opacity
      program.uniforms.uScale.value = current.scale
      program.uniforms.uSaturation.value = current.saturation
      program.uniforms.uMouse.value = [pointer.cx, pointer.cy]
      program.uniforms.uMouseStrength.value = current.mouseStrength
      program.uniforms.uBreath.value = current.breath
      program.uniforms.uBreathSpeed.value = current.breathSpeed

      renderer.render({ scene: mesh })
    }

    const onVisibility = () => {
      if (!document.hidden && !running && !reduceMotion) {
        running = true
        animateId = requestAnimationFrame(update)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    if (reduceMotion) {
      // single static frame, no loop, no listeners doing work
      program.uniforms.uTime.value = 0
      renderer.render({ scene: mesh })
    } else {
      animateId = requestAnimationFrame(update)
    }

    return () => {
      cancelAnimationFrame(animateId)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onPointer)
      document.removeEventListener('visibilitychange', onVisibility)
      if (ctn && gl.canvas.parentNode === ctn) ctn.removeChild(gl.canvas)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    }
  }, [])

  return (
    <div
      ref={ctnDom}
      className={`relative w-full h-full bg-transparent ${className}`}
      style={style}
    />
  )
}
