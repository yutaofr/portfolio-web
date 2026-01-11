import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #ef4444', borderRadius: '8px', margin: '20px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Display Error</h2>
            <p style={{ fontSize: '0.875rem' }}>
                {this.state.error?.message || "An unexpected error occurred."}
            </p>
            <button 
                onClick={() => window.location.reload()}
                style={{ marginTop: '1rem', textDecoration: 'underline', cursor: 'pointer', background: 'none', border: 'none', color: '#b91c1c' }}
            >
                Reload App
            </button>
        </div>
      );
    }

    return this.props.children;
  }
}
