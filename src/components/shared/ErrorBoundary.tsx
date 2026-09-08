// src/components/shared/ErrorBoundary.tsx
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

interface Props {
  children:   ReactNode
  fallback?:  ReactNode
  onError?:   (error: Error, info: ErrorInfo) => void
}

interface State {
  error:     Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, errorInfo: null }

  static getDerivedStateFromError(error: Error): State {
    return { error, errorInfo: null }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ errorInfo: info })
    this.props.onError?.(error, info)
    // log to console in dev
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary]', error, info.componentStack)
    }
  }

  reset = () => this.setState({ error: null, errorInfo: null })

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback

      return (
        <DefaultErrorFallback
          error={this.state.error}
          onRetry={this.reset}
        />
      )
    }
    return this.props.children
  }
}

// ── Default fallback UI ───────────────────────────────────────────────────────

function DefaultErrorFallback({
  error,
  onRetry,
}: {
  error:   Error
  onRetry: () => void
}) {
  return (
    <div className="min-h-[400px] flex flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
        <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          حدث خطأ غير متوقع
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
          {import.meta.env.DEV ? error.message : 'يرجى المحاولة مرة أخرى أو إعادة تحميل الصفحة'}
        </p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          حاول مرة أخرى
        </button>
        <button
          onClick={() => window.location.href = '/mobile-shop-control/'}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <Home className="w-4 h-4" />
          الرئيسية
        </button>
      </div>
    </div>
  )
}

// ── Page-level boundary (wraps a single route) ────────────────────────────────

export function PageErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      onError={(err) => {
        // يمكن تضيف هنا Sentry أو أي error tracking
        console.error('[Page Error]', err)
      }}
    >
      {children}
    </ErrorBoundary>
  )
}

// ── App-level boundary (root — fallback كاملة) ────────────────────────────────

export function AppErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-gray-50 dark:bg-gray-950 p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <AlertTriangle className="w-10 h-10 text-red-600 dark:text-red-400" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              الشافعي ستور
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              توقف التطبيق بسبب خطأ غير متوقع
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-6 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
            إعادة تحميل التطبيق
          </button>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  )
}
