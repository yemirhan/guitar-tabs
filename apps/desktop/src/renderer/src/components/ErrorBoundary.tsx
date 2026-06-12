import { Component, type ReactNode, type ErrorInfo } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
  fallbackLabel?: string
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(`[ErrorBoundary${this.props.fallbackLabel ? `: ${this.props.fallbackLabel}` : ''}]`, error, info.componentStack)
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null })
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 p-6 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-danger)]/10">
            <span className="text-lg text-[var(--accent-danger)]">!</span>
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-[var(--text-primary)]">
              {this.props.fallbackLabel ?? 'Something'} failed to load
            </p>
            <p className="max-w-sm text-xs text-[var(--text-dim)]">
              {this.state.error?.message}
            </p>
          </div>
          <button
            onClick={this.handleReset}
            className="rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
          >
            Try Again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
