import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 max-w-2xl mx-auto my-12 bg-red-50 border border-red-200 rounded-2xl text-red-900 font-sans shadow-lg">
          <h2 className="text-lg font-bold text-red-700 mb-2">Application Error Detected</h2>
          <p className="text-xs text-red-600 mb-4 font-mono bg-red-100/60 p-3 rounded-lg border border-red-200">
            {this.state.error?.toString()}
          </p>
          {this.state.errorInfo?.componentStack && (
            <details className="text-[11px] font-mono text-red-700 whitespace-pre-wrap bg-white p-3 rounded-lg border border-red-200 overflow-x-auto max-h-64">
              <summary className="font-semibold cursor-pointer mb-1">Component Stack Trace</summary>
              {this.state.errorInfo.componentStack}
            </details>
          )}
          <div className="mt-4 flex space-x-3">
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition-colors"
            >
              Return to Dashboard
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 border border-red-300 text-red-700 rounded-lg text-xs font-semibold hover:bg-red-100 transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
