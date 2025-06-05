// src/App.tsx - Updated version
import { useState, useEffect } from 'react';
import { DeviceProvider } from './contexts/DeviceContext';
import { SignatureProvider } from './contexts/SignatureContext';
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary';
import Layout from './components/Layout/Layout';
import IdleScreen from './components/IdleScreen/IdleScreen';
import PairingScreen from './components/PairingScreen/PairingScreen';
import SignaturePad from './components/SignaturePad/SignaturePad';
import { useDevice } from './contexts/DeviceContext';
import { useWebSocket } from './hooks/useWebSocket';
import { usePWA } from './hooks/usePWA';
import { SignatureRequest } from './types/signature.types';
import { DeviceStatus } from './types/device.types';
import { ENV } from './config/environment';
import './styles/globals.css';
import './styles/variables.css';
import './styles/animations.css';

function AppContent() {
    const { deviceConfig, deviceStatus, isOnline } = useDevice();
    const { on, acknowledgeSignatureCompletion } = useWebSocket();
    const [signatureRequest, setSignatureRequest] = useState<SignatureRequest | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [connectionError, setConnectionError] = useState<string | null>(null);
    const { isInstallable, install } = usePWA();

    // Handle WebSocket events
    useEffect(() => {
        if (!deviceConfig) return;

        const unsubscribeSignatureRequest = on('signature_request', (data: SignatureRequest) => {
            console.log('Signature request received:', data.sessionId);
            setSignatureRequest(data);

            // Vibrate to notify user
            if ('vibrate' in navigator) {
                navigator.vibrate([200, 100, 200]);
            }

            // Play notification sound
            playNotificationSound();
        });

        const unsubscribeSimpleSignatureRequest = on('simple_signature_request', (data: any) => {
            console.log('Simple signature request received:', data.sessionId);

            // Convert simple signature to regular signature request format
            const signatureRequestData: SignatureRequest = {
                sessionId: data.sessionId,
                workstationId: 'simple-' + data.sessionId,
                companyId: 2,
                customerName: data.signerName,
                vehicleInfo: {
                    make: data.businessContext?.vehicleInfo?.make || '',
                    model: data.businessContext?.vehicleInfo?.model || '',
                    licensePlate: data.businessContext?.vehicleInfo?.licensePlate || ''
                },
                serviceType: data.signatureTitle,
                documentId: 'simple-' + data.sessionId,
                documentType: data.signatureType || 'Simple Signature',
                timestamp: data.timestamp || new Date().toISOString()
            };

            setSignatureRequest(signatureRequestData);

            // Vibrate to notify user
            if ('vibrate' in navigator) {
                navigator.vibrate([200, 100, 200]);
            }

            // Play notification sound
            playNotificationSound();
        });

        const unsubscribeConnection = on('connection', (data: any) => {
            console.log('Connection status:', data.status);

            if (data.status === 'connected' || data.status === 'authenticated') {
                setConnectionError(null);
            } else if (data.status === 'failed') {
                setConnectionError('Nie można nawiązać połączenia z serwerem');
            }
        });

        const unsubscribeSessionCancelled = on('session_cancelled', (data: any) => {
            console.log('Session cancelled:', data.sessionId);

            // If current session is cancelled, clear it
            if (signatureRequest && signatureRequest.sessionId === data.sessionId) {
                setSignatureRequest(null);
            }
        });

        const unsubscribeSimpleSessionCancelled = on('simple_session_cancelled', (data: any) => {
            console.log('Simple session cancelled:', data.sessionId);

            // If current session is cancelled, clear it
            if (signatureRequest && signatureRequest.sessionId === data.sessionId) {
                setSignatureRequest(null);
            }
        });

        const unsubscribeError = on('error', (data: any) => {
            console.error('WebSocket error:', data);
            setConnectionError(data.message || 'Wystąpił błąd połączenia');
        });

        const unsubscribeAuthenticated = on('authenticated', (data: any) => {
            console.log('WebSocket authenticated:', data);
            setConnectionError(null);
        });

        const unsubscribeAuthenticationFailed = on('authentication_failed', (data: any) => {
            console.error('WebSocket authentication failed:', data);
            setConnectionError('Błąd uwierzytelnienia urządzenia');
        });

        return () => {
            unsubscribeSignatureRequest();
            unsubscribeSimpleSignatureRequest();
            unsubscribeConnection();
            unsubscribeSessionCancelled();
            unsubscribeSimpleSessionCancelled();
            unsubscribeError();
            unsubscribeAuthenticated();
            unsubscribeAuthenticationFailed();
        };
    }, [on, deviceConfig, signatureRequest]);

    // Initialize app
    useEffect(() => {
        const initializeApp = async () => {
            try {
                setIsLoading(true);

                // Check if device is configured
                if (deviceConfig) {
                    console.log('Device configured:', deviceConfig.deviceId);
                }

                // App is ready
                setIsLoading(false);

            } catch (error) {
                console.error('App initialization error:', error);
                setConnectionError('Błąd inicjalizacji aplikacji');
                setIsLoading(false);
            }
        };

        initializeApp();
    }, [deviceConfig]);

    // Handle online/offline status
    useEffect(() => {
        if (!isOnline) {
            setConnectionError('Brak połączenia z internetem');
        } else if (connectionError === 'Brak połączenia z internetem') {
            setConnectionError(null);
        }
    }, [isOnline, connectionError]);

    const playNotificationSound = () => {
        try {
            const audio = new Audio('/sounds/notification.mp3');
            audio.volume = 0.5;
            audio.play().catch(error => {
                if (ENV.DEBUG_MODE) {
                    console.warn('Could not play notification sound:', error);
                }
            });
        } catch (error) {
            if (ENV.DEBUG_MODE) {
                console.warn('Notification sound not available:', error);
            }
        }
    };

    const handleSignatureComplete = () => {
        console.log('Signature completed for session:', signatureRequest?.sessionId);

        if (signatureRequest) {
            // Acknowledge completion
            acknowledgeSignatureCompletion(signatureRequest.sessionId, true);
        }

        setSignatureRequest(null);
    };

    const handleSignatureCancel = () => {
        console.log('Signature cancelled for session:', signatureRequest?.sessionId);

        if (signatureRequest) {
            // Acknowledge cancellation
            acknowledgeSignatureCompletion(signatureRequest.sessionId, false);
        }

        setSignatureRequest(null);
    };

    // Show loading screen during initialization
    if (isLoading) {
        return (
            <Layout>
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    gap: '2rem'
                }}>
                    <div style={{
                        width: '50px',
                        height: '50px',
                        border: '3px solid #f3f3f3',
                        borderTop: '3px solid #1a1a1a',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                    }} />
                    <p style={{ color: '#666', fontSize: '1.1rem' }}>
                        Inicjalizacja aplikacji...
                    </p>
                </div>
            </Layout>
        );
    }

    // Show connection error if present
    if (connectionError) {
        return (
            <Layout>
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    gap: '2rem',
                    textAlign: 'center',
                    padding: '2rem'
                }}>
                    <div style={{ fontSize: '3rem' }}>⚠️</div>
                    <h2 style={{ color: '#ef4444', marginBottom: '1rem' }}>
                        Problem z połączeniem
                    </h2>
                    <p style={{ color: '#666', fontSize: '1.1rem', maxWidth: '400px' }}>
                        {connectionError}
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            background: '#1a1a1a',
                            color: 'white',
                            border: 'none',
                            padding: '1rem 2rem',
                            borderRadius: '0.5rem',
                            fontSize: '1rem',
                            cursor: 'pointer'
                        }}
                    >
                        Spróbuj ponownie
                    </button>
                </div>
            </Layout>
        );
    }

    // Not paired yet - show pairing screen
    if (!deviceConfig || deviceStatus === DeviceStatus.DISCONNECTED) {
        return (
            <Layout>
                <PairingScreen />
            </Layout>
        );
    }

    // Has active signature request - show signature pad
    if (signatureRequest) {
        return (
            <Layout>
                <SignaturePad
                    request={signatureRequest}
                    onComplete={handleSignatureComplete}
                    onCancel={handleSignatureCancel}
                />
            </Layout>
        );
    }

    // Idle state - waiting for signature requests
    return (
        <Layout>
            <IdleScreen
                isInstallable={isInstallable}
                onInstall={install}
            />
        </Layout>
    );
}

function App() {
    return (
        <ErrorBoundary>
            <DeviceProvider>
                <SignatureProvider>
                    <AppContent />
                </SignatureProvider>
            </DeviceProvider>
        </ErrorBoundary>
    );
}

export default App;