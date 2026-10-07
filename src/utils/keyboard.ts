import { useEffect, useState } from 'react'

const KEYBOARD_THRESHOLD_PX = 120
const HEADER_OFFSET_PX = 72
const FIELD_MARGIN_PX = 16

export function getKeyboardInset(threshold = KEYBOARD_THRESHOLD_PX) {
  const viewport = window.visualViewport
  if (!viewport) return 0
  const covered = window.innerHeight - viewport.height - viewport.offsetTop
  return covered > threshold ? covered : 0
}

/** Bind the locked app shell to the live visual viewport height. */
export function syncAppHeight() {
  const viewport = window.visualViewport
  const height = Math.round(viewport?.height ?? window.innerHeight)
  document.documentElement.style.setProperty('--app-height', `${height}px`)
  return height
}

/**
 * Clear leftover document / visual-viewport pan after the keyboard dismisses.
 * iOS Safari/PWA often leaves offsetTop or scrollY stuck non-zero.
 */
export function resetStuckViewportOffset() {
  const viewport = window.visualViewport
  const offsetTop = viewport?.offsetTop ?? 0
  if (window.scrollY === 0 && offsetTop <= 0) return false
  window.scrollTo(0, 0)
  document.documentElement.scrollTop = 0
  document.body.scrollTop = 0
  return true
}

/** Sync shell height and, when the keyboard is closed, reset a stuck iOS pan. */
export function syncViewportFrame(threshold = KEYBOARD_THRESHOLD_PX) {
  const inset = getKeyboardInset(threshold)
  syncAppHeight()
  if (inset === 0) resetStuckViewportOffset()
  return inset
}

export function useKeyboardInset(threshold = KEYBOARD_THRESHOLD_PX) {
  const [inset, setInset] = useState(0)

  useEffect(() => {
    const viewport = window.visualViewport
    let wasOpen = false
    let raf = 0

    const update = () => {
      const next = syncViewportFrame(threshold)
      const open = next > 0
      if (wasOpen && !open) {
        // iOS often settles the visual viewport one frame after dismiss.
        resetStuckViewportOffset()
        window.cancelAnimationFrame(raf)
        raf = window.requestAnimationFrame(() => {
          syncAppHeight()
          resetStuckViewportOffset()
        })
      }
      wasOpen = open
      setInset(next)
    }

    update()
    viewport?.addEventListener('resize', update)
    viewport?.addEventListener('scroll', update)
    window.addEventListener('resize', update)
    return () => {
      window.cancelAnimationFrame(raf)
      viewport?.removeEventListener('resize', update)
      viewport?.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
      document.documentElement.style.removeProperty('--app-height')
    }
  }, [threshold])

  return { open: inset > 0, inset }
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
