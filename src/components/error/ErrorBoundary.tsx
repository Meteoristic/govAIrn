import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-4">
          <div className="max-w-md text-center">
            <h1 className="text-3xl font-bold text-indigo mb-4">Something went wrong</h1>
            <p className="text-silver mb-6">
              We're experiencing some technical difficulties. The application is still loading its components.
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-indigo hover:bg-indigo/90 text-white rounded-md"
            >
              Reload Page
            </button>
            {this.state.error && (
              <div className="mt-4 p-3 bg-black/50 rounded-md text-left text-sm">
                <p className="text-red-400 font-medium">Error: {this.state.error.message}</p>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
