
// src/components/ProtocolSignaturePad/ProtocolSignaturePad.tsx
import { useState, useRef, useEffect } from 'react';
import SignatureCanvas from '../SignaturePad/SignatureCanvas';
import { ProtocolSignatureRequest } from '../../types/protocol-signature.types';
import { ProtocolSignatureAPI } from '../../api/endpoints/protocol-signature';
import { useDevice } from '../../contexts/DeviceContext';
import { wsClient } from '../../api/websocket';
import styles from './ProtocolSignaturePad.module.css';

interface ProtocolSignaturePadProps {
    request: ProtocolSignatureRequest;
    onComplete: () => void;
    onCancel: () => void;
}

export default function ProtocolSignaturePad({ request, onComplete, onCancel }: ProtocolSignaturePadProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [timeLeft, setTimeLeft] = useState(request.timeoutMinutes * 60);
    const [error, setError] = useState('');
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [documentViewed, setDocumentViewed] = useState(false);
    const [showDocument, setShowDocument] = useState(false);
    const [documentUrl, setDocumentUrl] = useState<string | null>(null);
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

    // Load document on mount
    useEffect(() => {
        loadDocument();
    }, []);

    // Notify server about document viewing
    useEffect(() => {
        if (deviceConfig && !documentViewed) {
            // Notify that viewing has started
            ProtocolSignatureAPI.acknowledgeDocumentViewing(request.sessionId, 'VIEWING_STARTED');
            setDocumentViewed(true);
        }
    }, [request.sessionId, deviceConfig, documentViewed]);

    const loadDocument = async () => {
        try {
            const response = await ProtocolSignatureAPI.downloadProtocolDocument(request.sessionId);
            if (response.success && response.data) {
                const url = URL.createObjectURL(response.data);
                setDocumentUrl(url);
            } else {
                setError('Nie można pobrać dokumentu protokołu');
            }
        } catch (error) {
            console.error('Error loading protocol document:', error);
            setError('Błąd podczas ładowania dokumentu');
        }
    };

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

    const handleViewDocument = () => {
        if (documentUrl) {
            setShowDocument(true);
            // Notify server that document viewing started
            if (deviceConfig) {
                ProtocolSignatureAPI.acknowledgeDocumentViewing(request.sessionId, 'DOCUMENT_OPENED');
            }
        }
    };

    const handleDocumentViewed = () => {
        setShowDocument(false);
        // Notify server that document viewing completed
        if (deviceConfig) {
            ProtocolSignatureAPI.acknowledgeDocumentViewing(request.sessionId, 'DOCUMENT_VIEWED');
        }
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

            // Validate signature quality
            if (!validateSignatureQuality(signatureImage)) {
                setError('Podpis jest zbyt prosty. Proszę podpisać się wyraźniej.');
                setIsSubmitting(false);
                return;
            }

            // Prepare signature placement (default to bottom right)
            const signaturePlacement = {
                page: 1,
                x: 400, // Adjust based on your document layout
                y: 700, // Adjust based on your document layout
                width: 200,
                height: 60
            };

            // Submit signature to server
            const submissionData = {
                sessionId: request.sessionId,
                signatureImage,
                signedAt: new Date().toISOString(),
                deviceId: deviceConfig.deviceId,
                signaturePlacement
            };

            const response = await ProtocolSignatureAPI.submitProtocolSignature(submissionData);

            if (response.success && response.data) {
                console.log('Protocol signature submitted successfully:', response.data.sessionId);

                // Acknowledge completion via WebSocket
                wsClient.acknowledgeSignatureCompletion(request.sessionId, true);

                // Show success feedback
                setError('');

                // Complete the process
                onComplete();

            } else {
                const errorMessage = response.error?.message || 'Błąd podczas zapisywania podpisu protokołu';
                setError(errorMessage);

                // Acknowledge failure via WebSocket
                wsClient.acknowledgeSignatureCompletion(request.sessionId, false);
            }

        } catch (error) {
            console.error('Error submitting protocol signature:', error);
            setError('Wystąpił błąd podczas przesyłania podpisu. Sprawdź połączenie sieciowe.');

            // Acknowledge failure via WebSocket
            wsClient.acknowledgeSignatureCompletion(request.sessionId, false);
        } finally {
            setIsSubmitting(false);
        }
    };

    const validateSignatureQuality = (signatureDataUrl: string): boolean => {
        try {
            const base64Data = signatureDataUrl.split(',')[1];
            if (!base64Data) {
                return false;
            }

            const binaryLength = atob(base64Data).length;
            return binaryLength >= 1000; // Minimum size check
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
                <div className={styles.protocolInfo}>
                    <h2 className={styles.documentTitle}>{request.documentTitle}</h2>
                    <p className={styles.signerName}>Podpisujący: <strong>{request.signerName}</strong></p>
                    {request.instructions && (
                        <p className={styles.instructions}>{request.instructions}</p>
                    )}
                    {request.businessContext?.protocolId && (
                        <p className={styles.protocolId}>
                            Protokół Nr: <code>#{request.businessContext.protocolId}</code>
                        </p>
                    )}
                </div>

                <div className={styles.timer} style={{ color: getTimerColor() }}>
                    Pozostało: {formatTime(timeLeft)}
                </div>
            </div>

            <div className={styles.content}>
                {/* Document Preview Section */}
                <div className={styles.documentSection}>
                    <h3 className={styles.sectionTitle}>Dokument do podpisu</h3>
                    <div className={styles.documentActions}>
                        <button
                            onClick={handleViewDocument}
                            className={styles.viewDocumentButton}
                            disabled={!documentUrl}
                        >
                            {documentUrl ? 'Pokaż dokument' : 'Ładowanie dokumentu...'}
                        </button>
                        {documentViewed && (
                            <span className={styles.viewedIndicator}>✓ Dokument przejrzany</span>
                        )}
                    </div>
                </div>

                {error && (
                    <div className={styles.error}>
                        {error}
                    </div>
                )}

                {/* Signature Section */}
                <div className={styles.signatureSection}>
                    <h3 className={styles.sectionTitle}>Podpis</h3>
                    <p className={styles.signaturePrompt}>Proszę złożyć podpis poniżej</p>
                    <div className={styles.canvasWrapper}>
                        <SignatureCanvas ref={canvasRef} />
                    </div>
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

            {/* Document Viewer Modal */}
            {showDocument && documentUrl && (
                <div className={styles.documentModal}>
                    <div className={styles.documentModalContent}>
                        <div className={styles.documentModalHeader}>
                            <h3>Protokół do podpisu</h3>
                            <button
                                onClick={handleDocumentViewed}
                                className={styles.closeDocumentButton}
                            >
                                ✕ Zamknij
                            </button>
                        </div>
                        <div className={styles.documentViewer}>
                            <iframe
                                src={documentUrl}
                                title="Protocol Document"
                                className={styles.documentFrame}
                            />
                        </div>
                        <div className={styles.documentModalFooter}>
                            <button
                                onClick={handleDocumentViewed}
                                className={styles.continueButton}
                            >
                                Kontynuuj do podpisu
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation Dialog */}
            {showConfirmDialog && (
                <div className={styles.dialogOverlay}>
                    <div className={styles.dialog}>
                        <h3>Potwierdzenie podpisu protokołu</h3>
                        <p>Czy jesteś pewien, że chcesz zatwierdzić ten podpis protokołu?</p>
                        <p className={styles.dialogNote}>
                            Po zatwierdzeniu protokół zostanie automatycznie podpisany i zapisany.
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