import { useEffect, useState } from 'react'

const KEYBOARD_THRESHOLD_PX = 120
const HEADER_OFFSET_PX = 72
const FIELD_MARGIN_PX = 16
const VIEWPORT_SETTLE_MS = 180
const STALE_OFFSET_PX = 1

export interface KeyboardViewportMetrics {
  open: boolean
  inset: number
}

function getVisualViewportHeight() {
  const viewport = window.visualViewport
  return Math.round(viewport?.height ?? window.innerHeight)
}

/**
 * Measure the keyboard against the stable height captured before it opened.
 * This intentionally does not use live innerHeight: iOS Chrome shrinks it
 * alongside visualViewport.height, which otherwise makes an open keyboard
 * look closed.
 */
export function getKeyboardMetrics(
  baselineHeight: number,
  threshold = KEYBOARD_THRESHOLD_PX,
): KeyboardViewportMetrics {
  const viewport = window.visualViewport
  if (!viewport) return { open: false, inset: 0 }

  const heightLoss = Math.max(0, baselineHeight - viewport.height)
  const open = heightLoss > threshold
  const inset = open
    ? Math.max(0, baselineHeight - viewport.height - viewport.offsetTop)
    : 0
  return { open, inset }
}

/** Keep the shell at its pre-keyboard height. */
export function setAppHeight(height: number) {
  const rounded = Math.round(height)
  activeBaselineHeight = rounded
  document.documentElement.style.setProperty('--app-height', `${rounded}px`)
  return rounded
}

let activeBaselineHeight = 0

export function getKeyboardInset(threshold = KEYBOARD_THRESHOLD_PX) {
  const baseline = activeBaselineHeight || getVisualViewportHeight()
  return getKeyboardMetrics(baseline, threshold).inset
}

function resetDocumentScroll() {
  window.scrollTo(0, 0)
  document.documentElement.scrollTop = 0
  document.body.scrollTop = 0
}

function hasStaleViewport(
  baselineHeight: number,
  threshold = KEYBOARD_THRESHOLD_PX,
) {
  const viewport = window.visualViewport
  const heightDeficit = viewport
    ? baselineHeight - viewport.height
    : baselineHeight - window.innerHeight
  return (
    heightDeficit > threshold ||
    (viewport?.offsetTop ?? 0) > STALE_OFFSET_PX ||
    window.scrollY !== 0
  )
}

/**
 * Force WebKit to remeasure a full-height root only when keyboard metrics are
 * still stale. The synchronous display flip is a targeted workaround for the
 * iOS standalone-PWA viewport bug.
 */
export function recoverStuckViewport(
  baselineHeight: number,
  threshold = KEYBOARD_THRESHOLD_PX,
) {
  if (!hasStaleViewport(baselineHeight, threshold)) return false

  const main = document.getElementById('main-content')
  const scrollTop = main?.scrollTop ?? 0
  const root = document.getElementById('root')

  resetDocumentScroll()
  if (root) {
    const display = root.style.display
    root.style.display = 'none'
    void root.offsetHeight
    root.style.display = display
  }

  // A one-pixel jiggle prompts WebKit to discard a stale visual offset.
  window.scrollBy(0, 1)
  window.scrollBy(0, -1)
  resetDocumentScroll()
  if (main) main.scrollTop = scrollTop
  return true
}

function clearAppHeight() {
  activeBaselineHeight = 0
  document.documentElement.style.removeProperty('--app-height')
}

