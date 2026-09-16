import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { MobileHeader, MobileNav } from './MobileNav'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { cn } from '@/utils/cn'
import { isFormField, scrollFieldIntoView, useKeyboardInset } from '@/utils/keyboard'

export function AppLayout() {
  const { open: keyboardOpen, inset } = useKeyboardInset()

  useEffect(() => {
    document.documentElement.style.setProperty('--keyboard-inset', `${inset}px`)
    return () => {
      document.documentElement.style.removeProperty('--keyboard-inset')
    }
  }, [inset])

  useEffect(() => {
    const main = document.getElementById('main-content')
    if (!main) return

    const onFocusIn = (e: FocusEvent) => {
      if (isFormField(e.target)) scrollFieldIntoView(e.target)
    }

    const onViewportChange = () => {
      const active = document.activeElement
      if (isFormField(active) && main.contains(active)) scrollFieldIntoView(active)
    }

    main.addEventListener('focusin', onFocusIn)
    const vv = window.visualViewport
    vv?.addEventListener('resize', onViewportChange)
    vv?.addEventListener('scroll', onViewportChange)
    return () => {
      main.removeEventListener('focusin', onFocusIn)
      vv?.removeEventListener('resize', onViewportChange)
      vv?.removeEventListener('scroll', onViewportChange)
    }
  }, [])

  return (
    <div className="flex h-[100dvh] overflow-hidden">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:rounded-lg focus:bg-primary focus:text-white"
      >
        Skip to main content
      </a>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <MobileHeader />
        <main
          id="main-content"
          className={cn(
            'flex-1 min-w-0 overflow-y-auto overflow-x-hidden lg:pb-0',
            !keyboardOpen && 'pb-[calc(5rem+env(safe-area-inset-bottom,0px))]',
          )}
          style={keyboardOpen ? { paddingBottom: inset } : undefined}
        >
          <ErrorBoundary title="Something went wrong">
            <Outlet />
          </ErrorBoundary>
        </main>
        <MobileNav hidden={keyboardOpen} />
      </div>
    </div>
  )
}
