// src/components/PairingScreen/PairingScreen.tsx
import { useState, useEffect } from 'react';
import { DeviceAPI } from '../../api/endpoints/device';
import { useDevice } from '../../contexts/DeviceContext';
import styles from './PairingScreen.module.css';
import {DeviceConfig} from "../../types/device.types";

export default function PairingScreen() {
    const [pairingCode, setPairingCode] = useState('');
    const [deviceName, setDeviceName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [step, setStep] = useState<'name' | 'code'>('name');
    const { pairDevice } = useDevice();

    // Auto-generate device name based on current time and location
    useEffect(() => {
        const generateDeviceName = () => {
            const now = new Date();
            const timeString = now.toLocaleTimeString('pl-PL', {
                hour: '2-digit',
                minute: '2-digit'
            });
            return `Tablet-${timeString.replace(':', '')}`;
        };

        if (!deviceName) {
            setDeviceName(generateDeviceName());
        }
    }, [deviceName]);

    const handleDeviceNameSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (deviceName.trim().length >= 3) {
            setStep('code');
            setError('');
        } else {
            setError('Nazwa urządzenia musi mieć co najmniej 3 znaki');
        }
    };

    const handlePairingSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (pairingCode.length !== 6) {
            setError('Kod parowania musi mieć 6 cyfr');
            return;
        }

        setError('');
        setIsLoading(true);

        try {
            // Call the real API endpoint
            const response = await DeviceAPI.completePairing({
                code: pairingCode,
                deviceName: deviceName.trim()
            });

            if (response.success && response.data) {
                const credentials = response.data;

                // Parse device ID and other info from credentials
                const deviceConfig: DeviceConfig = {
                    deviceId: credentials.deviceId,
                    deviceToken: credentials.deviceToken,
                    tenantId: extractTenantIdFromWebSocketUrl(credentials.websocketUrl),
                    locationId: '', // Will be set later from tenant info
                    friendlyName: deviceName.trim()
                };

                await pairDevice(deviceConfig);

                console.log('Device paired successfully:', deviceConfig.deviceId);

            } else {
                const errorMessage = response.error?.message || 'Nieprawidłowy kod parowania';
                setError(errorMessage);

                // If invalid code, clear it and let user try again
                if (response.error?.code === 'INVALID_PAIRING_CODE') {
                    setPairingCode('');
                }
            }

        } catch (err) {
            console.error('Pairing error:', err);
            setError('Wystąpił błąd podczas parowania. Sprawdź połączenie sieciowe.');
        } finally {
            setIsLoading(false);
        }
    };

    const extractTenantIdFromWebSocketUrl = (wsUrl: string): string => {
        // Extract tenant ID from WebSocket URL if available
        // This is a fallback - ideally tenant ID should be in the response
        try {
            const url = new URL(wsUrl);
            const pathParts = url.pathname.split('/');
            // Look for tenant ID in URL structure
            return pathParts.find(part => part.match(/^[0-9a-f-]{36}$/)) || '';
        } catch {
            return '';
        }
    };

    const handleBack = () => {
        setStep('name');
        setError('');
    };

    if (step === 'name') {
        return (
            <div className={styles.container}>
                <div className={styles.card}>
                    <h1 className={styles.title}>Konfiguracja tabletu</h1>

                    <p className={styles.description}>
                        Wprowadź nazwę dla tego tabletu. Będzie ona widoczna w systemie CRM.
                    </p>

                    <form onSubmit={handleDeviceNameSubmit} className={styles.form}>
                        <input
                            type="text"
                            value={deviceName}
                            onChange={(e) => setDeviceName(e.target.value)}
                            placeholder="Nazwa tabletu"
                            className={styles.input}
                            maxLength={50}
                            autoComplete="off"
                            disabled={isLoading}
                            style={{ fontSize: '1.5rem', letterSpacing: 'normal' }}
                        />

                        {error && (
                            <div className={styles.error}>
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={deviceName.trim().length < 3 || isLoading}
                            className={styles.button}
                        >
                            Dalej
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <h1 className={styles.title}>Parowanie tabletu</h1>

                <p className={styles.description}>
                    Wprowadź 6-cyfrowy kod parowania wygenerowany w systemie CRM
                </p>

                <div className={styles.deviceInfo}>
                    <strong>Nazwa urządzenia:</strong> {deviceName}
                </div>

                <form onSubmit={handlePairingSubmit} className={styles.form}>
                    <input
                        type="text"
                        value={pairingCode}
                        onChange={(e) => setPairingCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000"
                        className={styles.input}
                        maxLength={6}
                        autoComplete="off"
                        disabled={isLoading}
                        autoFocus
                    />

                    {error && (
                        <div className={styles.error}>
                            {error}
                        </div>
                    )}

                    <div className={styles.buttonGroup}>
                        <button
                            type="button"
                            onClick={handleBack}
                            disabled={isLoading}
                            className={styles.backButton}
                        >
                            Wstecz
                        </button>

                        <button
                            type="submit"
                            disabled={pairingCode.length !== 6 || isLoading}
                            className={styles.button}
                        >
                            {isLoading ? 'Parowanie...' : 'Sparuj tablet'}
                        </button>
                    </div>
                </form>

                <div className={styles.helpText}>
                    <p>Potrzebujesz pomocy?</p>
                    <p>Skontaktuj się z administratorem systemu CRM, aby uzyskać kod parowania.</p>
                </div>
            </div>
        </div>
    );
}