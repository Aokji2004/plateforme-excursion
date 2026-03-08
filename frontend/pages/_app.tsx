import type { AppProps } from "next/app";
import React from "react";
import "../styles/globals.css";

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
          <div className="text-center max-w-md">
            <h1 className="text-xl font-semibold text-slate-900 mb-2">
              Une erreur s&apos;est produite
            </h1>
            <p className="text-slate-600 mb-4">
              Rechargez la page ou revenez à l&apos;accueil. Si le problème continue, vérifiez que le backend est démarré (port 4000).
            </p>
            <div className="flex gap-3 justify-center">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700"
              >
                Recharger
              </button>
              <a
                href="/"
                className="px-4 py-2 rounded border border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                Accueil
              </a>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ErrorBoundary>
      <Component {...pageProps} />
    </ErrorBoundary>
  );
}


