import { describe, expect, it } from 'vitest'
import { isMobileDevice } from './mobile-gate'

// Representative real-world user-agents. The fail-open contract is what matters:
// confirmed phones block, everything else (desktop, tablet, unknown) passes.
const IPHONE_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
const ANDROID_CHROME =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36'
const DESKTOP_CHROME =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
const DESKTOP_FIREFOX = 'Mozilla/5.0 (X11; Linux x86_64; rv:127.0) Gecko/20100101 Firefox/127.0'
const IPAD_SAFARI =
  'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
const ANDROID_TABLET =
  'Mozilla/5.0 (Linux; Android 14; SM-X910) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

function fakeHeaders(userAgent: string | undefined): () => Promise<Headers> {
  return async () => {
    const h = new Headers()
    if (userAgent !== undefined) {
      h.set('user-agent', userAgent)
    }
    return h
  }
}

describe('isMobileDevice', () => {
  it('returns true for an iPhone user-agent', async () => {
    expect(await isMobileDevice(fakeHeaders(IPHONE_SAFARI))).toBe(true)
  })

  it('returns true for an Android phone user-agent', async () => {
    expect(await isMobileDevice(fakeHeaders(ANDROID_CHROME))).toBe(true)
  })

  it('returns false for desktop Chrome', async () => {
    expect(await isMobileDevice(fakeHeaders(DESKTOP_CHROME))).toBe(false)
  })

  it('returns false for desktop Firefox', async () => {
    expect(await isMobileDevice(fakeHeaders(DESKTOP_FIREFOX))).toBe(false)
  })

  it('fails open: an iPad (tablet, not phone) passes through', async () => {
    expect(await isMobileDevice(fakeHeaders(IPAD_SAFARI))).toBe(false)
  })

  it('fails open: an Android tablet passes through', async () => {
    expect(await isMobileDevice(fakeHeaders(ANDROID_TABLET))).toBe(false)
  })

  it('fails open: an empty user-agent passes through', async () => {
    expect(await isMobileDevice(fakeHeaders(''))).toBe(false)
  })

  it('fails open: a missing user-agent header passes through', async () => {
    expect(await isMobileDevice(fakeHeaders(undefined))).toBe(false)
  })

  it('fails open: a nonsense user-agent passes through', async () => {
    expect(await isMobileDevice(fakeHeaders('internal-uptime-monitor/1.0'))).toBe(false)
  })

  it('fails open: a throwing header resolver passes through', async () => {
    const throwingResolver = async (): Promise<Headers> => {
      throw new Error('boom')
    }
    expect(await isMobileDevice(throwingResolver)).toBe(false)
  })
})
