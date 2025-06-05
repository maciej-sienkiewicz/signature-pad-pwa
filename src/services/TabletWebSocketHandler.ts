// src/services/TabletWebSocketHandler.ts - POPRAWIONA WERSJA
import { DeviceConfig } from '../types/device.types';
import { SignatureRequest } from '../types/signature.types';
import { ENV } from '../config/environment';

export type WebSocketMessage = {
    type: string;
    payload: any;
};

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'authenticated' | 'error';

export class TabletWebSocketHandler {
    private ws: WebSocket | null = null;
    private reconnectAttempts = 0;
    private heartbeatInterval: NodeJS.Timeout | null = null;
    private reconnectTimeout: NodeJS.Timeout | null = null;
    private listeners: Map<string, Set<(data: any) => void>> = new Map();
    private deviceConfig: DeviceConfig | null = null;
    private connectionStatus: ConnectionStatus = 'disconnected';
    private lastHeartbeat: number = 0;
    private isIntentionalDisconnect = false;
    private authenticationSent = false;
    private maxReconnectAttempts = 10;
    private reconnectInterval = 3000;
    private heartbeatIntervalMs = 30000;

    connect(deviceConfig: DeviceConfig): void {
        if (this.connectionStatus === 'connected' || this.connectionStatus === 'connecting') {
            console.log('WebSocket already connected or connecting');
            return;
        }

        this.deviceConfig = deviceConfig;
        this.isIntentionalDisconnect = false;
        this.authenticationSent = false;
        this.establishConnection();
    }

    private establishConnection(): void {
        if (!this.deviceConfig) {
            console.error('No device config available for WebSocket connection');
            return;
        }

        this.setConnectionStatus('connecting');

        try {
            const wsUrl = `${ENV.WS_BASE_URL}/ws/tablet/${this.deviceConfig.deviceId}`;
            console.log('WebSocket connection attempt:', wsUrl);

            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = this.handleOpen.bind(this);
            this.ws.onmessage = this.handleMessage.bind(this);
            this.ws.onclose = this.handleClose.bind(this);
            this.ws.onerror = this.handleError.bind(this);

        } catch (error) {
            console.error('Failed to create WebSocket connection:', error);
            this.setConnectionStatus('error');
            this.scheduleReconnect();
        }
    }

    private handleOpen(): void {
        console.log('WebSocket connected successfully');
        this.reconnectAttempts = 0;
        this.setConnectionStatus('connected');

        // Send authentication immediately
        this.sendAuthenticationMessage();

        this.emit('connection', { status: 'connected' });
    }

    private sendAuthenticationMessage(): void {
        if (!this.deviceConfig || this.authenticationSent) return;

        const authMessage = {
            type: 'authentication',
            payload: {
                token: this.deviceConfig.deviceToken,
                deviceId: this.deviceConfig.deviceId,
                companyId: this.deviceConfig.companyId,
                locationId: this.deviceConfig.locationId,
                timestamp: new Date().toISOString()
            }
        };

        this.sendRaw(authMessage);
        this.authenticationSent = true;
        console.log('Authentication message sent');
    }

