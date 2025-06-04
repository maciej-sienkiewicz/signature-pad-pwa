// src/config/constants.ts
export const APP_CONFIG = {
    APP_NAME: 'CRM Signature Pad',
    APP_VERSION: '1.0.0',

    // WebSocket Configuration
    WS_RECONNECT_INTERVAL: 3000,      // 3 seconds
    WS_MAX_RECONNECT_ATTEMPTS: 10,    // Max reconnection attempts
    WS_HEARTBEAT_INTERVAL: 30000,     // 30 seconds

    // Signature Configuration
    SIGNATURE_TIMEOUT: 300000,        // 5 minutes in milliseconds
    SIGNATURE_MIN_POINTS: 10,         // Minimum points for valid signature
    SIGNATURE_MAX_SIZE: 5000000,      // 5MB max signature size

    // Storage keys
    STORAGE_KEYS: {
        DEVICE_CONFIG: 'crm_device_config',
        TENANT_BRANDING: 'crm_tenant_branding',
        LAST_SYNC: 'crm_last_sync',
        APP_STATE: 'crm_app_state'
    },

    // API Configuration
    API_TIMEOUT: 15000,               // 15 seconds
    API_RETRY_ATTEMPTS: 3,            // Number of retry attempts
    API_RETRY_DELAY: 1000,           // Base delay for retries (ms)

    // Device Status Update Interval
    STATUS_UPDATE_INTERVAL: 60000,    // 1 minute

    // Battery and Performance
    LOW_BATTERY_THRESHOLD: 20,        // 20% battery
    PERFORMANCE_CHECK_INTERVAL: 30000, // 30 seconds

    // Cache Configuration
    CACHE_DURATION: 3600000,          // 1 hour in milliseconds
    MAX_CACHE_SIZE: 50,               // Maximum cached items

    // Error Handling
    MAX_ERROR_LOGS: 100,              // Maximum error logs to keep
    ERROR_REPORT_INTERVAL: 300000,    // 5 minutes

    // UI Configuration
    ANIMATION_DURATION: 300,          // Default animation duration (ms)
    DEBOUNCE_DELAY: 500,             // Input debounce delay (ms)
    TOAST_DURATION: 5000,            // Toast notification duration (ms)

    // Validation
    MIN_DEVICE_NAME_LENGTH: 3,
    MAX_DEVICE_NAME_LENGTH: 50,
    PAIRING_CODE_LENGTH: 6,

    // Feature Flags
    FEATURES: {
        OFFLINE_MODE: true,
        BIOMETRIC_AUTH: false,
        ADVANCED_DIAGNOSTICS: true,
        AUTO_UPDATE: true
    }
} as const;

// API Endpoints
export const API_ENDPOINTS = {
    // Device Management
    TABLETS: {
        REGISTER: '/tablets/register',
        PAIR: '/tablets/pair',
        INFO: (deviceId: string) => `/tablets/${deviceId}`,
        STATUS: (deviceId: string) => `/tablets/${deviceId}/status`
    },

    // Signatures
    SIGNATURES: {
        SUBMIT: '/signatures',
        GET: (sessionId: string) => `/signatures/${sessionId}`,
        CANCEL: (sessionId: string) => `/signatures/${sessionId}`,
        ACKNOWLEDGE: (sessionId: string) => `/signatures/${sessionId}/acknowledge`
    },

    // Tenant Management
    TENANTS: {
        BRANDING: (tenantId: string) => `/tenants/${tenantId}/branding`,
        INFO: (tenantId: string) => `/tenants/${tenantId}`
    },

    // System
    HEALTH: '/health',
    VERSION: '/version'
} as const;

// WebSocket Message Types
export const WS_MESSAGE_TYPES = {
    // Connection
    CONNECTION: 'connection',
    AUTHENTICATION: 'authentication',
    HEARTBEAT: 'heartbeat',

    // Signature Flow
    SIGNATURE_REQUEST: 'signature_request',
    SIGNATURE_COMPLETED: 'signature_completed',

    // Status Updates
    TABLET_STATUS: 'tablet_status',
    WORKSTATION_STATUS: 'workstation_status',

    // Errors
    ERROR: 'error'
} as const;

// Error Codes
export const ERROR_CODES = {
    // Network Errors
    NETWORK_ERROR: 'NETWORK_ERROR',
    TIMEOUT: 'TIMEOUT',
    CONNECTION_FAILED: 'CONNECTION_FAILED',

    // Authentication Errors
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',
    INVALID_TOKEN: 'INVALID_TOKEN',

    // Device Errors
    DEVICE_NOT_FOUND: 'DEVICE_NOT_FOUND',
    INVALID_PAIRING_CODE: 'INVALID_PAIRING_CODE',
    DEVICE_ALREADY_PAIRED: 'DEVICE_ALREADY_PAIRED',

    // Signature Errors
    SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
    SESSION_EXPIRED: 'SESSION_EXPIRED',
    INVALID_SIGNATURE: 'INVALID_SIGNATURE',
    SIGNATURE_TOO_LARGE: 'SIGNATURE_TOO_LARGE',

    // Server Errors
    SERVER_ERROR: 'SERVER_ERROR',
    SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
    RATE_LIMITED: 'RATE_LIMITED',

    // Validation Errors
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    INVALID_FORMAT: 'INVALID_FORMAT',
    MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD'
} as const;

// Device Capabilities
export const DEVICE_CAPABILITIES = {
    VIBRATION: 'vibrate' in navigator,
    WAKE_LOCK: 'wakeLock' in navigator,
    BATTERY_API: 'getBattery' in navigator,
    ORIENTATION_API: 'orientation' in screen,
    TOUCH_EVENTS: 'ontouchstart' in window,
    POINTER_EVENTS: 'onpointerdown' in window,
    FULLSCREEN_API: 'requestFullscreen' in document.documentElement
} as const;

// Performance Thresholds
export const PERFORMANCE_THRESHOLDS = {
    MEMORY_WARNING: 0.8,     // 80% memory usage
    MEMORY_CRITICAL: 0.9,    // 90% memory usage
    FPS_WARNING: 30,         // Below 30 FPS
    RESPONSE_TIME_WARNING: 1000, // Above 1 second
    SIGNATURE_POINTS_MIN: 50     // Minimum points for quality signature
} as const;