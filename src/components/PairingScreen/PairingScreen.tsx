// src/components/PairingScreen/PairingScreen.tsx - Poprawiona wersja
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
    const [step, setStep] = useState<'name' | 'code' | 'dev'>('name');
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

    // DODANE: Development mode - bezpośrednie parowanie z test tabletem
    const handleDevMode = async () => {
        setIsLoading(true);
        setError('');

        try {
            // Pobierz dane test tabletu z backendu
            const response = await fetch('http://localhost:8080/api/dev/create-test-tablet', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    deviceName: deviceName.trim()
                })
            });

            if (!response.ok) {
                throw new Error('Failed to create test tablet');
            }

            const testTabletData = await response.json();

            const deviceConfig: DeviceConfig = {
                deviceId: testTabletData.deviceId,
                deviceToken: testTabletData.deviceToken,
                tenantId: testTabletData.tenantId,
                locationId: testTabletData.locationId,
                friendlyName: deviceName.trim()
            };

            await pairDevice(deviceConfig);
            console.log('Test tablet paired successfully:', deviceConfig.deviceId);

        } catch (err) {
            console.error('Dev mode pairing error:', err);
            setError('Błąd podczas parowania w trybie dev. Sprawdź czy backend działa.');
        } finally {
            setIsLoading(false);
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

    // DODANE: Development mode screen
    if (step === 'dev') {
        return (
            <div className={styles.container}>
                <div className={styles.card}>
                    <h1 className={styles.title}>Tryb deweloperski</h1>

                    <p className={styles.description}>
                        Automatyczne parowanie z test tabletem dla celów rozwoju
                    </p>

                    <div className={styles.deviceInfo}>
                        <strong>Nazwa urządzenia:</strong> {deviceName}
                    </div>

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
                            type="button"
                            onClick={handleDevMode}
                            disabled={isLoading}
                            className={styles.button}
                        >
                            {isLoading ? 'Łączenie...' : 'Połącz z test tabletem'}
                        </button>
                    </div>

                    <div className={styles.helpText}>
                        <p><strong>Tryb deweloperski</strong></p>
                        <p>Automatycznie tworzy test tablet w bazie danych i łączy się z nim.</p>
                        <p>Użyj tego tylko do testów lokalnych!</p>
                    </div>
                </div>
            </div>
        );
    }

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

                        <div className={styles.buttonGroup}>
                            <button
                                type="submit"
                                disabled={deviceName.trim().length < 3 || isLoading}
                                className={styles.button}
                            >
                                Dalej
                            </button>

                            {/* DODANE: Przycisk trybu deweloperskiego */}
                            {process.env.REACT_APP_ENVIRONMENT === 'development' && (
                                <button
                                    type="button"
                                    onClick={() => setStep('dev')}
                                    disabled={deviceName.trim().length < 3 || isLoading}
                                    className={styles.backButton}
                                    style={{ backgroundColor: '#10b981' }}
                                >
                                    Tryb Dev
                                </button>
                            )}
                        </div>
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

                    {/* DODANE: Info o trybie dev */}
                    {process.env.REACT_APP_ENVIRONMENT === 'development' && (
                        <>
                            <br />
                            <p><strong>Tryb deweloperski:</strong></p>
                            <p>Możesz też użyć API:</p>
                            <code style={{ fontSize: '0.8rem', background: '#f0f0f0', padding: '0.2rem' }}>
                                POST /api/dev/create-pairing-code
                            </code>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}