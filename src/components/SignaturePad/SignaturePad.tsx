import React, { useState, useRef } from 'react';
import SignatureCanvas from './SignatureCanvas';
import CustomerInfo from '../CustomerInfo/CustomerInfo';
import { SignatureRequest } from '../../types/signature.types';
import { apiClient } from '../../api/client';
import { APP_CONFIG } from '../../config/constants';
import styles from './SignaturePad.module.css';

interface SignaturePadProps {
    request: SignatureRequest;
    onComplete: () => void;
    onCancel: () => void;
}

export default function SignaturePad({ request, onComplete, onCancel }: SignaturePadProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [timeLeft, setTimeLeft] = useState(APP_CONFIG.SIGNATURE_TIMEOUT / 1000);
    const canvasRef = useRef<any>(null);

    React.useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    onCancel();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [onCancel]);

    const handleSubmit = async () => {
        if (!canvasRef.current || canvasRef.current.isEmpty()) {
            alert('Proszę złożyć podpis');
            return;
        }

        setIsSubmitting(true);

        try {
            const signatureImage = canvasRef.current.toDataURL('image/png');

            const response = await apiClient.post('/api/signatures', {
                sessionId: request.sessionId,
                signatureImage,
                signedAt: new Date().toISOString(),
                deviceId: localStorage.getItem('deviceId')
            });

            if (response.success) {
                onComplete();
            } else {
                alert('Błąd podczas zapisywania podpisu');
            }
        } catch (error) {
            console.error('Error submitting signature:', error);
            alert('Wystąpił błąd podczas przesyłania podpisu');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClear = () => {
        canvasRef.current?.clear();
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <CustomerInfo request={request} />
                <div className={styles.timer}>
                    Pozostało: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                </div>
            </div>

            <div className={styles.content}>
                <h2 className={styles.title}>Proszę złożyć podpis poniżej</h2>

                <div className={styles.canvasWrapper}>
                    <SignatureCanvas ref={canvasRef} />
                </div>

                <div className={styles.actions}>
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
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Wysyłanie...' : 'Zatwierdź podpis'}
                    </button>
                </div>
            </div>
        </div>
    );
}