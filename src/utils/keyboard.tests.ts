// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getKeyboardMetrics,
  recoverStuckViewport,
  setAppHeight,
  useKeyboardInset,
} from './keyboard'

class ViewportStub extends EventTarget {
  height: number
  offsetTop: number

  constructor(height = 800, offsetTop = 0) {
    super()
    this.height = height
    this.offsetTop = offsetTop
  }
}

function stubVisualViewport(height = 800, offsetTop = 0) {
  const viewport = new ViewportStub(height, offsetTop)
  Object.defineProperty(window, 'visualViewport', {
    configurable: true,
    value: viewport as unknown as VisualViewport,
  })
  return viewport
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  document.documentElement.style.removeProperty('--app-height')
  document.body.replaceChildren()
  Reflect.deleteProperty(window, 'visualViewport')
})

describe('getKeyboardMetrics', () => {
  it('detects iOS Chrome when innerHeight shrinks with the keyboard', () => {
    vi.stubGlobal('innerHeight', 380)
    stubVisualViewport(380, 0)

    expect(getKeyboardMetrics(800)).toEqual({ open: true, inset: 420 })
  })

  it('subtracts visual viewport pan from the bottom occlusion', () => {
    stubVisualViewport(400, 80)
    expect(getKeyboardMetrics(800)).toEqual({ open: true, inset: 320 })
  })

  it('stays closed below the keyboard threshold', () => {
    stubVisualViewport(710, 0)
    expect(getKeyboardMetrics(800)).toEqual({ open: false, inset: 0 })
  })

  it('stays closed when visualViewport is unavailable', () => {
    expect(getKeyboardMetrics(800)).toEqual({ open: false, inset: 0 })
  })
})

describe('stable app height', () => {
  it('writes the pre-keyboard baseline instead of the compressed height', () => {
    stubVisualViewport(380)
    expect(setAppHeight(800.4)).toBe(800)
    expect(document.documentElement.style.getPropertyValue('--app-height')).toBe('800px')
  })
})

describe('recoverStuckViewport', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 })
  })

  it('forces a stale viewport reflow and preserves main scroll', () => {
    stubVisualViewport(420, 80)
    const root = document.createElement('div')
    root.id = 'root'
    const main = document.createElement('main')
    main.id = 'main-content'
    main.scrollTop = 240
    root.append(main)
    document.body.append(root)
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    const scrollBy = vi.spyOn(window, 'scrollBy').mockImplementation(() => {})

    expect(recoverStuckViewport(800)).toBe(true)
    expect(scrollTo).toHaveBeenCalledWith(0, 0)
    expect(scrollBy).toHaveBeenNthCalledWith(1, 0, 1)
    expect(scrollBy).toHaveBeenNthCalledWith(2, 0, -1)
    expect(root.style.display).toBe('')
    expect(main.scrollTop).toBe(240)
  })

  it('does not reflow an already restored viewport', () => {
    stubVisualViewport(800, 0)
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    expect(recoverStuckViewport(800)).toBe(false)
    expect(scrollTo).not.toHaveBeenCalled()
  })
})

describe('useKeyboardInset', () => {
  let root: Root
  let container: HTMLDivElement
  let viewport: ViewportStub

  function Harness() {
    const metrics = useKeyboardInset()
    return createElement(
      'main',
      { id: 'main-content' },
      createElement('input', { 'aria-label': 'Amount' }),
      createElement('output', {
        'data-open': String(metrics.open),
        'data-inset': String(metrics.inset),
      }),
    )
  }

  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    vi.stubGlobal(
      'requestAnimationFrame',
      (callback: FrameRequestCallback) => window.setTimeout(() => callback(0), 0),
    )
    vi.stubGlobal('cancelAnimationFrame', (id: number) => window.clearTimeout(id))
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    vi.spyOn(window, 'scrollBy').mockImplementation(() => {})
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 })
    viewport = stubVisualViewport(800, 0)
    container = document.createElement('div')
    container.id = 'root'
    document.body.append(container)
    root = createRoot(container)
  })

  afterEach(async () => {
    await act(async () => root.unmount())
    vi.useRealTimers()
  })

  it('keeps the shell baseline and detects a co-shrinking Chrome viewport', async () => {
    await act(async () => root.render(createElement(Harness)))
    const input = container.querySelector('input')!
    const output = container.querySelector('output')!

    await act(async () => input.focus())
    vi.stubGlobal('innerHeight', 380)
    viewport.height = 380
    await act(async () => viewport.dispatchEvent(new Event('resize')))

    expect(output.dataset.open).toBe('true')
    expect(output.dataset.inset).toBe('420')
    expect(document.documentElement.style.getPropertyValue('--app-height')).toBe('800px')
  })

  it('recovers a stale dismissal without shortening the shell or losing scroll', async () => {
    await act(async () => root.render(createElement(Harness)))
    const main = container.querySelector('main')!
    const input = container.querySelector('input')!
    const output = container.querySelector('output')!

    await act(async () => input.focus())
    viewport.height = 400
    await act(async () => viewport.dispatchEvent(new Event('resize')))
    main.scrollTop = 180
    viewport.offsetTop = 60
    await act(async () => input.blur())
    await act(async () => vi.advanceTimersByTimeAsync(250))

    expect(output.dataset.open).toBe('false')
    expect(document.documentElement.style.getPropertyValue('--app-height')).toBe('800px')
    expect(main.scrollTop).toBe(180)
    expect(window.scrollBy).toHaveBeenCalled()
  })

  it('refreshes the stable baseline on a normal resize', async () => {
    await act(async () => root.render(createElement(Harness)))
    viewport.height = 650
    await act(async () => viewport.dispatchEvent(new Event('resize')))

    expect(document.documentElement.style.getPropertyValue('--app-height')).toBe('650px')
  })
})
