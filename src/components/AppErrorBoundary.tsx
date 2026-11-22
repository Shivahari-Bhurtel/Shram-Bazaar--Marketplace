import { Component, type ErrorInfo, type ReactNode } from "react"

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Shram Bazar page failed to render", error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-[#FAF8F5] px-5 py-12 text-stone-800">
          <section role="alert" className="w-full max-w-xl rounded-2xl border border-[#E1DAD3] bg-white p-7 shadow-[0_18px_48px_rgba(83,52,33,0.12)] sm:p-9">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#80502F]">Page error</p>
            <h1 className="mt-2 font-display text-2xl font-semibold text-stone-950">This page could not be opened</h1>
            <p className="mt-3 text-sm leading-6 text-stone-600">Refresh to try again. If it happens again, share the error below so we can identify the exact cause.</p>
            <details className="mt-5 rounded-xl bg-[#F7F3EE] p-3 text-sm text-stone-700">
              <summary className="cursor-pointer font-semibold">Error details</summary>
              <pre className="mt-2 overflow-auto whitespace-pre-wrap break-words font-mono text-xs leading-5">{this.state.error.message}</pre>
            </details>
            <button type="button" onClick={() => window.location.reload()} className="mt-6 min-h-11 rounded-xl bg-[#80502F] px-5 text-sm font-semibold text-white transition hover:bg-[#553421] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#80502F]">Refresh page</button>
          </section>
        </main>
      )
    }

    return this.props.children
  }
}
