// src/contexts/DeviceContext.tsx
import { createContext, useContext, useState, useEffect } from 'react';
import { StorageService } from '../services/storage.service';
import { DeviceAPI } from '../api/endpoints/device';
import { wsClient } from '../api/websocket';
import { DeviceConfig, DeviceStatus, TenantBranding } from "../types/device.types";

interface DeviceContextValue {
    deviceConfig: DeviceConfig | null;
    deviceStatus: DeviceStatus;
    tenantBranding: TenantBranding | null;
    pairDevice: (config: DeviceConfig) => Promise<void>;
    unpairDevice: () => void;
    updateDeviceStatus: (status: DeviceStatus) => void;
    isOnline: boolean;
    batteryLevel: number | null;
    screenOrientation: string;
}

const DeviceContext = createContext<DeviceContextValue | null>(null);

export function DeviceProvider({ children }: { children: React.ReactNode }) {
    const [deviceConfig, setDeviceConfig] = useState<DeviceConfig | null>(null);
    const [deviceStatus, setDeviceStatus] = useState<DeviceStatus>(DeviceStatus.DISCONNECTED);
    const [tenantBranding, setTenantBranding] = useState<TenantBranding | null>(null);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
    const [screenOrientation, setScreenOrientation] = useState<string>('unknown');

    const storage = new StorageService();

    // Monitor online status
    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Monitor battery level
    useEffect(() => {
        let cleanup: (() => void) | undefined;

        const updateBatteryInfo = async (): Promise<void> => {
            try {
                if ('getBattery' in navigator && navigator.getBattery) {
                    const battery = await navigator.getBattery();
                    if (battery) {
                        setBatteryLevel(Math.round(battery.level * 100));

                        const handleBatteryChange = () => {
                            setBatteryLevel(Math.round(battery.level * 100));
                        };

                        battery.addEventListener('levelchange', handleBatteryChange);

                        // Store cleanup function
                        cleanup = () => {
                            battery.removeEventListener('levelchange', handleBatteryChange);
                        };
                    }
                }
            } catch (error) {
                console.warn('Battery API not available:', error);
            }
        };

        updateBatteryInfo();

        // Return cleanup function for useEffect
        return () => {
            if (cleanup) {
                cleanup();
            }
        };
    }, []);

    // Monitor screen orientation
    useEffect(() => {
        const updateOrientation = () => {
            try {
                if (screen.orientation) {
                    setScreenOrientation(screen.orientation.type);
                } else {
                    // Fallback for older browsers
                    const orientation = window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
                    setScreenOrientation(orientation);
                }
            } catch (error) {
                console.warn('Screen orientation API not available:', error);
                const orientation = window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
                setScreenOrientation(orientation);
            }
        };

        updateOrientation();

        // Listen for orientation changes
        const handleOrientationChange = () => {
            setTimeout(updateOrientation, 100); // Small delay to ensure window dimensions are updated
        };

        if (screen.orientation) {
            screen.orientation.addEventListener('change', updateOrientation);
        } else {
            window.addEventListener('resize', handleOrientationChange);
        }

        return () => {
            if (screen.orientation) {
                screen.orientation.removeEventListener('change', updateOrientation);
            } else {
                window.removeEventListener('resize', handleOrientationChange);
            }
        };
    }, []);

    // Load saved configuration on mount
    useEffect(() => {
        const loadSavedConfig = async () => {
            try {
                const savedConfig = storage.getDeviceConfig();
                const savedBranding = storage.getTenantBranding();

                if (savedConfig) {
                    setDeviceConfig(savedConfig);
                    setDeviceStatus(DeviceStatus.PAIRED);

                    // Validate device configuration with server
                    if (isOnline) {
                        await validateDeviceConfig(savedConfig);
                    }
                }

                if (savedBranding) {
                    setTenantBranding(savedBranding);
                    applyBrandingToCSS(savedBranding);
                }
            } catch (error) {
                console.error('Error loading saved configuration:', error);
            }
        };

        loadSavedConfig();
    }, [isOnline]);

    // Monitor WebSocket connection status
    useEffect(() => {
        const unsubscribeConnectionStatus = wsClient.on('connection_status_changed', ({ status }) => {
            switch (status) {
                case 'connected':
                case 'authenticated':
                    setDeviceStatus(DeviceStatus.CONNECTED);
                    break;
                case 'connecting':
                    setDeviceStatus(DeviceStatus.CONNECTING);
                    break;
                case 'disconnected':
                    setDeviceStatus(deviceConfig ? DeviceStatus.PAIRED : DeviceStatus.DISCONNECTED);
                    break;
                case 'error':
                    setDeviceStatus(DeviceStatus.ERROR);
                    break;
            }
        });

        const unsubscribeAuthFailed = wsClient.on('authentication_failed', () => {
            console.error('WebSocket authentication failed - device may need re-pairing');
            setDeviceStatus(DeviceStatus.ERROR);
        });

        return () => {
            unsubscribeConnectionStatus();
            unsubscribeAuthFailed();
        };
    }, [deviceConfig]);

    const validateDeviceConfig = async (config: DeviceConfig): Promise<boolean> => {
        try {
            const response = await DeviceAPI.getTabletInfo(config.deviceId);

            if (response.success && response.data) {
                // Update config with latest info from server
                const updatedConfig = { ...config, ...response.data };
                if (JSON.stringify(updatedConfig) !== JSON.stringify(config)) {
                    storage.saveDeviceConfig(updatedConfig);
                    setDeviceConfig(updatedConfig);
                }
                return true;
            } else {
                console.warn('Device validation failed:', response.error);
                if (response.error?.code === 'UNAUTHORIZED') {
                    // Device token is invalid, require re-pairing
                    unpairDevice();
                }
                return false;
            }
        } catch (error) {
            console.error('Error validating device config:', error);
            return false;
        }
    };

    const pairDevice = async (config: DeviceConfig): Promise<void> => {
        try {
            setDeviceStatus(DeviceStatus.CONNECTING);

            // Save device configuration
            storage.saveDeviceConfig(config);
            setDeviceConfig(config);

            // Fetch tenant branding if tenantId is available
            if (config.tenantId) {
                await fetchTenantBranding(config.tenantId);
            }

            // Connect WebSocket
            wsClient.connect(config);

            setDeviceStatus(DeviceStatus.PAIRED);

            console.log('Device paired successfully:', config.deviceId);

        } catch (error) {
            console.error('Error during device pairing:', error);
            setDeviceStatus(DeviceStatus.ERROR);
            throw error;
        }
    };

    const fetchTenantBranding = async (tenantId: string): Promise<void> => {
        try {
            const brandingResponse = await DeviceAPI.getTenantBranding(tenantId);

            if (brandingResponse.success && brandingResponse.data) {
                const branding = brandingResponse.data;

                storage.saveTenantBranding(branding);
                setTenantBranding(branding);
                applyBrandingToCSS(branding);

                console.log('Tenant branding loaded successfully');
            } else {
                console.warn('Could not load tenant branding:', brandingResponse.error);
                // Use default branding
                const defaultBranding: TenantBranding = {
                    primaryColor: '#1a1a1a',
                    secondaryColor: '#0066ff',
                    logoUrl: '',
                    companyName: 'CRM System'
                };
                setTenantBranding(defaultBranding);
                applyBrandingToCSS(defaultBranding);
            }
        } catch (error) {
            console.error('Error fetching tenant branding:', error);
        }
    };

    const applyBrandingToCSS = (branding: TenantBranding): void => {
        try {
            const root = document.documentElement;
            root.style.setProperty('--primary-color', branding.primaryColor);
            root.style.setProperty('--secondary-color', branding.secondaryColor);

            // Update theme-color meta tag for mobile browsers
            const themeColorMeta = document.querySelector('meta[name="theme-color"]');
            if (themeColorMeta) {
                themeColorMeta.setAttribute('content', branding.primaryColor);
            }

            // Update title if company name is available
            if (branding.companyName) {
                document.title = `${branding.companyName} - Signature Pad`;
            }
        } catch (error) {
            console.error('Error applying branding to CSS:', error);
        }
    };

    const unpairDevice = (): void => {
        try {
            // Disconnect WebSocket
            wsClient.disconnect();

            // Clear storage
            storage.clearAll();

            // Reset state
            setDeviceConfig(null);
            setDeviceStatus(DeviceStatus.DISCONNECTED);
            setTenantBranding(null);

            // Reset CSS variables to defaults
            const root = document.documentElement;
            root.style.setProperty('--primary-color', '#1a1a1a');
            root.style.setProperty('--secondary-color', '#0066ff');

            // Reset title
            document.title = 'CRM Signature Pad';

            console.log('Device unpaired successfully');
        } catch (error) {
            console.error('Error during device unpairing:', error);
        }
    };

    const updateDeviceStatus = (status: DeviceStatus): void => {
        setDeviceStatus(status);

        // Send status update to server if connected
        if (deviceConfig && wsClient.isConnected()) {
            const statusInfo: {
                isActive?: boolean;
                batteryLevel?: number;
                orientation?: string;
            } = {
                isActive: status === DeviceStatus.CONNECTED
            };

            // Only add batteryLevel if it's not null
            if (batteryLevel !== null) {
                statusInfo.batteryLevel = batteryLevel;
            }

            // Always add orientation
            statusInfo.orientation = screenOrientation;

            wsClient.updateStatus(statusInfo);
        }
    };

    // Periodic status updates
    useEffect(() => {
        if (!deviceConfig || !wsClient.isConnected()) return;

        const interval = setInterval(() => {
            updateDeviceStatus(deviceStatus);
        }, 60000); // Every minute

        return () => clearInterval(interval);
    }, [deviceConfig, deviceStatus, batteryLevel, screenOrientation]);

    const contextValue: DeviceContextValue = {
        deviceConfig,
        deviceStatus,
        tenantBranding,
        pairDevice,
        unpairDevice,
        updateDeviceStatus,
        isOnline,
        batteryLevel,
        screenOrientation
    };

    return (
        <DeviceContext.Provider value={contextValue}>
            {children}
        </DeviceContext.Provider>
    );
}

export function useDevice(): DeviceContextValue {
    const context = useContext(DeviceContext);
    if (!context) {
        throw new Error('useDevice must be used within DeviceProvider');
    }
    return context;
}