import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    handleReset = () => {
        // Clear all storage which might be causing the crash due to corruption
        localStorage.clear();
        sessionStorage.clear();

        // Clear caches if available
        if ('caches' in window) {
            caches.keys().then((names) => {
                names.forEach((name) => {
                    caches.delete(name);
                });
            });
        }

        // Force reload
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100vh',
                    backgroundColor: '#0f172a',
                    color: '#f8fafc',
                    padding: '20px',
                    textAlign: 'center'
                }}>
                    <h2 style={{ marginBottom: '16px' }}>Something went wrong</h2>
                    <p style={{ color: '#94a3b8', marginBottom: '24px', maxWidth: '400px' }}>
                        The application encountered an error. This usually happens due to corrupted local data.
                    </p>
                    <div style={{
                        background: 'rgba(255, 50, 50, 0.1)',
                        padding: '10px',
                        borderRadius: '8px',
                        fontFamily: 'monospace',
                        marginBottom: '24px',
                        fontSize: '12px',
                        maxWidth: '100%',
                        overflow: 'auto'
                    }}>
                        {this.state.error && this.state.error.toString()}
                    </div>
                    <button
                        onClick={this.handleReset}
                        style={{
                            backgroundColor: '#6366f1',
                            color: 'white',
                            border: 'none',
                            padding: '12px 24px',
                            borderRadius: '12px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            fontSize: '1rem'
                        }}
                    >
                        Reset Application
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
