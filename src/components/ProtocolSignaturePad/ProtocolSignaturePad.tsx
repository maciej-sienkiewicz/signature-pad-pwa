// ProtocolSignaturePad.tsx - NOWA WERSJA bez HTTP calls

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
    const [documentLoaded, setDocumentLoaded] = useState(false);
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

    // NOWE: Load document from WebSocket request data
    useEffect(() => {
        loadDocumentFromRequest();
    }, [request]);

    // Cleanup URL when component unmounts
    useEffect(() => {
        return () => {
            if (documentUrl) {
                URL.revokeObjectURL(documentUrl);
                console.log('🧹 Document URL revoked on cleanup');
            }
        };
    }, [documentUrl]);

    /**
     * NOWA METODA: Load document from WebSocket request data
     */
    const loadDocumentFromRequest = async () => {
        try {
            console.log('🔄 Loading document from WebSocket request data:', {
                sessionId: request.sessionId,
                hasDocumentData: !!request.documentData,
                documentSize: request.documentSize
            });

            if (!request.documentData) {
                setError('Dokument nie został przesłany w żądaniu');
                return;
            }

            // Validate document data format
            if (!request.documentData.startsWith('data:application/pdf;base64,')) {
                setError('Nieprawidłowy format dokumentu - wymagany PDF');
                return;
            }

            // Validate document size
            if (request.documentSize && request.documentSize > 10 * 1024 * 1024) {
                setError('Dokument jest zbyt duży (max 10MB)');
                return;
            }

            // Convert base64 to blob
            try {
                const base64Data = request.documentData.split(',')[1];
                const binaryData = atob(base64Data);
                const uint8Array = new Uint8Array(binaryData.length);

                for (let i = 0; i < binaryData.length; i++) {
                    uint8Array[i] = binaryData.charCodeAt(i);
                }

                const blob = new Blob([uint8Array], { type: 'application/pdf' });

                console.log('✅ Document blob created:', {
                    size: blob.size,
                    type: blob.type,
                    expectedSize: request.documentSize
                });

                // Verify size matches
                if (request.documentSize && Math.abs(blob.size - (binaryData.length)) > 100) {
                    console.warn('⚠️ Document size mismatch:', {
                        expected: request.documentSize,
                        actual: blob.size,
                        binaryLength: binaryData.length
                    });
                }

                // Create URL for PDF viewer
                const url = URL.createObjectURL(blob);
                setDocumentUrl(url);
                setDocumentLoaded(true);

                console.log('✅ Document loaded successfully from WebSocket data');

                // Notify server about document loading
                if (deviceConfig) {
                    ProtocolSignatureAPI.acknowledgeDocumentViewing(request.sessionId, 'DOCUMENT_LOADED');
                }

            } catch (conversionError) {
                console.error('❌ Failed to convert base64 to blob:', conversionError);
                setError('Błąd podczas przetwarzania dokumentu');
            }

        } catch (error) {
            console.error('❌ Error loading document from request:', error);
            setError('Wystąpił błąd podczas ładowania dokumentu');
        }
    };

    // Notify server about document viewing
    useEffect(() => {
        if (deviceConfig && documentLoaded && !documentViewed) {
            // Notify that document is ready for viewing
            ProtocolSignatureAPI.acknowledgeDocumentViewing(request.sessionId, 'DOCUMENT_READY');
            setDocumentViewed(true);
        }
    }, [request.sessionId, deviceConfig, documentLoaded, documentViewed]);

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
        if (documentUrl && documentLoaded) {
            setShowDocument(true);
            // Notify server that document viewing started
            if (deviceConfig) {
                ProtocolSignatureAPI.acknowledgeDocumentViewing(request.sessionId, 'DOCUMENT_OPENED');
            }
        } else {
            setError('Dokument nie jest jeszcze gotowy do wyświetlenia');
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
        // Sprawdź czy canvas ref istnieje
        if (!canvasRef.current) {
            setError('Canvas podpisu nie jest dostępny');
            return;
        }

        // Sprawdź czy podpis jest pusty
        const isEmpty = canvasRef.current.isEmpty();
        console.log('🔍 Canvas isEmpty check:', isEmpty);

        if (isEmpty) {
            setError('Proszę złożyć podpis na tablecie');
            return;
        }

        // Dodatkowa walidacja - sprawdź czy można pobrać dane z canvas
        let signatureImage;
        try {
            signatureImage = canvasRef.current.toDataURL('image/png');
            console.log('📝 Signature image generated:', signatureImage.substring(0, 50) + '...');

            // Sprawdź czy to nie jest pusty canvas (ma więcej niż tylko nagłówek base64)
            if (!signatureImage || signatureImage.length < 100) {
                setError('Nie udało się pobrać podpisu. Spróbuj ponownie.');
                return;
            }
        } catch (error) {
            console.error('❌ Error getting signature image:', error);
            setError('Błąd podczas pobierania podpisu');
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
            // Pobierz podpis jako base64 image
            const signatureImage = canvasRef.current.toDataURL('image/png');
            console.log('📤 Sending signature to server, size:', signatureImage.length);

            // Waliduj jakość podpisu
            if (!validateSignatureQuality(signatureImage)) {
                setError('Podpis jest zbyt prosty. Proszę podpisać się wyraźniej.');
                setIsSubmitting(false);
                return;
            }

            // Przygotuj dane placement podpisu (domyślnie prawy dolny róg)
            const signaturePlacement = {
                page: 1,
                x: 400,
                y: 700,
                width: 200,
                height: 60
            };

            // Wyślij podpis na serwer
            const submissionData = {
                sessionId: request.sessionId,
                signatureImage,
                signedAt: new Date().toISOString(),
                deviceId: deviceConfig.deviceId,
                signaturePlacement
            };

            console.log('📡 Submitting protocol signature:', {
                sessionId: submissionData.sessionId,
                deviceId: submissionData.deviceId,
                signedAt: submissionData.signedAt,
                signatureSize: signatureImage.length
            });

            const response = await ProtocolSignatureAPI.submitProtocolSignature(submissionData);

            if (response.success && response.data) {
                console.log('✅ Protocol signature submitted successfully:', response.data.sessionId);

                // Powiadom serwer via WebSocket
                wsClient.acknowledgeSignatureCompletion(request.sessionId, true);

                // Pokaż sukces
                setError('');

                // Zakończ proces
                onComplete();

            } else {
                const errorMessage = response.error?.message || 'Błąd podczas zapisywania podpisu protokołu';
                console.error('❌ Server error:', errorMessage);
                setError(errorMessage);

                // Powiadom o niepowodzeniu via WebSocket
                wsClient.acknowledgeSignatureCompletion(request.sessionId, false);
            }

        } catch (error) {
            console.error('❌ Error submitting protocol signature:', error);
            setError('Wystąpił błąd podczas przesyłania podpisu. Sprawdź połączenie sieciowe.');

            // Powiadom o niepowodzeniu via WebSocket
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
                            disabled={!documentLoaded}
                        >
                            {documentLoaded ? 'Pokaż dokument' : 'Ładowanie dokumentu...'}
                        </button>
                        {documentViewed && (
                            <span className={styles.viewedIndicator}>✓ Dokument przejrzany</span>
                        )}
                    </div>

                    {/* Show document info */}
                    {documentLoaded && (
                        <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' }}>
                            Dokument załadowany ({request.documentSize ? `${Math.round(request.documentSize / 1024)} KB` : 'nieznany rozmiar'})
                        </div>
                    )}
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
                        disabled={isSubmitting || timeLeft === 0 || !documentLoaded}
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