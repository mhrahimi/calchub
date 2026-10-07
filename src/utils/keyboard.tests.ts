// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getKeyboardInset,
  resetStuckViewportOffset,
  syncAppHeight,
  syncViewportFrame,
} from './keyboard'

type ViewportStub = {
  height: number
  offsetTop: number
  addEventListener: ReturnType<typeof vi.fn>
  removeEventListener: ReturnType<typeof vi.fn>
}

function stubVisualViewport(partial: Partial<Pick<ViewportStub, 'height' | 'offsetTop'>> = {}) {
  const viewport: ViewportStub = {
    height: partial.height ?? 800,
    offsetTop: partial.offsetTop ?? 0,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }
  Object.defineProperty(window, 'visualViewport', {
    configurable: true,
    value: viewport,
  })
  return viewport
}

describe('getKeyboardInset', () => {
  beforeEach(() => {
    vi.stubGlobal('innerHeight', 900)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    Reflect.deleteProperty(window, 'visualViewport')
  })

  it('returns 0 when coverage is below the threshold', () => {
    stubVisualViewport({ height: 820, offsetTop: 0 })
    expect(getKeyboardInset()).toBe(0)
  })

  it('returns covered height when the keyboard is open', () => {
    stubVisualViewport({ height: 500, offsetTop: 40 })
    // covered = 900 - 500 - 40 = 360
    expect(getKeyboardInset()).toBe(360)
  })

  it('returns 0 when visualViewport is unavailable', () => {
    Reflect.deleteProperty(window, 'visualViewport')
    expect(getKeyboardInset()).toBe(0)
  })
})

describe('syncAppHeight', () => {
  afterEach(() => {
    document.documentElement.style.removeProperty('--app-height')
    Reflect.deleteProperty(window, 'visualViewport')
  })

  it('sets --app-height from visualViewport.height', () => {
    stubVisualViewport({ height: 712.4 })
    expect(syncAppHeight()).toBe(712)
    expect(document.documentElement.style.getPropertyValue('--app-height')).toBe('712px')
  })
})

describe('resetStuckViewportOffset', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    Reflect.deleteProperty(window, 'visualViewport')
  })

  it('scrolls to top when offsetTop remains after dismiss', () => {
    stubVisualViewport({ height: 800, offsetTop: 120 })
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    expect(resetStuckViewportOffset()).toBe(true)
    expect(scrollTo).toHaveBeenCalledWith(0, 0)
  })

  it('is a no-op when the viewport is already aligned', () => {
    stubVisualViewport({ height: 800, offsetTop: 0 })
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 })
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    expect(resetStuckViewportOffset()).toBe(false)
    expect(scrollTo).not.toHaveBeenCalled()
  })
})

describe('syncViewportFrame', () => {
  beforeEach(() => {
    vi.stubGlobal('innerHeight', 900)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    document.documentElement.style.removeProperty('--app-height')
    Reflect.deleteProperty(window, 'visualViewport')
  })

  it('updates app height and resets leftover offset when keyboard is closed', () => {
    stubVisualViewport({ height: 850, offsetTop: 80 })
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})

    expect(syncViewportFrame()).toBe(0)
    expect(document.documentElement.style.getPropertyValue('--app-height')).toBe('850px')
    expect(scrollTo).toHaveBeenCalledWith(0, 0)
  })

  it('updates app height without forcing scroll while keyboard is open', () => {
    stubVisualViewport({ height: 500, offsetTop: 40 })
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})

    expect(syncViewportFrame()).toBe(360)
    expect(document.documentElement.style.getPropertyValue('--app-height')).toBe('500px')
    expect(scrollTo).not.toHaveBeenCalled()
  })
})
