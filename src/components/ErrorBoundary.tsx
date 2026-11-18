import React from 'react';
import { Link } from 'react-router-dom';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || 'An unexpected error occurred.',
    };
  }

  render() {
    if (this.state.hasError) {
      let displayMsg = this.state.message;
      try {
        const parsed = JSON.parse(this.state.message);
        if (parsed?.error) {
          displayMsg = `Database permission or network error (${parsed.operationType} on ${parsed.path || 'resource'}): ${parsed.error}`;
        }
      } catch {
        // Keep plain message
      }

      return (
        <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
          <div className="max-w-md w-full rounded-2xl border border-line bg-white p-8 text-center">
            <p className="text-xs font-data uppercase tracking-widest text-signal mb-2">
              Something went wrong
            </p>
            <h1 className="font-display font-bold text-2xl mb-3">
              We hit a temporary issue
            </h1>
            <p className="text-sm text-steel mb-6 break-words">{displayMsg}</p>
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="bg-ink text-paper px-5 py-2.5 rounded-full text-sm font-medium hover:bg-signal transition-colors"
              >
                Reload Page
              </button>
              <Link
                to="/"
                onClick={() => this.setState({ hasError: false, message: '' })}
                className="border border-line px-5 py-2.5 rounded-full text-sm font-medium hover:border-signal hover:text-signal transition-colors"
              >
                Return Home
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
