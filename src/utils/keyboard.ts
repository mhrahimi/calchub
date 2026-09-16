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

export function useKeyboardInset(threshold = KEYBOARD_THRESHOLD_PX) {
  const [inset, setInset] = useState(0)

  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return

    const update = () => {
      setInset(getKeyboardInset(threshold))
    }

    update()
    viewport.addEventListener('resize', update)
    viewport.addEventListener('scroll', update)
    window.addEventListener('resize', update)
    return () => {
      viewport.removeEventListener('resize', update)
      viewport.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
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
