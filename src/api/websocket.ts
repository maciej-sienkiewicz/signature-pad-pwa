// src/api/websocket.ts
import { DeviceConfig } from '../types/device.types';
import { ENV } from '../config/environment';
import { APP_CONFIG } from '../config/constants';

export type WebSocketMessage = {
    type: string;
    payload: any;
};

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error' | 'authenticated';

export class WebSocketClient {
    private ws: WebSocket | null = null;
    private reconnectAttempts = 0;
    private heartbeatInterval: NodeJS.Timeout | null = null;
    private reconnectTimeout: NodeJS.Timeout | null = null;
    private listeners: Map<string, Set<(data: any) => void>> = new Map();
    private deviceConfig: DeviceConfig | null = null;
    private connectionStatus: ConnectionStatus = 'disconnected';
    private lastHeartbeat: number = 0;
    private isIntentionalDisconnect = false;

    connect(deviceConfig: DeviceConfig): void {
        if (this.connectionStatus === 'connected' || this.connectionStatus === 'connecting') {
            console.log('WebSocket already connected or connecting');
            return;
        }

        this.deviceConfig = deviceConfig;
        this.isIntentionalDisconnect = false;
        this.establishConnection();
    }

    private establishConnection(): void {
        if (!this.deviceConfig) {
            console.error('No device config available for WebSocket connection');
            return;
        }

        this.setConnectionStatus('connecting');

        try {
            // Build WebSocket URL with proper authentication
            const wsUrl = new URL(`${ENV.WS_BASE_URL}/ws/tablet/${this.deviceConfig.deviceId}`);

            this.ws = new WebSocket(wsUrl.toString());

            // Set up event handlers
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

        // Send authentication message with device token
        this.sendAuthenticationMessage();

        this.startHeartbeat();
        this.emit('connection', { status: 'connected' });
    }

    private sendAuthenticationMessage(): void {
        if (!this.deviceConfig) return;

        const authMessage = {
            type: 'authentication',
            payload: {
                token: this.deviceConfig.deviceToken,
                deviceId: this.deviceConfig.deviceId,
                tenantId: this.deviceConfig.tenantId,
                locationId: this.deviceConfig.locationId,
                timestamp: new Date().toISOString()
            }
        };

        this.sendRaw(authMessage);
    }

    private handleMessage(event: MessageEvent): void {
        try {
            const message: WebSocketMessage = JSON.parse(event.data);

            if (ENV.DEBUG_MODE) {
                console.log('WebSocket message received:', message.type, message.payload);
            }

            // Handle specific message types
            switch (message.type) {
                case 'authentication':
                    this.handleAuthenticationResponse(message.payload);
                    break;

                case 'heartbeat':
                    this.handleHeartbeatResponse(message.payload);
                    break;

                case 'signature_request':
                    this.handleSignatureRequest(message.payload);
                    break;

                case 'connection':
                    this.handleConnectionMessage(message.payload);
                    break;

                case 'error':
                    this.handleErrorMessage(message.payload);
                    break;

                default:
                    // Emit to registered listeners
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
            this.emit('authenticated', payload);
        } else {
            console.error('WebSocket authentication failed:', payload.error);
            this.setConnectionStatus('error');
            this.emit('authentication_failed', payload);
        }
    }

    private handleHeartbeatResponse(_payload: any): void {
        this.lastHeartbeat = Date.now();
        if (ENV.DEBUG_MODE) {
            console.log('Heartbeat acknowledged by server');
        }
    }

    private handleSignatureRequest(payload: any): void {
        console.log('Signature request received:', payload.sessionId);

        // Validate signature request
        if (!payload.sessionId || !payload.customerName) {
            console.error('Invalid signature request received:', payload);
            return;
        }

        // Add notification vibration
        if ('vibrate' in navigator) {
            navigator.vibrate([200, 100, 200]);
        }

        // Play notification sound
        this.playNotificationSound();

        this.emit('signature_request', payload);
    }

    private handleConnectionMessage(payload: any): void {
        console.log('Connection status update:', payload.status);
        this.emit('connection', payload);
    }

    private handleErrorMessage(payload: any): void {
        console.error('Server error:', payload.error);
        this.emit('error', payload);
    }

    private handleClose(event: CloseEvent): void {
        console.log('WebSocket disconnected:', event.code, event.reason);

        this.setConnectionStatus('disconnected');
        this.stopHeartbeat();

        this.emit('connection', {
            status: 'disconnected',
            code: event.code,
            reason: event.reason
        });

        // Only attempt reconnection if not intentionally disconnected
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

        if (this.reconnectAttempts >= APP_CONFIG.WS_MAX_RECONNECT_ATTEMPTS) {
            console.error('Max reconnection attempts reached');
            this.setConnectionStatus('error');
            this.emit('connection', { status: 'failed' });
            return;
        }

        this.reconnectAttempts++;
        const delay = Math.min(
            APP_CONFIG.WS_RECONNECT_INTERVAL * Math.pow(2, this.reconnectAttempts - 1),
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
        this.stopHeartbeat(); // Clear any existing interval

        this.heartbeatInterval = setInterval(() => {
            if (this.ws?.readyState === WebSocket.OPEN) {
                this.send('heartbeat', {
                    timestamp: new Date().toISOString(),
                    deviceId: this.deviceConfig?.deviceId
                });

                // Check if server is responding to heartbeats
                const now = Date.now();
                if (this.lastHeartbeat > 0 && (now - this.lastHeartbeat) > APP_CONFIG.WS_HEARTBEAT_INTERVAL * 3) {
                    console.warn('Server not responding to heartbeats, connection may be stale');
                    this.ws?.close(1000, 'Heartbeat timeout');
                }
            }
        }, APP_CONFIG.WS_HEARTBEAT_INTERVAL);
    }

    private stopHeartbeat(): void {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    private playNotificationSound(): void {
        try {
            const audio = new Audio('/sounds/notification.mp3');
            audio.volume = 0.5;
            audio.play().catch(error => {
                console.warn('Could not play notification sound:', error);
            });
        } catch (error) {
            console.warn('Notification sound not available:', error);
        }
    }

    private setConnectionStatus(status: ConnectionStatus): void {
        if (this.connectionStatus !== status) {
            this.connectionStatus = status;
            this.emit('connection_status_changed', { status });
        }
    }

    send(type: string, payload: any): void {
        const message = { type, payload };
        this.sendRaw(message);
    }

    private sendRaw(message: any): void {
        if (this.ws?.readyState === WebSocket.OPEN) {
            try {
                this.ws.send(JSON.stringify(message));
                if (ENV.DEBUG_MODE && message.type !== 'heartbeat') {
                    console.log('WebSocket message sent:', message.type);
                }
            } catch (error) {
                console.error('Failed to send WebSocket message:', error);
            }
        } else {
            console.warn('WebSocket is not connected, cannot send message:', message.type);
        }
    }

    on(event: string, callback: (data: any) => void): () => void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(callback);

        // Return unsubscribe function
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
    }

    /**
     * Send tablet status update
     */
    updateStatus(status: {
        batteryLevel?: number;
        orientation?: string;
        isActive?: boolean;
    }): void {
        this.send('tablet_status', {
            ...status,
            timestamp: new Date().toISOString(),
            deviceId: this.deviceConfig?.deviceId
        });
    }

    getConnectionStatus(): ConnectionStatus {
        return this.connectionStatus;
    }

    isConnected(): boolean {
        return this.connectionStatus === 'connected' || this.connectionStatus === 'authenticated';
    }

    disconnect(): void {
        this.isIntentionalDisconnect = true;

        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        this.stopHeartbeat();

        if (this.ws) {
            this.ws.close(1000, 'Client disconnect');
            this.ws = null;
        }

        this.setConnectionStatus('disconnected');
        this.reconnectAttempts = 0;
    }
}

export const wsClient = new WebSocketClient();