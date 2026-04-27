import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error, errorInfo: null };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        this.setState({ errorInfo });
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-screen bg-[#0b1326] flex items-center justify-center p-4">
                    <div className="bg-surface rounded-2xl border border-white/[0.08] p-8 max-w-4xl w-full text-center">
                        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
                        <p className="text-gray-400 mb-6">
                            An unexpected error occurred. Please try again.
                        </p>
                        {this.state.error && (
                            <details className="text-left mb-6" open>
                                <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-400 font-bold mb-2">
                                    Technical details
                                </summary>
                                <div className="bg-surface-3 rounded-lg p-4 overflow-auto max-h-[500px] border border-white/[0.08]">
                                    <p className="text-red-400 font-mono text-sm mb-4 font-bold">
                                        {this.state.error.toString()}
                                    </p>
                                    {this.state.errorInfo && (
                                        <div className="text-gray-500 font-mono text-xs whitespace-pre-wrap">
                                            {this.state.errorInfo.componentStack}
                                        </div>
                                    )}
                                </div>
                            </details>
                        )}
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={this.handleRetry}
                                className="px-6 py-2.5 bg-[#0f766e] hover:bg-[#0f766e] text-white rounded-xl font-medium transition-colors"
                            >
                                Try Again
                            </button>
                            <button
                                onClick={() => window.location.reload()}
                                className="px-6 py-2.5 bg-surface-2 hover:bg-white/[0.06] text-white rounded-xl font-medium transition-colors"
                            >
                                Reload Page
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
