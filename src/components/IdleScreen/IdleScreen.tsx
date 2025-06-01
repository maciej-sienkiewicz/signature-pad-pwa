import React, { useEffect, useState } from 'react';
import styles from './IdleScreen.module.css';
import { useDevice } from '../../contexts/DeviceContext';

interface IdleScreenProps {
    isInstallable: boolean;
    onInstall: () => Promise<boolean>;
}

export default function IdleScreen({ isInstallable, onInstall }: IdleScreenProps) {
    const { deviceConfig, tenantBranding } = useDevice();
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const handleInstall = async () => {
        const success = await onInstall();
        if (success) {
            console.log('App installed successfully');
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.content}>
                {tenantBranding?.logoUrl && (
                    <img
                        src={tenantBranding.logoUrl}
                        alt={tenantBranding.companyName}
                        className={styles.logo}
                    />
                )}

                <h1 className={styles.companyName}>
                    {tenantBranding?.companyName || 'Premium Auto Detailing'}
                </h1>

                <div className={styles.clock}>
                    {currentTime.toLocaleTimeString('pl-PL', {
                        hour: '2-digit',
                        minute: '2-digit'
                    })}
                </div>

                <p className={styles.status}>
                    Gotowy do przyjęcia podpisu
                </p>

                <div className={styles.deviceInfo}>
                    {deviceConfig?.friendlyName}
                </div>
            </div>

            {isInstallable && (
                <div className={styles.installPrompt}>
                    <p>Zainstaluj aplikację dla lepszego doświadczenia</p>
                    <button onClick={handleInstall} className={styles.installButton}>
                        Zainstaluj
                    </button>
                </div>
            )}
        </div>
    );
}