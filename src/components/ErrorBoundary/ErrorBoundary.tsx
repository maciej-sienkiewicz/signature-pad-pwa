// src/components/ErrorBoundary/ErrorBoundary.tsx
import { Component, ErrorInfo, ReactNode } from 'react';
import { ENV } from '../../config/environment';
import styles from './ErrorBoundary.module.css';

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

        this.state = {
            hasError: false,
            error: null,
            errorInfo: null
        };
    }

    static getDerivedStateFromError(error: Error): State {
        return {
            hasError: true,
            error,
            errorInfo: null
        };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Error caught by boundary:', error, errorInfo);

        this.setState({
            error,
            errorInfo
        });

        // Log error to monitoring service in production
        if (ENV.ENVIRONMENT === 'production') {
            this.logErrorToService(error, errorInfo);
        }
    }

    private logErrorToService = (error: Error, errorInfo: ErrorInfo) => {
        try {
            // In a real app, you would send this to your error monitoring service
            // like Sentry, LogRocket, or similar
            const errorReport = {
                message: error.message,
                stack: error.stack,
                componentStack: errorInfo.componentStack,
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent,
                url: window.location.href,
                userId: localStorage.getItem('deviceId') || 'unknown'
            };

            // Example: Send to monitoring service
            // fetch('/api/errors', {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify(errorReport)
            // });

            console.log('Error report:', errorReport);
        } catch (loggingError) {
            console.error('Failed to log error:', loggingError);
        }
    };

    private handleReload = () => {
        window.location.reload();
    };

    private handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null
        });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className={styles.container}>
                    <div className={styles.content}>
                        <div className={styles.icon}>⚠️</div>

                        <h1 className={styles.title}>
                            Wystąpił nieoczekiwany błąd
                        </h1>

                        <p className={styles.description}>
                            Aplikacja napotkała problem i nie może kontynuować.
                            Przepraszamy za niedogodności.
                        </p>

                        <div className={styles.actions}>
                            <button
                                onClick={this.handleReset}
                                className={styles.retryButton}
                            >
                                Spróbuj ponownie
                            </button>

                            <button
                                onClick={this.handleReload}
                                className={styles.reloadButton}
                            >
                                Przeładuj aplikację
                            </button>
                        </div>

                        {ENV.DEBUG_MODE && this.state.error && (
                            <details className={styles.errorDetails}>
                                <summary>Szczegóły błędu (tryb deweloperski)</summary>
                                <div className={styles.errorContent}>
                                    <h3>Error:</h3>
                                    <pre>{this.state.error.message}</pre>

                                    <h3>Stack Trace:</h3>
                                    <pre>{this.state.error.stack}</pre>

                                    {this.state.errorInfo && (
                                        <>
                                            <h3>Component Stack:</h3>
                                            <pre>{this.state.errorInfo.componentStack}</pre>
                                        </>
                                    )}
                                </div>
                            </details>
                        )}

                        <div className={styles.support}>
                            <p>
                                Jeśli problem się powtarza, skontaktuj się z administratorem systemu.
                            </p>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;