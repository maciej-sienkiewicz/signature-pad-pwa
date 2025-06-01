import { DeviceConfig, TenantBranding } from '../types/device.types';
import { APP_CONFIG } from '../config/constants';

export class StorageService {
    private storage: Storage;

    constructor() {
        this.storage = window.localStorage;
    }

    // Device config
    saveDeviceConfig(config: DeviceConfig): void {
        this.storage.setItem(
            APP_CONFIG.STORAGE_KEYS.DEVICE_CONFIG,
            JSON.stringify(config)
        );
    }

    getDeviceConfig(): DeviceConfig | null {
        const data = this.storage.getItem(APP_CONFIG.STORAGE_KEYS.DEVICE_CONFIG);
        return data ? JSON.parse(data) : null;
    }

    clearDeviceConfig(): void {
        this.storage.removeItem(APP_CONFIG.STORAGE_KEYS.DEVICE_CONFIG);
    }

    // Tenant branding
    saveTenantBranding(branding: TenantBranding): void {
        this.storage.setItem(
            APP_CONFIG.STORAGE_KEYS.TENANT_BRANDING,
            JSON.stringify(branding)
        );
    }

    getTenantBranding(): TenantBranding | null {
        const data = this.storage.getItem(APP_CONFIG.STORAGE_KEYS.TENANT_BRANDING);
        return data ? JSON.parse(data) : null;
    }

    // Last sync
    updateLastSync(): void {
        this.storage.setItem(
            APP_CONFIG.STORAGE_KEYS.LAST_SYNC,
            new Date().toISOString()
        );
    }

    getLastSync(): Date | null {
        const data = this.storage.getItem(APP_CONFIG.STORAGE_KEYS.LAST_SYNC);
        return data ? new Date(data) : null;
    }

    // Clear all
    clearAll(): void {
        Object.values(APP_CONFIG.STORAGE_KEYS).forEach(key => {
            this.storage.removeItem(key);
        });
    }
}