// src/config/environment.ts
const getEnvVar = (key: string, defaultValue = ''): string => {
    return process.env[key] || defaultValue;
};

export const ENV = {
    API_BASE_URL: getEnvVar('REACT_APP_API_BASE_URL', '/api'),
    // WS_BASE_URL: getEnvVar('REACT_APP_WS_BASE_URL', 'ws://localhost:8080'),
    ENVIRONMENT: getEnvVar('REACT_APP_ENVIRONMENT', 'development'),
    DEBUG_MODE: getEnvVar('REACT_APP_DEBUG_MODE', 'true') === 'true'
};
//
// // Validation for required environment variables
// if (ENV.ENVIRONMENT === 'production' && (!ENV.API_BASE_URL || !ENV.WS_BASE_URL)) {
//     throw new Error('Missing required environment variables for production');
// }
