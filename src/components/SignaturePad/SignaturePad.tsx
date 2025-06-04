// src/components/SignaturePad/SignaturePad.tsx
import { useState, useRef, useEffect } from 'react';
import SignatureCanvas from './SignatureCanvas';
import CustomerInfo from '../CustomerInfo/CustomerInfo';
import { SignatureRequest } from '../../types/signature.types';
import { SignatureAPI } from '../../api/endpoints/signature';
import { useDevice } from '../../contexts/DeviceContext';
import { wsClient } from '../../api/websocket';
import { APP_CONFIG } from '../../config/constants';
import styles from './SignaturePad.module.css';

interface SignaturePadProps {
    request: SignatureRequest;
    onComplete: () => void;
    onCancel: () => void;
}

// Type definitions for experimental APIs - using different name to avoid conflicts
interface WakeLockSentinelCustom {
    release(): Promise<void>;
}

export default function SignaturePad({ request, onComplete, onCancel }: SignaturePadProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [timeLeft, setTimeLeft] = useState(APP_CONFIG.SIGNATURE_TIMEOUT / 1000);
    const [error, setError] = useState('');
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const canvasRef = useRef<any>(null);
    const { deviceConfig } = useDevice();

    // Countdown timer
    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    handleTimeout();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    // Prevent screen sleep and add visual feedback
    useEffect(() => {
        // Request wake lock if available
        let wakeLock: WakeLockSentinelCustom | null = null;

        const requestWakeLock = async () => {
            try {
                // Check if wake lock is supported
                if ('wakeLock' in navigator && navigator.wakeLock) {
                    // Type assertion for the wake lock request
                    const wakeLockAPI = navigator.wakeLock as any;
                    wakeLock = await wakeLockAPI.request('screen') as WakeLockSentinelCustom;
                    console.log('Screen wake lock activated');
                }
            } catch (error) {
                console.warn('Could not activate wake lock:', error);
            }
        };

        requestWakeLock();

        return () => {
            if (wakeLock) {
                wakeLock.release().catch(error => {
                    console.warn('Error releasing wake lock:', error);
                });
                console.log('Screen wake lock released');
            }
        };
    }, []);

    const handleTimeout = () => {
        setError('Sesja wygasła. Czas na złożenie podpisu minął.');

        // Notify server about timeout
        if (deviceConfig) {
            wsClient.acknowledgeSignatureCompletion(request.sessionId, false);
        }

        setTimeout(() => {
            onCancel();
        }, 3000);
    };

    const handleSubmit = async () => {
        if (!canvasRef.current || canvasRef.current.isEmpty()) {
            setError('Proszę złożyć podpis na tablecie');
            return;
        }

        if (!deviceConfig) {
            setError('Brak konfiguracji urządzenia');
            return;
        }

        setShowConfirmDialog(true);
    };

    const confirmSubmit = async () => {
        // Early return if no device config
        if (!deviceConfig) {
            setError('Brak konfiguracji urządzenia');
            setShowConfirmDialog(false);
            return;
        }

        setShowConfirmDialog(false);
        setIsSubmitting(true);
        setError('');

        try {
            // Get signature as base64 image
            const signatureImage = canvasRef.current.toDataURL('image/png');

            // Validate signature quality
            if (!validateSignatureQuality(signatureImage)) {
                setError('Podpis jest zbyt prosty. Proszę podpisać się wyraźniej.');
                setIsSubmitting(false);
                return;
            }

            // Submit signature to server
            const submissionData = {
                sessionId: request.sessionId,
                signatureImage,
                signedAt: new Date().toISOString(),
                deviceId: deviceConfig.deviceId // deviceConfig is guaranteed to be non-null here
            };

            const response = await SignatureAPI.submitSignature(submissionData);

            if (response.success && response.data) {
                console.log('Signature submitted successfully:', response.data.sessionId);

                // Acknowledge completion via WebSocket
                wsClient.acknowledgeSignatureCompletion(request.sessionId, true);

                // Show success feedback
                setError('');

                // Complete the process
                onComplete();

            } else {
                const errorMessage = response.error?.message || 'Błąd podczas zapisywania podpisu';
                setError(errorMessage);

                // Acknowledge failure via WebSocket
                wsClient.acknowledgeSignatureCompletion(request.sessionId, false);
            }

        } catch (error) {
            console.error('Error submitting signature:', error);
            setError('Wystąpił błąd podczas przesyłania podpisu. Sprawdź połączenie sieciowe.');

            // Acknowledge failure via WebSocket
            wsClient.acknowledgeSignatureCompletion(request.sessionId, false);
        } finally {
            setIsSubmitting(false);
        }
    };

    const validateSignatureQuality = (signatureDataUrl: string): boolean => {
        try {
            // Basic validation - check if signature has sufficient data
            const base64Data = signatureDataUrl.split(',')[1];
            if (!base64Data) {
                return false;
            }

            const binaryLength = atob(base64Data).length;

            // Reject signatures that are too small (likely just dots or very simple marks)
            if (binaryLength < 1000) {
                return false;
            }

            // Additional validation could be added here
            return true;

        } catch (error) {
            console.error('Error validating signature:', error);
            return false;
        }
    };

    const handleClear = () => {
        if (canvasRef.current) {
            canvasRef.current.clear();
        }
        setError('');
    };

    const handleCancel = () => {
        if (deviceConfig) {
            wsClient.acknowledgeSignatureCompletion(request.sessionId, false);
        }
        onCancel();
    };

    const formatTime = (seconds: number): string => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    const getTimerColor = (): string => {
        if (timeLeft < 30) return '#ef4444'; // red
        if (timeLeft < 60) return '#f59e0b'; // orange
        return '#6b7280'; // gray
    };

    // Don't render if no device config
    if (!deviceConfig) {
        return (
            <div className={styles.container}>
                <div className={styles.content}>
                    <div className={styles.error}>
                        Brak konfiguracji urządzenia. Proszę sparować tablet ponownie.
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <CustomerInfo request={request} />
                <div
                    className={styles.timer}
                    style={{ color: getTimerColor() }}
                >
                    Pozostało: {formatTime(timeLeft)}
                </div>
            </div>

            <div className={styles.content}>
                <h2 className={styles.title}>Proszę złożyć podpis poniżej</h2>

                {error && (
                    <div className={styles.error}>
                        {error}
                    </div>
                )}

                <div className={styles.canvasWrapper}>
                    <SignatureCanvas ref={canvasRef} />
                </div>

                <div className={styles.actions}>
                    <button
                        onClick={handleCancel}
                        className={styles.cancelButton}
                        disabled={isSubmitting}
                    >
                        Anuluj
                    </button>

                    <button
                        onClick={handleClear}
                        className={styles.clearButton}
                        disabled={isSubmitting}
                    >
                        Wyczyść
                    </button>

                    <button
                        onClick={handleSubmit}
                        className={styles.submitButton}
                        disabled={isSubmitting || timeLeft === 0}
                    >
                        {isSubmitting ? 'Wysyłanie...' : 'Zatwierdź podpis'}
                    </button>
                </div>
            </div>

            {/* Confirmation Dialog */}
            {showConfirmDialog && (
                <div className={styles.dialogOverlay}>
                    <div className={styles.dialog}>
                        <h3>Potwierdzenie podpisu</h3>
                        <p>Czy jesteś pewien, że chcesz zatwierdzić ten podpis?</p>
                        <p className={styles.dialogNote}>
                            Po zatwierdzeniu nie będzie możliwości zmiany podpisu.
                        </p>

                        <div className={styles.dialogActions}>
                            <button
                                onClick={() => setShowConfirmDialog(false)}
                                className={styles.dialogCancelButton}
                                disabled={isSubmitting}
                            >
                                Nie, popraw
                            </button>
                            <button
                                onClick={confirmSubmit}
                                className={styles.dialogConfirmButton}
                                disabled={isSubmitting}
                            >
                                Tak, zatwierdź
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}