export function useKeyboardInset(threshold = KEYBOARD_THRESHOLD_PX) {
  const [metrics, setMetrics] = useState<KeyboardViewportMetrics>({
    open: false,
    inset: 0,
  })

  useEffect(() => {
    const viewport = window.visualViewport
    let baselineHeight = setAppHeight(getVisualViewportHeight())
    let keyboardWasOpen = false
    let settleTimer = 0
    let raf = 0

    const cancelRecovery = () => {
      window.clearTimeout(settleTimer)
      window.cancelAnimationFrame(raf)
    }

    const refreshStableBaseline = () => {
      baselineHeight = setAppHeight(getVisualViewportHeight())
    }

    const finishRecovery = () => {
      recoverStuckViewport(baselineHeight, threshold)
      setAppHeight(baselineHeight)
      // Do not accept a delayed, still-short viewport as a new baseline.
      keyboardWasOpen = hasStaleViewport(baselineHeight, threshold)
    }

    const scheduleRecovery = () => {
      cancelRecovery()
      resetDocumentScroll()
      raf = window.requestAnimationFrame(() => {
        resetDocumentScroll()
        settleTimer = window.setTimeout(finishRecovery, VIEWPORT_SETTLE_MS)
      })
    }

    const update = () => {
      const next = getKeyboardMetrics(baselineHeight, threshold)
      const fieldActive = isFormField(document.activeElement)

      if (fieldActive && next.open) {
        keyboardWasOpen = true
        setAppHeight(baselineHeight)
        setMetrics(next)
        return
      }

      setMetrics({ open: false, inset: 0 })

      if (keyboardWasOpen) {
        scheduleRecovery()
      } else if (!fieldActive) {
        refreshStableBaseline()
      }
    }

    const onFocusIn = (event: FocusEvent) => {
      if (!isFormField(event.target)) return
      cancelRecovery()

      const currentHeight = getVisualViewportHeight()
      // Focus arrives before keyboard animation. Do not accept a suspiciously
      // short value left behind by a previous WebKit keyboard session.
      if (
        currentHeight >= baselineHeight - threshold ||
        currentHeight > baselineHeight
      ) {
        baselineHeight = setAppHeight(currentHeight)
      }
      update()
    }

    const onFocusOut = (event: FocusEvent) => {
      if (!isFormField(event.target)) return
      setMetrics({ open: false, inset: 0 })
      if (keyboardWasOpen || hasStaleViewport(baselineHeight, threshold)) {
        scheduleRecovery()
      }
    }

    const onWindowResize = () => {
      if (!keyboardWasOpen && !isFormField(document.activeElement)) {
        refreshStableBaseline()
        setMetrics({ open: false, inset: 0 })
        return
      }
      update()
    }

    document.addEventListener('focusin', onFocusIn)
    document.addEventListener('focusout', onFocusOut)
    viewport?.addEventListener('resize', update)
    viewport?.addEventListener('scroll', update)
    window.addEventListener('resize', onWindowResize)
    return () => {
      cancelRecovery()
      document.removeEventListener('focusin', onFocusIn)
      document.removeEventListener('focusout', onFocusOut)
      viewport?.removeEventListener('resize', update)
      viewport?.removeEventListener('scroll', update)
      window.removeEventListener('resize', onWindowResize)
      clearAppHeight()
    }
  }, [threshold])

  return metrics
}

export function useKeyboardOpen(threshold = KEYBOARD_THRESHOLD_PX) {
  return useKeyboardInset(threshold).open
}

export function isFormField(el: EventTarget | null): el is HTMLElement {
  return (
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    el instanceof HTMLSelectElement
  )
}

let alignTimer = 0

export function scrollFieldIntoView(el: HTMLElement) {
  const align = () => {
    // Avoid fighting the dismiss reset while the keyboard is closed.
    if (getKeyboardInset() === 0) return

    const main = document.getElementById('main-content')
    const vv = window.visualViewport
    const visibleTop = vv?.offsetTop ?? 0
    const visibleBottom = vv ? vv.offsetTop + vv.height : window.innerHeight
    const rect = el.getBoundingClientRect()
    const inView =
      rect.top >= visibleTop + HEADER_OFFSET_PX &&
      rect.bottom <= visibleBottom - FIELD_MARGIN_PX

    if (inView) return

    const visibleHeight = visibleBottom - visibleTop
    const targetTop = visibleTop + HEADER_OFFSET_PX + FIELD_MARGIN_PX
    const available = visibleBottom - FIELD_MARGIN_PX - targetTop
    const delta =
      available > rect.height
        ? rect.top - visibleTop - visibleHeight / 2 + rect.height / 2
        : rect.top - targetTop

    if (main) {
      main.scrollBy({ top: delta, behavior: 'smooth' })
    } else {
      el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' })
    }
  }

  align()
  window.clearTimeout(alignTimer)
  alignTimer = window.setTimeout(align, 300)
}
