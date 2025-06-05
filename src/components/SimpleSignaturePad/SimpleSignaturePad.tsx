// src/components/SimpleSignaturePad/SimpleSignaturePad.tsx
import { useState, useRef, useEffect } from 'react';
import SignatureCanvas from '../SignaturePad/SignatureCanvas';
import { SimpleSignatureAPI } from '../../api/endpoints/simple-signature';
import { useDevice } from '../../contexts/DeviceContext';
import { wsClient } from '../../api/websocket';
import styles from './SimpleSignaturePad.module.css';
import {SimpleSignatureRequest} from "../../types/simple-signature.types";

interface SimpleSignaturePadProps {
    request: SimpleSignatureRequest;
    onComplete: () => void;
    onCancel: () => void;
}

export default function SimpleSignaturePad({ request, onComplete, onCancel }: SimpleSignaturePadProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [timeLeft, setTimeLeft] = useState(request.timeoutMinutes * 60);
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

    // Notify server about signature start
    useEffect(() => {
        if (deviceConfig) {
            wsClient.send('signature_started', {
                sessionId: request.sessionId,
                timestamp: new Date().toISOString(),
                deviceId: deviceConfig.deviceId
            });
        }
    }, [request.sessionId, deviceConfig]);

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

            // Submit signature to server
            const submissionData = {
                sessionId: request.sessionId,
                signatureImage,
                signedAt: new Date().toISOString(),
                deviceId: deviceConfig.deviceId
            };

            const response = await SimpleSignatureAPI.submitSignature(submissionData);

            if (response.success && response.data) {
                console.log('Simple signature submitted successfully:', response.data.sessionId);

                // Acknowledge completion via WebSocket
                wsClient.acknowledgeSignatureCompletion(request.sessionId, true);

                // Complete the process
                onComplete();

            } else {
                const errorMessage = response.error?.message || 'Błąd podczas zapisywania podpisu';
                setError(errorMessage);

                // Acknowledge failure via WebSocket
                wsClient.acknowledgeSignatureCompletion(request.sessionId, false);
            }

        } catch (error) {
            console.error('Error submitting simple signature:', error);
            setError('Wystąpił błąd podczas przesyłania podpisu. Sprawdź połączenie sieciowe.');

            // Acknowledge failure via WebSocket
            wsClient.acknowledgeSignatureCompletion(request.sessionId, false);
        } finally {
            setIsSubmitting(false);
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

    const renderBusinessContext = () => {
        if (!request.businessContext) return null;

        return (
            <div className={styles.businessContext}>
                <h4 className={styles.contextTitle}>Szczegóły:</h4>
                <div className={styles.contextGrid}>
                    {Object.entries(request.businessContext).map(([key, value]) => (
                        <div key={key} className={styles.contextItem}>
                            <span className={styles.contextLabel}>{formatContextKey(key)}:</span>
                            <span className={styles.contextValue}>{String(value)}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const formatContextKey = (key: string): string => {
        // Convert camelCase to readable format
        return key
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .replace(/Id$/, ' ID');
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
                <div className={styles.signatureInfo}>
                    <h2 className={styles.signatureTitle}>{request.signatureTitle}</h2>
                    <p className={styles.signerName}>Podpisujący: <strong>{request.signerName}</strong></p>
                    {request.instructions && (
                        <p className={styles.instructions}>{request.instructions}</p>
                    )}
                    {request.externalReference && (
                        <p className={styles.reference}>
                            Numer ref.: <code>{request.externalReference}</code>
                        </p>
                    )}
                </div>

                <div className={styles.timer} style={{ color: getTimerColor() }}>
                    Pozostało: {formatTime(timeLeft)}
                </div>
            </div>

            <div className={styles.content}>
                {renderBusinessContext()}

                {error && (
                    <div className={styles.error}>
                        {error}
                    </div>
                )}

                <div className={styles.signatureArea}>
                    <h3 className={styles.signaturePrompt}>Proszę złożyć podpis poniżej</h3>
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