// src/components/StatusIndicator/StatusIndicator.tsx
import { useState, useEffect } from 'react';
import { useDevice } from '../../contexts/DeviceContext';
import { useWebSocket } from '../../hooks/useWebSocket';
import { DeviceStatus } from '../../types/device.types';
import styles from './StatusIndicator.module.css';

export default function StatusIndicator() {
    const { deviceStatus, tenantBranding } = useDevice();
    const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected'>('disconnected');
    const { on } = useWebSocket();

    useEffect(() => {
        const unsubscribe = on('connection', ({ status }) => {
            setConnectionStatus(status);
        });

        return unsubscribe;
    }, [on]);

    const getStatusColor = () => {
        if (connectionStatus === 'connected') return styles.connected;
        if (deviceStatus === DeviceStatus.ERROR) return styles.error;
        return styles.disconnected;
    };

    return (
        <div className={styles.container}>
            <div className={styles.brand}>
                {tenantBranding?.logoUrl && (
                    <img
                        src={tenantBranding.logoUrl}
                        alt={tenantBranding.companyName}
                        className={styles.logo}
                    />
                )}
            </div>

            <div className={styles.status}>
                <div className={`${styles.indicator} ${getStatusColor()}`} />
                <span className={styles.text}>
                    {connectionStatus === 'connected' ? 'Połączono' : 'Rozłączono'}
                </span>
            </div>
        </div>
    );
}