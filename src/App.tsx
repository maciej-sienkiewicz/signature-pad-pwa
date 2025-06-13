// src/App.tsx - POPRAWIONA WERSJA (Fixed TypeScript errors)
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
import ProtocolSignaturePad from './components/ProtocolSignaturePad/ProtocolSignaturePad';
import { ProtocolSignatureRequest } from './types/protocol-signature.types';
import { tabletWebSocketHandler } from "./services/TabletWebSocketHandler";

function AppContent() {
    const { deviceConfig, deviceStatus, isOnline } = useDevice();
    const { on, acknowledgeSignatureCompletion } = useWebSocket();
    const [signatureRequest, setSignatureRequest] = useState<SignatureRequest | null>(null);
    const [protocolSignatureRequest, setProtocolSignatureRequest] = useState<ProtocolSignatureRequest | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [connectionError, setConnectionError] = useState<string | null>(null);
    const { isInstallable, install } = usePWA();

    useEffect(() => {
        console.log('App state changed:', {
            deviceConfig: deviceConfig ? 'present' : 'null',
            deviceStatus,
            isOnline,
            signatureRequest: signatureRequest ? signatureRequest.sessionId : 'null',
            protocolSignatureRequest: protocolSignatureRequest ? protocolSignatureRequest.sessionId : 'null',
            isLoading,
            connectionError
        });
    }, [deviceConfig, deviceStatus, isOnline, signatureRequest, protocolSignatureRequest, isLoading, connectionError]);

    // Handle WebSocket events
    useEffect(() => {
        if (!deviceConfig) {
            console.log('No device config, skipping WebSocket event handlers');
            return;
        }

        console.log('Setting up WebSocket event handlers for device:', deviceConfig.deviceId);

        const unsubscribeDocumentSignatureRequest = on('document_signature_request', (data: ProtocolSignatureRequest) => {
            console.log('✅ Document signature request received in App:', {
                sessionId: data.sessionId,
                documentTitle: data.documentTitle,
                signerName: data.signerName,
                documentType: data.documentType,
                protocolId: data.businessContext?.protocolId
            });

            setProtocolSignatureRequest(data);

            // Vibrate to notify user
            if ('vibrate' in navigator) {
                navigator.vibrate([200, 100, 200, 100, 200]);
            }

            // Play notification sound
            playNotificationSound();
        });

        // NOWY HANDLER dla anulowania sesji protokołów
        const unsubscribeDocumentSessionCancelled = on('document_session_cancelled', (data: any) => {
            console.log('✅ Document session cancelled received in App:', data.sessionId);

            // If current protocol session is cancelled, clear it
            if (protocolSignatureRequest && protocolSignatureRequest.sessionId === data.sessionId) {
                setProtocolSignatureRequest(null);
            }
        });

        const unsubscribeSignatureRequest = on('signature_request', (data: SignatureRequest) => {
            console.log('✅ Signature request received in App:', {
                sessionId: data.sessionId,
                customerName: data.customerName,
                serviceType: data.serviceType,
                vehicleInfo: data.vehicleInfo
            });

            setSignatureRequest(data);

            // Vibrate to notify user
            if ('vibrate' in navigator) {
                navigator.vibrate([200, 100, 200]);
            }

            // Play notification sound
            playNotificationSound();
        });

        const unsubscribeSimpleSignatureRequest = on('simple_signature_request', (data: any) => {
            console.log('✅ Simple signature request received in App:', data);

            // Convert simple signature to regular signature request format
            const signatureRequestData: SignatureRequest = {
                sessionId: data.sessionId,
                workstationId: 'simple-' + data.sessionId,
                companyId: data.companyId || deviceConfig.companyId,
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
            console.log('✅ Connection status received in App:', data.status);

            if (data.status === 'connected' || data.status === 'authenticated') {
                setConnectionError(null);
            } else if (data.status === 'failed') {
                setConnectionError('Nie można nawiązać połączenia z serwerem');
            }
        });

        const unsubscribeSessionCancelled = on('session_cancelled', (data: any) => {
            console.log('✅ Session cancelled received in App:', data.sessionId);

            // If current session is cancelled, clear it
            if (signatureRequest && signatureRequest.sessionId === data.sessionId) {
                setSignatureRequest(null);
            }
        });

        const unsubscribeSimpleSessionCancelled = on('simple_session_cancelled', (data: any) => {
            console.log('✅ Simple session cancelled received in App:', data.sessionId);

            // If current session is cancelled, clear it
            if (signatureRequest && signatureRequest.sessionId === data.sessionId) {
                setSignatureRequest(null);
            }
        });

        const unsubscribeError = on('error', (data: any) => {
            console.error('❌ WebSocket error received in App:', data);
            setConnectionError(data.message || 'Wystąpił błąd połączenia');
        });

        const unsubscribeAuthenticated = on('authenticated', (data: any) => {
            console.log('✅ WebSocket authenticated in App:', data);
            setConnectionError(null);
        });

        const unsubscribeAuthenticationFailed = on('authentication_failed', (data: any) => {
            console.error('❌ WebSocket authentication failed in App:', data);
            setConnectionError('Błąd uwierzytelnienia urządzenia');
        });

        // POPRAWKA: Dodaj listener na connection_status_changed
        const unsubscribeConnectionStatusChanged = on('connection_status_changed', (data: any) => {
            console.log('🔄 Connection status changed in App:', data);

            switch (data.status) {
                case 'connected':
                case 'authenticated':
                    setConnectionError(null);
                    break;
                case 'error':
                    setConnectionError('Błąd połączenia WebSocket');
                    break;
                case 'disconnected':
                    if (!isOnline) {
                        setConnectionError('Brak połączenia z internetem');
                    } else {
                        setConnectionError('Połączenie zostało przerwane');
                    }
                    break;
            }
        });

        // POPRAWKA: Dodaj ogólny listener do debugowania wszystkich zdarzeń
        if (ENV.DEBUG_MODE) {
            const debugUnsubscribers: (() => void)[] = [];

            ['connection', 'error', 'heartbeat', 'admin_message'].forEach(eventType => {
                const unsubscribe = on(eventType, (data: any) => {
                    console.log(`🐛 DEBUG - Event '${eventType}':`, data);
                });
                debugUnsubscribers.push(unsubscribe);
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
                unsubscribeConnectionStatusChanged();
                unsubscribeDocumentSignatureRequest();
                unsubscribeDocumentSessionCancelled();
                debugUnsubscribers.forEach(unsub => unsub());
            };
        }

        return () => {
            unsubscribeSignatureRequest();
            unsubscribeSimpleSignatureRequest();
            unsubscribeConnection();
            unsubscribeSessionCancelled();
            unsubscribeSimpleSessionCancelled();
            unsubscribeError();
            unsubscribeAuthenticated();
            unsubscribeAuthenticationFailed();
            unsubscribeConnectionStatusChanged();
            unsubscribeDocumentSignatureRequest();
            unsubscribeDocumentSessionCancelled();
        };
    }, [on, deviceConfig, signatureRequest, protocolSignatureRequest]);

    const handleProtocolSignatureComplete = () => {
        console.log('🎯 Protocol signature completed for session:', protocolSignatureRequest?.sessionId);

        if (protocolSignatureRequest) {
            // Acknowledge completion using the new method for documents
            tabletWebSocketHandler.acknowledgeDocumentSignatureCompletion(protocolSignatureRequest.sessionId, true);
        }

        setProtocolSignatureRequest(null);
    };

    const handleProtocolSignatureCancel = () => {
        console.log('❌ Protocol signature cancelled for session:', protocolSignatureRequest?.sessionId);

        if (protocolSignatureRequest) {
            // Acknowledge cancellation using the new method for documents
            tabletWebSocketHandler.acknowledgeDocumentSignatureCompletion(protocolSignatureRequest.sessionId, false);
        }

        setProtocolSignatureRequest(null);
    };

    // Initialize app
    useEffect(() => {
        const initializeApp = async () => {
            try {
                console.log('🚀 Initializing app...');
                setIsLoading(true);

                // Check if device is configured
                if (deviceConfig) {
                    console.log('✅ Device configured:', deviceConfig.deviceId);
                } else {
                    console.log('⚠️ No device configuration found');
                }

                // Add a small delay to ensure WebSocket handlers are ready
                await new Promise(resolve => setTimeout(resolve, 1000));

                // App is ready
                setIsLoading(false);
                console.log('✅ App initialization complete');

            } catch (error) {
                console.error('❌ App initialization error:', error);
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
        console.log('🎯 Signature completed for session:', signatureRequest?.sessionId);

        if (signatureRequest) {
            // Acknowledge completion
            acknowledgeSignatureCompletion(signatureRequest.sessionId, true);
        }

        setSignatureRequest(null);
    };

    const handleSignatureCancel = () => {
        console.log('❌ Signature cancelled for session:', signatureRequest?.sessionId);

        if (signatureRequest) {
            // Acknowledge cancellation
            acknowledgeSignatureCompletion(signatureRequest.sessionId, false);
        }

        setSignatureRequest(null);
    };

    // POPRAWKA: Najpierw sprawdź protokoły, potem zwykłe podpisy
    // Ma to znaczenie dla TypeScript i logiki aplikacji
    if (protocolSignatureRequest) {
        console.log('📋 Showing ProtocolSignaturePad for request:', protocolSignatureRequest);
        return (
            <Layout>
                <ProtocolSignaturePad
                    request={protocolSignatureRequest}
                    onComplete={handleProtocolSignatureComplete}
                    onCancel={handleProtocolSignatureCancel}
                />
            </Layout>
        );
    }

    // Has active signature request - show signature pad
    if (signatureRequest) {
        console.log('📝 Showing SignaturePad for request:', signatureRequest);
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

                    {ENV.DEBUG_MODE && (
                        <div style={{
                            marginTop: '2rem',
                            padding: '1rem',
                            background: '#f3f4f6',
                            borderRadius: '0.5rem',
                            fontSize: '0.875rem',
                            color: '#374151',
                            maxWidth: '500px'
                        }}>
                            <strong>Debug info:</strong><br />
                            Device Status: {deviceStatus}<br />
                            Online: {isOnline ? 'Yes' : 'No'}<br />
                            Device ID: {deviceConfig?.deviceId || 'None'}<br />
                            Company ID: {deviceConfig?.companyId || 'None'}<br />
                        </div>
                    )}
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

    // Idle state - waiting for signature requests
    console.log('⏳ Showing IdleScreen - waiting for signature requests');
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