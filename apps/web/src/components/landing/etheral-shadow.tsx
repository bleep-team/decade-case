'use client'

import { useEffect, useId, useRef, type CSSProperties } from 'react'

type AnimationConfig = { scale: number; speed: number }
type NoiseConfig = { opacity: number; scale: number }

type EtheralShadowProps = {
  sizing?: 'fill' | 'stretch'
  color?: string
  animation?: AnimationConfig
  noise?: NoiseConfig
  style?: CSSProperties
  className?: string
}

function mapRange(value: number, fromLow: number, fromHigh: number, toLow: number, toHigh: number) {
  if (fromLow === fromHigh) return toLow
  const pct = (value - fromLow) / (fromHigh - fromLow)
  return toLow + pct * (toHigh - toLow)
}

/**
 * Animated "ethereal shadow" backdrop: an SVG turbulence + displacement filter
 * masks a soft colored shape, slowly morphing via a hue-rotate sweep. A
 * lightweight requestAnimationFrame loop drives the sweep (no animation lib),
 * and the effect is paused for prefers-reduced-motion.
 */
export function EtheralShadow({
  sizing = 'fill',
  color = 'rgba(160, 160, 170, 1)',
  animation,
  noise,
  style,
  className,
}: EtheralShadowProps) {
  const rawId = useId()
  const id = `etheral-${rawId.replace(/:/g, '')}`
  const feRef = useRef<SVGFEColorMatrixElement>(null)

  const animationEnabled = !!animation && animation.scale > 0
  const displacementScale = animation ? mapRange(animation.scale, 1, 100, 20, 100) : 0
  const animationDuration = animation ? mapRange(animation.speed, 1, 100, 1000, 50) : 1

  useEffect(() => {
    const fe = feRef.current
    if (!fe || !animationEnabled) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const periodMs = (animationDuration / 25) * 1000
    let raf = 0
    let start = 0
    const tick = (now: number) => {
      if (!start) start = now
      const value = (((now - start) / periodMs) * 360) % 360
      fe.setAttribute('values', String(value))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [animationEnabled, animationDuration])

  return (
    <div
      className={className}
      style={{ overflow: 'hidden', position: 'relative', width: '100%', height: '100%', ...style }}
    >
      <div
        style={{
          position: 'absolute',
          inset: -displacementScale,
          filter: animationEnabled ? `url(#${id}) blur(4px)` : 'none',
        }}
      >
        {animationEnabled && (
          <svg style={{ position: 'absolute' }} aria-hidden="true">
            <defs>
              <filter id={id}>
                <feTurbulence
                  result="turb"
                  numOctaves="2"
                  baseFrequency={`${mapRange(animation!.scale, 0, 100, 0.001, 0.0005)},${mapRange(
                    animation!.scale,
                    0,
                    100,
                    0.004,
                    0.002,
                  )}`}
                  seed="0"
                  type="turbulence"
                />
                {/* The hue-rotate sweep (animated via rAF) is named `undulation`
                 * so it actually feeds the displacement below — without a result
                 * the animation has no visible effect. */}
                <feColorMatrix
                  ref={feRef}
                  in="turb"
                  type="hueRotate"
                  values="180"
                  result="undulation"
                />
                <feColorMatrix
                  in="dist"
                  result="circulation"
                  type="matrix"
                  values="4 0 0 0 1  4 0 0 0 1  4 0 0 0 1  1 0 0 0 0"
                />
                <feDisplacementMap
                  in="SourceGraphic"
                  in2="circulation"
                  scale={displacementScale}
                  result="dist"
                />
                {/* R/G channels carry the hue-rotation change, so the sweep
                 * translates into motion of the shape. */}
                <feDisplacementMap
                  in="dist"
                  in2="undulation"
                  xChannelSelector="R"
                  yChannelSelector="G"
                  scale={displacementScale}
                  result="output"
                />
              </filter>
            </defs>
          </svg>
        )}
        <div
          style={{
            backgroundColor: color,
            maskImage: `url('https://framerusercontent.com/images/ceBGguIpUU8luwByxuQz79t7To.png')`,
            WebkitMaskImage: `url('https://framerusercontent.com/images/ceBGguIpUU8luwByxuQz79t7To.png')`,
            maskSize: sizing === 'stretch' ? '100% 100%' : 'cover',
            WebkitMaskSize: sizing === 'stretch' ? '100% 100%' : 'cover',
            maskRepeat: 'no-repeat',
            WebkitMaskRepeat: 'no-repeat',
            maskPosition: 'center',
            WebkitMaskPosition: 'center',
            width: '100%',
            height: '100%',
          }}
        />
      </div>

      {noise && noise.opacity > 0 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url("https://framerusercontent.com/images/g0QcWrxr87K0ufOxIUFBakwYA8.png")`,
            backgroundSize: noise.scale * 200,
            backgroundRepeat: 'repeat',
            opacity: noise.opacity / 2,
          }}
        />
      )}
    </div>
  )
}