    private handleMessage(event: MessageEvent): void {
        try {
            const message: WebSocketMessage = JSON.parse(event.data);

            if (ENV.DEBUG_MODE) {
                console.log('WebSocket message received:', message.type, message.payload);
            }

            switch (message.type) {
                case 'authentication':
                    this.handleAuthenticationResponse(message.payload);
                    break;

                case 'heartbeat':
                    this.handleHeartbeatResponse();
                    break;

                case 'signature_request':
                    this.handleSignatureRequest(message.payload);
                    break;

                case 'simple_signature_request':
                    this.handleSimpleSignatureRequest(message.payload);
                    break;

                case 'connection':
                    this.handleConnectionMessage(message.payload);
                    break;

                case 'session_cancelled':
                    this.handleSessionCancelled(message.payload);
                    break;

                case 'admin_message':
                    this.handleAdminMessage(message.payload);
                    break;

                case 'error':
                    this.handleErrorMessage(message.payload);
                    break;

                default:
                    this.emit(message.type, message.payload);
                    break;
            }

        } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
            this.emit('error', {
                code: 'PARSE_ERROR',
                message: 'Failed to parse server message'
            });
        }
    }

    private handleAuthenticationResponse(payload: any): void {
        if (payload.status === 'authenticated') {
            console.log('WebSocket authentication successful');
            this.setConnectionStatus('authenticated');
            this.startHeartbeat();
            this.emit('authenticated', payload);
            this.emit('connection', { status: 'authenticated' });
        } else if (payload.status === 'failed' || payload.error) {
            console.error('WebSocket authentication failed:', payload.error || payload);
            this.setConnectionStatus('error');
            this.emit('authentication_failed', payload);
            this.emit('error', {
                code: 'AUTHENTICATION_FAILED',
                message: payload.error || 'Authentication failed'
            });
        }
    }

    private handleHeartbeatResponse(): void {
        this.lastHeartbeat = Date.now();
        if (ENV.DEBUG_MODE) {
            console.log('Heartbeat acknowledged by server');
        }
    }

    // POPRAWIONA FUNKCJA - główny fix
    private handleSignatureRequest(payload: any): void {
        console.log('Signature request received:', payload);

        // Validate signature request
        if (!payload.sessionId || !payload.customerName) {
            console.error('Invalid signature request received:', payload);
            return;
        }

        try {
            // POPRAWKA: Konwertuj timestamp z Unix timestamp do ISO string jeśli potrzeba
            let timestamp = payload.timestamp;
            if (typeof timestamp === 'number') {
                timestamp = new Date(timestamp * 1000).toISOString();
            } else if (!timestamp) {
                timestamp = new Date().toISOString();
            }

            // POPRAWKA: Obsługa różnych formatów pól vehicleInfo
            const vehicleInfo = payload.vehicleInfo || {};
            const normalizedVehicleInfo = {
                make: vehicleInfo.make || '',
                model: vehicleInfo.model || '',
                licensePlate: vehicleInfo.licensePlate || vehicleInfo.license_plate || '',
                vin: vehicleInfo.vin || null
            };

            // Convert to frontend SignatureRequest format
            const signatureRequest: SignatureRequest = {
                sessionId: payload.sessionId,
                workstationId: payload.workstationId || 'unknown',
                companyId: payload.companyId || this.deviceConfig?.companyId || 2,
                customerName: payload.customerName,
                vehicleInfo: normalizedVehicleInfo,
                serviceType: payload.serviceType || 'Usługa serwisowa',
                documentId: payload.documentId || 'doc-' + payload.sessionId,
                documentType: payload.documentType || 'Potwierdzenie wykonania usługi',
                timestamp: timestamp
            };

            console.log('Normalized signature request:', signatureRequest);

            // Add notification effects
            this.playNotificationSound();
            this.vibrate();

            // POPRAWKA: Emit z odpowiednim typem zdarzenia
            this.emit('signature_request', signatureRequest);

        } catch (error) {
            console.error('Error processing signature request:', error);
            this.emit('error', {
                code: 'SIGNATURE_REQUEST_ERROR',
                message: 'Failed to process signature request'
            });
        }
    }

    private handleSimpleSignatureRequest(payload: any): void {
        console.log('Simple signature request received:', payload);

        // Add notification effects
        this.playNotificationSound();
        this.vibrate();

        this.emit('simple_signature_request', payload);
    }

    private handleConnectionMessage(payload: any): void {
        console.log('Connection status update:', payload.status);
        this.emit('connection', payload);
    }

    private handleSessionCancelled(payload: any): void {
        console.log('Session cancelled:', payload.sessionId);
        this.emit('session_cancelled', payload);
    }

    private handleAdminMessage(payload: any): void {
        console.log('Admin message received:', payload.messageType);

        switch (payload.messageType) {
            case 'ping':
                // Respond to ping
                this.send('pong', {
                    requestId: payload.data?.requestId,
                    timestamp: new Date().toISOString()
                });
                break;

            case 'status_request':
                // Send status update
                this.sendStatusUpdate();
                break;

            default:
                this.emit('admin_message', payload);
                break;
        }
    }

    private handleErrorMessage(payload: any): void {
        console.error('Server error:', payload.error || payload);
        this.emit('error', payload);
    }

    private handleClose(event: CloseEvent): void {
        console.log('WebSocket disconnected:', event.code, event.reason);

        this.setConnectionStatus('disconnected');
        this.stopHeartbeat();
        this.authenticationSent = false;

        this.emit('connection', {
            status: 'disconnected',
            code: event.code,
            reason: event.reason
        });

        if (!this.isIntentionalDisconnect) {
            this.scheduleReconnect();
        }
    }

    private handleError(error: Event): void {
        console.error('WebSocket error:', error);
        this.setConnectionStatus('error');
        this.emit('error', {
            code: 'CONNECTION_ERROR',
            message: 'WebSocket connection error'
        });
    }

    private scheduleReconnect(): void {
        if (this.isIntentionalDisconnect) {
            return;
        }

        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Max reconnection attempts reached');
            this.setConnectionStatus('error');
            this.emit('connection', { status: 'failed' });
            return;
        }

        this.reconnectAttempts++;
        const delay = Math.min(
            this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1),
            30000
        );

        console.log(`Scheduling reconnection attempt ${this.reconnectAttempts} in ${delay}ms`);

        this.reconnectTimeout = setTimeout(() => {
            if (!this.isIntentionalDisconnect) {
                console.log(`Reconnecting... (attempt ${this.reconnectAttempts})`);
                this.establishConnection();
            }
        }, delay);
    }

    private startHeartbeat(): void {
        this.stopHeartbeat();

        this.heartbeatInterval = setInterval(() => {
            if (this.ws?.readyState === WebSocket.OPEN && this.connectionStatus === 'authenticated') {
                this.send('heartbeat', {
                    timestamp: new Date().toISOString(),
                    deviceId: this.deviceConfig?.deviceId
                });

                // Check if server is responding to heartbeats
                const now = Date.now();
                if (this.lastHeartbeat > 0 && (now - this.lastHeartbeat) > this.heartbeatIntervalMs * 3) {
                    console.warn('Server not responding to heartbeats, connection may be stale');
                    this.ws?.close(1000, 'Heartbeat timeout');
                }
            }
        }, this.heartbeatIntervalMs);

        console.log('Heartbeat started');
    }

    private stopHeartbeat(): void {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
            console.log('Heartbeat stopped');
        }
    }

    private playNotificationSound(): void {
        try {
            const audio = new Audio('/sounds/notification.mp3');
            audio.volume = 0.5;
            audio.play().catch(error => {
                if (ENV.DEBUG_MODE) {
                    console.warn('Could not play notification sound:', error);
                }
            });
        } catch (error) {
            if (ENV.DEBUG_MODE) {
                console.warn('Notification sound not available:', error);
            }
        }
    }

    private vibrate(): void {
        if ('vibrate' in navigator) {
            navigator.vibrate([200, 100, 200]);
        }
    }

    private setConnectionStatus(status: ConnectionStatus): void {
        if (this.connectionStatus !== status) {
            const previousStatus = this.connectionStatus;
            this.connectionStatus = status;
            console.log(`WebSocket status changed: ${previousStatus} → ${status}`);
            this.emit('connection_status_changed', {
                status,
                previousStatus,
                timestamp: new Date().toISOString()
            });
        }
    }

    send(type: string, payload: any): void {
        const message = { type, payload };
        this.sendRaw(message);
    }

    private sendRaw(message: any): void {
        if (this.ws?.readyState === WebSocket.OPEN) {
            try {
                const jsonMessage = JSON.stringify(message);
                this.ws.send(jsonMessage);

                if (ENV.DEBUG_MODE && message.type !== 'heartbeat') {
                    console.log('WebSocket message sent:', message.type, message.payload);
                }
            } catch (error) {
                console.error('Failed to send WebSocket message:', error);
            }
        } else {
            console.warn(`WebSocket is not connected, cannot send message:`, message.type);
        }
    }

    on(event: string, callback: (data: any) => void): () => void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(callback);

        return () => this.off(event, callback);
    }

    off(event: string, callback: (data: any) => void): void {
        this.listeners.get(event)?.delete(callback);
    }

    private emit(event: string, data: any): void {
        const eventListeners = this.listeners.get(event);
        if (eventListeners) {
            eventListeners.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in WebSocket event listener for '${event}':`, error);
                }
            });
        }
    }

    /**
     * Send signature completion acknowledgment
     */
    acknowledgeSignatureCompletion(sessionId: string, success: boolean): void {
        this.send('signature_completed', {
            sessionId,
            success,
            timestamp: new Date().toISOString(),
            deviceId: this.deviceConfig?.deviceId
        });

        console.log('Signature completion acknowledged:', { sessionId, success });
    }

    /**
     * Send tablet status update
     */
    sendStatusUpdate(): void {
        const status = {
            batteryLevel: this.getBatteryLevel(),
            orientation: this.getOrientation(),
            isActive: true,
            timestamp: new Date().toISOString(),
            deviceId: this.deviceConfig?.deviceId
        };

        this.send('tablet_status', status);

        if (ENV.DEBUG_MODE) {
            console.log('Status update sent:', status);
        }
    }

    private getBatteryLevel(): number | null {
        // This would require the Battery API which is deprecated
        // Return null for now
        return null;
    }

    private getOrientation(): string {
        try {
            if (screen.orientation) {
                return screen.orientation.type;
            } else {
                return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
            }
        } catch (error) {
            return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
        }
    }

    /**
     * Get current connection status
     */
    getConnectionStatus(): ConnectionStatus {
        return this.connectionStatus;
    }

    /**
     * Check if WebSocket is connected and authenticated
     */
    isConnected(): boolean {
        return this.connectionStatus === 'connected' || this.connectionStatus === 'authenticated';
    }

    /**
     * Check if WebSocket is authenticated
     */
    isAuthenticated(): boolean {
        return this.connectionStatus === 'authenticated';
    }

    /**
     * Get WebSocket ready state
     */
    getReadyState(): number | null {
        return this.ws?.readyState || null;
    }

    /**
     * Force reconnection
     */
    reconnect(): void {
        if (this.deviceConfig) {
            console.log('Forcing WebSocket reconnection...');
            this.disconnect();
            setTimeout(() => {
                this.connect(this.deviceConfig!);
            }, 1000);
        } else {
            console.warn('Cannot reconnect - no device config available');
        }
    }

    /**
     * Disconnect WebSocket
     */
    disconnect(): void {
        this.isIntentionalDisconnect = true;

        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        this.stopHeartbeat();

        if (this.ws) {
            console.log('Closing WebSocket connection...');
            this.ws.close(1000, 'Client disconnect');
            this.ws = null;
        }

        this.setConnectionStatus('disconnected');
        this.reconnectAttempts = 0;
        this.authenticationSent = false;
    }

    /**
     * Cleanup - call when component unmounts
     */
    cleanup(): void {
        this.disconnect();
        this.listeners.clear();
    }
}

// Export singleton instance
export const tabletWebSocketHandler = new TabletWebSocketHandler();

// Export for debugging in browser console
if (ENV.DEBUG_MODE && typeof window !== 'undefined') {
    (window as any).tabletWebSocketHandler = tabletWebSocketHandler;
}