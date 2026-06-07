'use client'

import { type CSSProperties } from 'react'

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

const MASK_URL = 'https://framerusercontent.com/images/ceBGguIpUU8luwByxuQz79t7To.png'
const NOISE_URL = 'https://framerusercontent.com/images/g0QcWrxr87K0ufOxIUFBakwYA8.png'

function mapRange(value: number, fromLow: number, fromHigh: number, toLow: number, toHigh: number) {
  if (fromLow === fromHigh) return toLow
  const pct = (value - fromLow) / (fromHigh - fromLow)
  return toLow + pct * (toHigh - toLow)
}

/**
 * Animated "ethereal shadow" backdrop: a soft smoky mask over a flat color that
 * slowly churns like drifting fog.
 *
 * The previous version morphed the shape with an animated SVG turbulence +
 * displacement filter driven by requestAnimationFrame. That tiled into a broken
 * grid and lagged badly in Safari (WebKit chunks large filter regions and
 * re-rasterizes the whole filter every frame). Here the motion is faked with two
 * copies of the smoke mask drifting, scaling, and counter-rotating at different
 * speeds and zoom levels — where they overlap and separate the smoke appears to
 * undulate. It's all GPU-composited CSS transforms, so it's smooth and identical
 * across browsers, and it honors prefers-reduced-motion.
 */
export function EtheralShadow({
  sizing = 'fill',
  color = 'rgba(160, 160, 170, 1)',
  animation,
  noise,
  style,
  className,
}: EtheralShadowProps) {
  const animate = !!animation && animation.scale > 0
  // Higher speed -> shorter drift cycle (the two layers run at offset periods so
  // they never resync, which keeps the churn from looking like a loop).
  const baseDuration = animation ? mapRange(animation.speed, 1, 100, 24, 9) : 18

  const layerStyle: CSSProperties = {
    position: 'absolute',
    inset: '-30%',
    backgroundColor: color,
    maskImage: `url('${MASK_URL}')`,
    WebkitMaskImage: `url('${MASK_URL}')`,
    maskSize: sizing === 'stretch' ? '100% 100%' : 'cover',
    WebkitMaskSize: sizing === 'stretch' ? '100% 100%' : 'cover',
    maskRepeat: 'no-repeat',
    WebkitMaskRepeat: 'no-repeat',
    maskPosition: 'center',
    WebkitMaskPosition: 'center',
    willChange: 'transform',
  }

  return (
    <div
      className={className}
      style={{ overflow: 'hidden', position: 'relative', width: '100%', height: '100%', ...style }}
    >
      <div
        aria-hidden="true"
        className={animate ? 'etheral-drift-a' : undefined}
        style={{ ...layerStyle, animationDuration: `${baseDuration}s` }}
      />
      <div
        aria-hidden="true"
        className={animate ? 'etheral-drift-b' : undefined}
        style={{ ...layerStyle, opacity: 0.6, animationDuration: `${baseDuration * 1.45}s` }}
      />

      {noise && noise.opacity > 0 && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url("${NOISE_URL}")`,
            backgroundSize: noise.scale * 200,
            backgroundRepeat: 'repeat',
            opacity: noise.opacity / 2,
          }}
        />
      )}

      <style>{`
        @keyframes etheral-drift-a {
          0%   { transform: scale(1.1) translate3d(-6%, -4%, 0) rotate(-6deg); }
          100% { transform: scale(1.38) translate3d(7%, 5%, 0) rotate(6.5deg); }
        }
        @keyframes etheral-drift-b {
          0%   { transform: scale(1.42) translate3d(6%, 4%, 0) rotate(5.5deg); }
          100% { transform: scale(1.16) translate3d(-7%, -5%, 0) rotate(-6.5deg); }
        }
        .etheral-drift-a, .etheral-drift-b {
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
          animation-direction: alternate;
        }
        .etheral-drift-a { animation-name: etheral-drift-a; }
        .etheral-drift-b { animation-name: etheral-drift-b; }
        @media (prefers-reduced-motion: reduce) {
          .etheral-drift-a, .etheral-drift-b { animation: none; }
        }
      `}</style>
    </div>
  )
}
