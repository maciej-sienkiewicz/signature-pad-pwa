// src/components/PairingScreen/PairingScreen.tsx - POPRAWIONA WERSJA
import { useState, useEffect } from 'react';
import { DeviceAPI } from '../../api/endpoints/device';
import { useDevice } from '../../contexts/DeviceContext';
import styles from './PairingScreen.module.css';
import { DeviceConfig } from "../../types/device.types";

export default function PairingScreen() {
    const [pairingCode, setPairingCode] = useState('');
    const [deviceName, setDeviceName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [step, setStep] = useState<'name' | 'code' | 'generate'>('name');
    const [generatedCode, setGeneratedCode] = useState('');
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
            if (process.env.REACT_APP_ENVIRONMENT === 'development') {
                setStep('generate');
            } else {
                setStep('code');
            }
            setError('');
        } else {
            setError('Nazwa urządzenia musi mieć co najmniej 3 znaki');
        }
    };

    // Nowa funkcja - generowanie kodu parowania dla dev
    const handleGenerateCode = async () => {
        setIsLoading(true);
        setError('');

        try {
            // Używamy prawdziwego endpointu do generowania kodu
            const response = await DeviceAPI.initiateRegistration({
                tenantId: '12345678-0000-0000-0000-000000000001', // Test tenant ID
                locationId: '12345678-0000-0000-0000-000000000002', // Test location ID
                workstationId: '12345678-0000-0000-0000-000000000003' // Optional workstation ID
            });

            if (response.success && response.data) {
                setGeneratedCode(response.data.code);
                setPairingCode(response.data.code);
                setStep('code');
                console.log('Generated pairing code:', response.data.code);
            } else {
                setError(response.error?.message || 'Błąd podczas generowania kodu');
            }
        } catch (err) {
            console.error('Error generating pairing code:', err);
            setError('Błąd podczas generowania kodu parowania');
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

                // Create device config from credentials
                const deviceConfig: DeviceConfig = {
                    deviceId: credentials.deviceId,
                    deviceToken: credentials.deviceToken,
                    tenantId: extractTenantIdFromWebSocketUrl(credentials.websocketUrl) || '12345678-0000-0000-0000-000000000001',
                    locationId: '12345678-0000-0000-0000-000000000002', // Default for dev
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

    const extractTenantIdFromWebSocketUrl = (wsUrl: string): string | null => {
        try {
            const url = new URL(wsUrl);
            const pathParts = url.pathname.split('/');
            return pathParts.find(part => part.match(/^[0-9a-f-]{36}$/)) || null;
        } catch {
            return null;
        }
    };

    const handleBack = () => {
        if (step === 'generate') {
            setStep('name');
        } else {
            setStep('name');
        }
        setError('');
        setGeneratedCode('');
        setPairingCode('');
    };

    // Development mode - kod generation screen
    if (step === 'generate') {
        return (
            <div className={styles.container}>
                <div className={styles.card}>
                    <h1 className={styles.title}>Generowanie kodu parowania</h1>

                    <p className={styles.description}>
                        Wygeneruj kod parowania dla tabletu w trybie deweloperskim
                    </p>

                    <div className={styles.deviceInfo}>
                        <strong>Nazwa urządzenia:</strong> {deviceName}
                    </div>

                    {generatedCode && (
                        <div className={styles.deviceInfo} style={{ backgroundColor: '#e7f5e7', border: '2px solid #10b981' }}>
                            <strong>Wygenerowany kod:</strong> {generatedCode}
                        </div>
                    )}

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
                            onClick={handleGenerateCode}
                            disabled={isLoading}
                            className={styles.button}
                        >
                            {isLoading ? 'Generowanie...' : 'Wygeneruj kod'}
                        </button>

                        {generatedCode && (
                            <button
                                type="button"
                                onClick={() => setStep('code')}
                                className={styles.button}
                                style={{ backgroundColor: '#10b981' }}
                            >
                                Użyj kod
                            </button>
                        )}
                    </div>

                    <div className={styles.helpText}>
                        <p><strong>Tryb deweloperski</strong></p>
                        <p>Automatycznie generuje kod parowania używając prawdziwych endpointów API.</p>
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

                {generatedCode && (
                    <div className={styles.deviceInfo} style={{ backgroundColor: '#e7f5e7', border: '2px solid #10b981' }}>
                        <strong>Kod do wprowadzenia:</strong> {generatedCode}
                    </div>
                )}

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

                    {process.env.REACT_APP_ENVIRONMENT === 'development' && (
                        <>
                            <br />
                            <p>Tryb deweloperski:</p>
                            <p>Użyj przycisku "Wstecz" i "Dalej" aby wygenerować kod automatycznie.</p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}