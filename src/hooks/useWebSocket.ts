// src/hooks/useWebSocket.ts - POPRAWIONA WERSJA
import { useEffect, useCallback, useRef } from 'react';
import { tabletWebSocketHandler } from '../services/TabletWebSocketHandler';
import { useDevice } from '../contexts/DeviceContext';

export function useWebSocket() {
    const { deviceConfig } = useDevice();
    const connectedRef = useRef(false);
    const initializeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (deviceConfig && !connectedRef.current) {
            console.log('🔌 useWebSocket: Connecting with device config:', {
                deviceId: deviceConfig.deviceId,
                companyId: deviceConfig.companyId,
                hasToken: !!deviceConfig.deviceToken
            });

            // Clear any existing timeout
            if (initializeTimeoutRef.current) {
                clearTimeout(initializeTimeoutRef.current);
            }

            // Add a small delay to ensure proper initialization order
            initializeTimeoutRef.current = setTimeout(() => {
                try {
                    tabletWebSocketHandler.connect(deviceConfig);
                    connectedRef.current = true;
                    console.log('✅ useWebSocket: Connection initiated successfully');
                } catch (error) {
                    console.error('❌ useWebSocket: Failed to connect:', error);
                }
            }, 500);
        }

        return () => {
            if (initializeTimeoutRef.current) {
                clearTimeout(initializeTimeoutRef.current);
                initializeTimeoutRef.current = null;
            }

            if (connectedRef.current) {
                console.log('🔌 useWebSocket: Disconnecting...');
                tabletWebSocketHandler.disconnect();
                connectedRef.current = false;
            }
        };
    }, [deviceConfig]);

    const on = useCallback((event: string, callback: (data: any) => void) => {
        console.log(`👂 useWebSocket: Setting up listener for '${event}'`);
        const unsubscribe = tabletWebSocketHandler.on(event, (data) => {
            console.log(`📨 useWebSocket: Event '${event}' received:`, data);
            callback(data);
        });

        // Return cleanup function
        return () => {
            console.log(`👋 useWebSocket: Removing listener for '${event}'`);
            unsubscribe();
        };
    }, []);

    const send = useCallback((type: string, payload: any) => {
        console.log(`📤 useWebSocket: Sending message '${type}':`, payload);
        tabletWebSocketHandler.send(type, payload);
    }, []);

    const acknowledgeSignatureCompletion = useCallback((sessionId: string, success: boolean) => {
        console.log(`✅ useWebSocket: Acknowledging signature completion:`, { sessionId, success });
        tabletWebSocketHandler.acknowledgeSignatureCompletion(sessionId, success);
    }, []);

    const sendStatusUpdate = useCallback(() => {
        console.log('📊 useWebSocket: Sending status update');
        tabletWebSocketHandler.sendStatusUpdate();
    }, []);

    const getConnectionStatus = useCallback(() => {
        const status = tabletWebSocketHandler.getConnectionStatus();
        console.log('🔍 useWebSocket: Getting connection status:', status);
        return status;
    }, []);

    const isConnected = useCallback(() => {
        const connected = tabletWebSocketHandler.isConnected();
        console.log('🔍 useWebSocket: Checking if connected:', connected);
        return connected;
    }, []);

    const isAuthenticated = useCallback(() => {
        const authenticated = tabletWebSocketHandler.isAuthenticated();
        console.log('🔍 useWebSocket: Checking if authenticated:', authenticated);
        return authenticated;
    }, []);

    const reconnect = useCallback(() => {
        console.log('🔄 useWebSocket: Manual reconnect requested');
        tabletWebSocketHandler.reconnect();
    }, []);

    // Debug helper - only in development
    const getDebugInfo = useCallback(() => {
        if (process.env.NODE_ENV === 'development') {
            return {
                connectedRef: connectedRef.current,
                connectionStatus: tabletWebSocketHandler.getConnectionStatus(),
                readyState: tabletWebSocketHandler.getReadyState(),
                deviceConfig: deviceConfig ? {
                    deviceId: deviceConfig.deviceId,
                    companyId: deviceConfig.companyId,
                    hasToken: !!deviceConfig.deviceToken
                } : null
            };
        }
        return null;
    }, [deviceConfig]);

    // Expose debug info globally in development
    useEffect(() => {
        if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
            (window as any).webSocketDebug = {
                getDebugInfo,
                handler: tabletWebSocketHandler,
                forceReconnect: () => {
                    connectedRef.current = false;
                    if (deviceConfig) {
                        tabletWebSocketHandler.connect(deviceConfig);
                        connectedRef.current = true;
                    }
                }
            };
        }
    }, [getDebugInfo, deviceConfig]);

    return {
        on,
        send,
        acknowledgeSignatureCompletion,
        sendStatusUpdate,
        getConnectionStatus,
        isConnected,
        isAuthenticated,
        reconnect,
        getDebugInfo // Only available in development
    };
}