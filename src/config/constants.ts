export const APP_CONFIG = {
    APP_NAME: 'CRM Signature Pad',
    APP_VERSION: '1.0.0',

    // WebSocket
    WS_RECONNECT_INTERVAL: 3000,
    WS_MAX_RECONNECT_ATTEMPTS: 10,
    WS_HEARTBEAT_INTERVAL: 30000,

    // Signature
    SIGNATURE_TIMEOUT: 120000, // 2 minutes
    SIGNATURE_MIN_POINTS: 10,

    // Storage keys
    STORAGE_KEYS: {
        DEVICE_CONFIG: 'device_config',
        TENANT_BRANDING: 'tenant_branding',
        LAST_SYNC: 'last_sync'
    },

    // API
    API_TIMEOUT: 10000,
    API_RETRY_ATTEMPTS: 3
};