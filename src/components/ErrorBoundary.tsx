import React from "react";

type Props = {
  children: React.ReactNode;
  title?: string;
};

type State = {
  hasError: boolean;
  error?: unknown;
};

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: unknown) {
    // eslint-disable-next-line no-console
    console.error("App runtime error:", error);
  }

  render() {
    if (this.state.hasError) {
      const message =
        this.state.error instanceof Error
          ? this.state.error.message
          : String(this.state.error ?? "Unknown error");

      return (
        <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
          <section className="max-w-xl w-full rounded-xl border border-border bg-card p-6">
            <h1 className="text-xl font-semibold">Something went wrong</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              The page failed to load. Refresh the page—if it keeps happening, we’ll need to fix the underlying error.
            </p>
            <pre className="mt-4 text-xs whitespace-pre-wrap rounded-md bg-muted p-3 border border-border">
              {message}
            </pre>
            <button
              className="mt-4 inline-flex items-center justify-center rounded-md border border-border bg-background px-4 py-2 text-sm"
              onClick={() => window.location.reload()}
            >
              Refresh
            </button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
