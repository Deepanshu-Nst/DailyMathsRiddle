'use client';
import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Custom fallback UI. Receives the error. */
  fallback?: (error: Error) => React.ReactNode;
  /** Called when an error is caught. Use for Sentry / logging. */
  onError?: (error: Error, info: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * ErrorBoundary — catches React render errors and shows a fallback UI.
 *
 * Usage:
 *   <ErrorBoundary fallback={(e) => <p>Failed: {e.message}</p>}>
 *     <MyComponent />
 *   </ErrorBoundary>
 *
 * Must be a class component — React does not yet support
 * getDerivedStateFromError / componentDidCatch in function components.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] caught:', error.message, info.componentStack);
    this.props.onError?.(error, info);
  }

  handleReset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback) {
      return this.props.fallback(error);
    }

    return (
      <DefaultErrorFallback
        error={error}
        onReset={this.handleReset}
      />
    );
  }
}

/**
 * Default error fallback — minimal, non-disruptive.
 * Matches the platform's monochrome aesthetic.
 */
function DefaultErrorFallback({ error, onReset }: { error: Error; onReset: () => void }) {
  return (
    <div
      role="alert"
      style={{
        padding: '16px 20px',
        border: '1px solid rgba(239,68,68,0.2)',
        borderRadius: 8,
        background: 'rgba(239,68,68,0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <p style={{ fontSize: 13, color: 'var(--error, #ef4444)', margin: 0, fontWeight: 600 }}>
        Something went wrong
      </p>
      {process.env.NODE_ENV === 'development' && (
        <pre style={{
          fontSize: 11,
          color: 'var(--text-3)',
          margin: 0,
          whiteSpace: 'pre-wrap',
          fontFamily: 'monospace',
        }}>
          {error.message}
        </pre>
      )}
      <button
        onClick={onReset}
        style={{
          fontSize: 12,
          padding: '4px 12px',
          border: '1px solid var(--border)',
          borderRadius: 4,
          background: 'transparent',
          color: 'var(--text-2)',
          cursor: 'pointer',
          width: 'fit-content',
        }}
      >
        Try again
      </button>
    </div>
  );
}

export default ErrorBoundary;
