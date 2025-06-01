import React, { createContext, useContext, useState, useEffect } from 'react';
import { StorageService } from '@services/storage.service';
import { apiClient } from '@api/client';
import {DeviceConfig, DeviceStatus, TenantBranding} from "../types/device.types";

interface DeviceContextValue {
    deviceConfig: DeviceConfig | null;
    deviceStatus: DeviceStatus;
    tenantBranding: TenantBranding | null;
    pairDevice: (config: DeviceConfig) => Promise<void>;
    unpairDevice: () => void;
}

const DeviceContext = createContext<DeviceContextValue | null>(null);

export function DeviceProvider({ children }: { children: React.ReactNode }) {
    const [deviceConfig, setDeviceConfig] = useState<DeviceConfig | null>(null);
    const [deviceStatus, setDeviceStatus] = useState<DeviceStatus>(DeviceStatus.DISCONNECTED);
    const [tenantBranding, setTenantBranding] = useState<TenantBranding | null>(null);

    const storage = new StorageService();

    useEffect(() => {
        // Load saved config
        const savedConfig = storage.getDeviceConfig();
        const savedBranding = storage.getTenantBranding();

        if (savedConfig) {
            setDeviceConfig(savedConfig);
            setDeviceStatus(DeviceStatus.PAIRED);
        }

        if (savedBranding) {
            setTenantBranding(savedBranding);
        }
    }, []);

    const pairDevice = async (config: DeviceConfig) => {
        storage.saveDeviceConfig(config);
        setDeviceConfig(config);
        setDeviceStatus(DeviceStatus.PAIRED);

        // Fetch tenant branding
        const brandingResponse = await apiClient.get<TenantBranding>(
            `/api/tenants/${config.tenantId}/branding`
        );

        if (brandingResponse.success && brandingResponse.data) {
            storage.saveTenantBranding(brandingResponse.data);
            setTenantBranding(brandingResponse.data);

            // Apply branding to CSS variables
            const root = document.documentElement;
            root.style.setProperty('--primary-color', brandingResponse.data.primaryColor);
            root.style.setProperty('--secondary-color', brandingResponse.data.secondaryColor);
        }
    };

    const unpairDevice = () => {
        storage.clearAll();
        setDeviceConfig(null);
        setDeviceStatus(DeviceStatus.DISCONNECTED);
        setTenantBranding(null);
    };

    return (
        <DeviceContext.Provider value={{
            deviceConfig,
            deviceStatus,
            tenantBranding,
            pairDevice,
            unpairDevice
        }}>
            {children}
        </DeviceContext.Provider>
    );
}

export function useDevice() {
    const context = useContext(DeviceContext);
    if (!context) {
        throw new Error('useDevice must be used within DeviceProvider');
    }
    return context;
}