import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@/components/ui/Button'

interface ErrorBoundaryProps {
  children: ReactNode
  title?: string
}

interface ErrorBoundaryState {
  hasError: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (import.meta.env.DEV) {
      console.error('[CalcHub]', error, info.componentStack)
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-4" role="alert">
          <h2 className="text-xl font-semibold text-text-primary">
            {this.props.title ?? 'Something broke on this screen'}
          </h2>
          <p className="text-text-secondary text-sm leading-relaxed">
            Reload the page, or go back and try again.
          </p>
          <Button onClick={this.handleRetry}>Try again</Button>
        </div>
      )
    }
    return this.props.children
  }
}
