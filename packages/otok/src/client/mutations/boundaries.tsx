import { Component, type ComponentChildren } from "preact";
import type { FetcherState } from "../../shared/mutations.js";

export interface LoadingBoundaryProps {
  pending?: boolean;
  state?: FetcherState;
  fallback?: ComponentChildren;
  children: ComponentChildren;
}

/** Nested loading boundary — shows fallback while fetcher/action is pending. */
export function LoadingBoundary({ pending, state, fallback, children }: LoadingBoundaryProps) {
  const isPending = pending ?? (state !== undefined && state !== "idle");
  if (isPending) {
    return (
      <div role="status" aria-live="polite" aria-busy="true" data-otok-loading-boundary="">
        {fallback ?? <span class="otok-loading">Loading…</span>}
      </div>
    );
  }
  return <>{children}</>;
}

export interface ErrorBoundaryProps {
  error?: unknown;
  fallback?: (error: unknown) => ComponentChildren;
  children: ComponentChildren;
}

interface ErrorBoundaryState {
  error?: unknown;
}

/** Nested error boundary for island mutation failures. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {};

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: unknown): void {
    this.setState({ error });
  }

  render() {
    const error = this.props.error ?? this.state.error;
    if (error) {
      const message = error instanceof Error ? error.message : String(error);
      return (
        <div role="alert" data-otok-error-boundary="" tabIndex={-1}>
          {this.props.fallback ? this.props.fallback(error) : (
            <p class="otok-error">Something went wrong: {message}</p>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
