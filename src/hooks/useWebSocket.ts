// src/hooks/useWebSocket.ts
import { useEffect, useCallback, useRef } from 'react';
import { tabletWebSocketHandler } from '../services/TabletWebSocketHandler';
import { useDevice } from '../contexts/DeviceContext';

export function useWebSocket() {
    const { deviceConfig } = useDevice();
    const connectedRef = useRef(false);

    useEffect(() => {
        if (deviceConfig && !connectedRef.current) {
            tabletWebSocketHandler.connect(deviceConfig);
            connectedRef.current = true;
        }

        return () => {
            if (connectedRef.current) {
                tabletWebSocketHandler.disconnect();
                connectedRef.current = false;
            }
        };
    }, [deviceConfig]);

    const on = useCallback((event: string, callback: (data: any) => void) => {
        const unsubscribe = tabletWebSocketHandler.on(event, callback);
        return unsubscribe;
    }, []);

    const send = useCallback((type: string, payload: any) => {
        tabletWebSocketHandler.send(type, payload);
    }, []);

    const acknowledgeSignatureCompletion = useCallback((sessionId: string, success: boolean) => {
        tabletWebSocketHandler.acknowledgeSignatureCompletion(sessionId, success);
    }, []);

    const sendStatusUpdate = useCallback(() => {
        tabletWebSocketHandler.sendStatusUpdate();
    }, []);

    const getConnectionStatus = useCallback(() => {
        return tabletWebSocketHandler.getConnectionStatus();
    }, []);

    const isConnected = useCallback(() => {
        return tabletWebSocketHandler.isConnected();
    }, []);

    const isAuthenticated = useCallback(() => {
        return tabletWebSocketHandler.isAuthenticated();
    }, []);

    const reconnect = useCallback(() => {
        tabletWebSocketHandler.reconnect();
    }, []);

    return {
        on,
        send,
        acknowledgeSignatureCompletion,
        sendStatusUpdate,
        getConnectionStatus,
        isConnected,
        isAuthenticated,
        reconnect
    };
}