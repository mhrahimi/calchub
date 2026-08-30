import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { MobileHeader, MobileNav } from './MobileNav'
import { ErrorBoundary } from '@/components/ErrorBoundary'

export function AppLayout() {
  return (
    <div className="flex min-h-[100dvh] overflow-x-hidden">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:rounded-lg focus:bg-primary focus:text-white"
      >
        Skip to main content
      </a>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <MobileHeader />
        <main id="main-content" className="flex-1 overflow-y-auto overflow-x-hidden pb-20 lg:pb-0">
          <ErrorBoundary title="Something went wrong">
            <Outlet />
          </ErrorBoundary>
        </main>
        <MobileNav />
      </div>
    </div>
  )
}
