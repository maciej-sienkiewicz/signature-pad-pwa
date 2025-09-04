// ProtocolSignaturePad.tsx - Ultra-Luxury Minimalist Version

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
    const [error, setError] = useState('');
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [showDocument, setShowDocument] = useState(false);
    const [documentUrl, setDocumentUrl] = useState<string | null>(null);
    const [documentLoaded, setDocumentLoaded] = useState(false);
    const canvasRef = useRef<any>(null);
    const { deviceConfig } = useDevice();

    // Load document from WebSocket request data
    useEffect(() => {
        loadDocumentFromRequest();
    }, [request]);

    // Cleanup URL when component unmounts
    useEffect(() => {
        return () => {
            if (documentUrl) {
                URL.revokeObjectURL(documentUrl);
            }
        };
    }, [documentUrl]);

    const loadDocumentFromRequest = async () => {
        try {
            if (!request.documentData) {
                setError('Dokument nie został przesłany w żądaniu');
                return;
            }

            if (!request.documentData.startsWith('data:application/pdf;base64,')) {
                setError('Nieprawidłowy format dokumentu - wymagany PDF');
                return;
            }

            if (request.documentSize && request.documentSize > 10 * 1024 * 1024) {
                setError('Dokument jest zbyt duży (max 10MB)');
                return;
            }

            try {
                const base64Data = request.documentData.split(',')[1];
                const binaryData = atob(base64Data);
                const uint8Array = new Uint8Array(binaryData.length);

                for (let i = 0; i < binaryData.length; i++) {
                    uint8Array[i] = binaryData.charCodeAt(i);
                }

                const blob = new Blob([uint8Array], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);
                setDocumentUrl(url);
                setDocumentLoaded(true);

            } catch (conversionError) {
                setError('Błąd podczas przetwarzania dokumentu');
            }

        } catch (error) {
            setError('Wystąpił błąd podczas ładowania dokumentu');
        }
    };

    const handleViewDocument = () => {
        if (documentUrl && documentLoaded) {
            setShowDocument(true);
        } else {
            setError('Dokument nie jest jeszcze gotowy do wyświetlenia');
        }
    };

    const handleDocumentViewed = () => {
        setShowDocument(false);
    };

    const handleSubmit = async () => {
        if (!canvasRef.current) {
            setError('Canvas podpisu nie jest dostępny');
            return;
        }

        const isEmpty = canvasRef.current.isEmpty();
        if (isEmpty) {
            setError('Proszę złożyć podpis');
            return;
        }

        let signatureImage;
        try {
            signatureImage = canvasRef.current.toDataURL('image/png');
            if (!signatureImage || signatureImage.length < 100) {
                setError('Nie udało się pobrać podpisu. Spróbuj ponownie.');
                return;
            }
        } catch (error) {
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
            const signatureImage = canvasRef.current.toDataURL('image/png');

            if (!validateSignatureQuality(signatureImage)) {
                setError('Podpis jest zbyt prosty. Proszę podpisać się wyraźniej.');
                setIsSubmitting(false);
                return;
            }

            const signaturePlacement = {
                page: 1,
                x: 400,
                y: 700,
                width: 200,
                height: 60
            };

            const submissionData = {
                sessionId: request.sessionId,
                signatureImage,
                signedAt: new Date().toISOString(),
                deviceId: deviceConfig.deviceId,
                signaturePlacement
            };

            const response = await ProtocolSignatureAPI.submitProtocolSignature(submissionData);

            if (response.success && response.data) {
                wsClient.acknowledgeSignatureCompletion(request.sessionId, true);
                setError('');
                onComplete();
            } else {
                const errorMessage = response.error?.message || 'Błąd podczas zapisywania podpisu protokołu';
                setError(errorMessage);
                wsClient.acknowledgeSignatureCompletion(request.sessionId, false);
            }

        } catch (error) {
            setError('Wystąpił błąd podczas przesyłania podpisu. Sprawdź połączenie sieciowe.');
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
            return binaryLength >= 1000;
        } catch (error) {
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

    if (!deviceConfig) {
        return (
            <div className={styles.container}>
                <div className={styles.content}>
                    <div className={styles.documentPanel}>
                        <div className={styles.error}>
                            Brak konfiguracji urządzenia. Proszę sparować tablet ponownie.
                        </div>
                    </div>
                    <div className={styles.signaturePanel}></div>
                </div>
                <div className={styles.actions}></div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.content}>
                {/* Document Panel */}
                <div className={styles.documentPanel}>
                    <div>
                        <h3 className={styles.sectionTitle}>Dokument</h3>
                        <button
                            onClick={handleViewDocument}
                            className={styles.viewDocumentButton}
                            disabled={!documentLoaded}
                        >
                            {documentLoaded ? 'Pokaż dokument' : 'Ładowanie...'}
                        </button>
                    </div>

                    {error && (
                        <div className={styles.error}>
                            {error}
                        </div>
                    )}
                </div>

                {/* Signature Panel */}
                <div className={styles.signaturePanel}>
                    <div className={styles.signatureArea}>
                        <h3 className={styles.signatureTitle}>Podpis</h3>
                        <div className={styles.canvasContainer}>
                            <div className={styles.canvasWrapper}>
                                <SignatureCanvas ref={canvasRef} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className={styles.actions}>
                <button
                    onClick={handleCancel}
                    className={`${styles.button} ${styles.cancelButton}`}
                    disabled={isSubmitting}
                >
                    Anuluj
                </button>

                <button
                    onClick={handleClear}
                    className={`${styles.button} ${styles.clearButton}`}
                    disabled={isSubmitting}
                >
                    Wyczyść
                </button>

                <button
                    onClick={handleSubmit}
                    className={`${styles.button} ${styles.submitButton}`}
                    disabled={isSubmitting || !documentLoaded}
                >
                    {isSubmitting ? 'Przetwarzanie...' : 'Zatwierdź'}
                </button>
            </div>

            {/* Document Modal */}
            {showDocument && documentUrl && (
                <div className={styles.documentModal}>
                    <div className={styles.documentModalContent}>
                        <div className={styles.documentModalHeader}>
                            <h3>Dokument do podpisu</h3>
                            <button
                                onClick={handleDocumentViewed}
                                className={styles.closeButton}
                            >
                                Zamknij
                            </button>
                        </div>
                        <div className={styles.documentViewer}>
                            <iframe
                                src={documentUrl}
                                title="Document"
                                className={styles.documentFrame}
                            />
                        </div>
                        <div className={styles.documentModalFooter}>
                            <button
                                onClick={handleDocumentViewed}
                                className={styles.continueButton}
                            >
                                Kontynuuj
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation Dialog */}
            {showConfirmDialog && (
                <div className={styles.dialogOverlay}>
                    <div className={styles.dialog}>
                        <h3>Potwierdzenie podpisu</h3>
                        <p>Czy jesteś pewien, że chcesz zatwierdzić podpis?</p>
                        <p className={styles.dialogNote}>
                            Po zatwierdzeniu dokument zostanie podpisany i zapisany.
                        </p>

                        <div className={styles.dialogActions}>
                            <button
                                onClick={() => setShowConfirmDialog(false)}
                                className={styles.dialogCancelButton}
                                disabled={isSubmitting}
                            >
                                Anuluj
                            </button>
                            <button
                                onClick={confirmSubmit}
                                className={styles.dialogConfirmButton}
                                disabled={isSubmitting}
                            >
                                Zatwierdź
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}