const getEnvVar = (key: string, defaultValue = ''): string => {
    return process.env[key] || defaultValue;
};

export const ENV = {
    API_BASE_URL: getEnvVar('REACT_APP_API_BASE_URL', 'https://api.crm.com'),
    WS_BASE_URL: getEnvVar('REACT_APP_WS_BASE_URL', 'wss://api.crm.com'),
    ENVIRONMENT: getEnvVar('REACT_APP_ENVIRONMENT', 'production'),
    DEBUG_MODE: getEnvVar('REACT_APP_DEBUG_MODE', 'false') === 'true'
};