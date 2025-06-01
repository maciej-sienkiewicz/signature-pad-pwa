import { useEffect, useCallback, useRef } from 'react';
import { wsClient } from '../api/websocket';
import { useDevice } from '../contexts/DeviceContext';

export function useWebSocket() {
    const { deviceConfig } = useDevice();
    const connectedRef = useRef(false);

    useEffect(() => {
        if (deviceConfig && !connectedRef.current) {
            wsClient.connect(deviceConfig);
            connectedRef.current = true;
        }

        return () => {
            if (connectedRef.current) {
                wsClient.disconnect();
                connectedRef.current = false;
            }
        };
    }, [deviceConfig]);

    const on = useCallback((event: string, callback: (data: any) => void) => {
        wsClient.on(event, callback);
        return () => wsClient.off(event, callback);
    }, []);

    const send = useCallback((type: string, payload: any) => {
        wsClient.send(type, payload);
    }, []);

    return { on, send };
}