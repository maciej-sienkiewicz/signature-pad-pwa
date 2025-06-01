import React, { useState } from 'react';
import { apiClient } from '../../api/client';
import { useDevice } from '../../hooks/useDevice';
import styles from './PairingScreen.module.css';

export default function PairingScreen() {
    const [pairingCode, setPairingCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const { pairDevice } = useDevice();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const response = await apiClient.post<any>('/api/tablets/pair', {
                code: pairingCode,
                deviceName: `Tablet ${new Date().toLocaleDateString()}`
            });

            if (response.success && response.data) {
                await pairDevice(response.data);
            } else {
                setError(response.error?.message || 'Nieprawidłowy kod parowania');
            }
        } catch (err) {
            setError('Wystąpił błąd podczas parowania');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <h1 className={styles.title}>Parowanie tabletu</h1>

                <p className={styles.description}>
                    Wprowadź 6-cyfrowy kod parowania wygenerowany w systemie CRM
                </p>

                <form onSubmit={handleSubmit} className={styles.form}>
                    <input
                        type="text"
                        value={pairingCode}
                        onChange={(e) => setPairingCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000"
                        className={styles.input}
                        maxLength={6}
                        autoComplete="off"
                        disabled={isLoading}
                    />

                    {error && (
                        <div className={styles.error}>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={pairingCode.length !== 6 || isLoading}
                        className={styles.button}
                    >
                        {isLoading ? 'Parowanie...' : 'Sparuj tablet'}
                    </button>
                </form>
            </div>
        </div>
    );
}