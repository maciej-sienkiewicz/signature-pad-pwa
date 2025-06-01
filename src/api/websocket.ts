import { ENV } from '@config/environment';
import { APP_CONFIG } from '@config/constants';
import { DeviceConfig } from '../types/device.types';

export type WebSocketMessage = {
    type: string;
    payload: any;
};

export class WebSocketClient {
    private ws: WebSocket | null = null;
    private reconnectAttempts = 0;
    private heartbeatInterval: NodeJS.Timeout | null = null;
    private reconnectTimeout: NodeJS.Timeout | null = null;
    private listeners: Map<string, Set<(data: any) => void>> = new Map();
    private deviceConfig: DeviceConfig | null = null;

    connect(deviceConfig: DeviceConfig): void {
        this.deviceConfig = deviceConfig;
        this.establishConnection();
    }

    private establishConnection(): void {
        if (this.ws?.readyState === WebSocket.OPEN) return;

        const wsUrl = `${ENV.WS_BASE_URL}/ws/tablet/${this.deviceConfig?.deviceId}`;

        this.ws = new WebSocket(wsUrl, {
            headers: {
                'X-Device-Token': this.deviceConfig?.deviceToken || '',
                'X-Tenant-Id': this.deviceConfig?.tenantId || ''
            }
        } as any);

        this.ws.onopen = this.handleOpen.bind(this);
        this.ws.onmessage = this.handleMessage.bind(this);
        this.ws.onclose = this.handleClose.bind(this);
        this.ws.onerror = this.handleError.bind(this);
    }

    private handleOpen(): void {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        this.emit('connection', { status: 'connected' });
    }

    private handleMessage(event: MessageEvent): void {
        try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.emit(message.type, message.payload);
        } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
        }
    }

    private handleClose(): void {
        console.log('WebSocket disconnected');
        this.stopHeartbeat();
        this.emit('connection', { status: 'disconnected' });
        this.scheduleReconnect();
    }

    private handleError(error: Event): void {
        console.error('WebSocket error:', error);
        this.emit('error', error);
    }

    private scheduleReconnect(): void {
        if (this.reconnectAttempts >= APP_CONFIG.WS_MAX_RECONNECT_ATTEMPTS) {
            console.error('Max reconnection attempts reached');
            this.emit('connection', { status: 'failed' });
            return;
        }

        this.reconnectAttempts++;
        const delay = Math.min(
            APP_CONFIG.WS_RECONNECT_INTERVAL * Math.pow(2, this.reconnectAttempts - 1),
            30000
        );

        this.reconnectTimeout = setTimeout(() => {
            console.log(`Reconnecting... (attempt ${this.reconnectAttempts})`);
            this.establishConnection();
        }, delay);
    }

    private startHeartbeat(): void {
        this.heartbeatInterval = setInterval(() => {
            if (this.ws?.readyState === WebSocket.OPEN) {
                this.send('heartbeat', { timestamp: new Date().toISOString() });
            }
        }, APP_CONFIG.WS_HEARTBEAT_INTERVAL);
    }

    private stopHeartbeat(): void {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    send(type: string, payload: any): void {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type, payload }));
        } else {
            console.warn('WebSocket is not connected');
        }
    }

    on(event: string, callback: (data: any) => void): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(callback);
    }

    off(event: string, callback: (data: any) => void): void {
        this.listeners.get(event)?.delete(callback);
    }

    private emit(event: string, data: any): void {
        this.listeners.get(event)?.forEach(callback => callback(data));
    }

    disconnect(): void {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
        }
        this.stopHeartbeat();
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}

export const wsClient = new WebSocketClient();