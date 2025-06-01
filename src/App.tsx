import React, { useState, useEffect } from 'react';
import { DeviceProvider } from './contexts/DeviceContext';
import { SignatureProvider } from './contexts/SignatureContext';
import Layout from './components/Layout/Layout';
import IdleScreen from './components/IdleScreen/IdleScreen';
import PairingScreen from './components/PairingScreen/PairingScreen';
import SignaturePad from './components/SignaturePad/SignaturePad';
import { useDevice } from './contexts/DeviceContext';
import { useWebSocket } from './hooks/useWebSocket';
import { usePWA } from './hooks/usePWA';
import { SignatureRequest } from './types/signature.types';
import './styles/globals.css';
import './styles/variables.css';
import './styles/animations.css';

function AppContent() {
    const { deviceConfig, deviceStatus } = useDevice();
    const { on } = useWebSocket();
    const [signatureRequest, setSignatureRequest] = useState<SignatureRequest | null>(null);
    const { isInstallable, install } = usePWA();

    useEffect(() => {
        const unsubscribe = on('signature_request', (data: SignatureRequest) => {
            setSignatureRequest(data);

            // Vibrate to notify
            if ('vibrate' in navigator) {
                navigator.vibrate([200, 100, 200]);
            }

            // Play notification sound
            const audio = new Audio('/sounds/notification.mp3');
            audio.play().catch(console.error);
        });

        return unsubscribe;
    }, [on]);

    // Not paired yet
    if (!deviceConfig) {
        return (
            <Layout>
                <PairingScreen />
            </Layout>
        );
    }

    // Has active signature request
    if (signatureRequest) {
        return (
            <Layout>
                <SignaturePad
                    request={signatureRequest}
                    onComplete={() => setSignatureRequest(null)}
                    onCancel={() => setSignatureRequest(null)}
                />
            </Layout>
        );
    }

    // Idle state
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
        <DeviceProvider>
            <SignatureProvider>
                <AppContent />
            </SignatureProvider>
        </DeviceProvider>
    );
}

export default App;