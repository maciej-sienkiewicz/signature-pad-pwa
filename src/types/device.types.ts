// src/types/device.types.ts
export interface DeviceConfig {
    deviceId: string;
    deviceToken: string;
    companyId: number;        // Changed from tenantId to companyId (number)
    locationId: string;
    friendlyName: string;
    workstationId?: string;
}

export interface TenantBranding {
    primaryColor: string;
    secondaryColor: string;
    logoUrl: string;
    companyName: string;
    welcomeMessage?: string;
}

// Keep TenantBranding name for backwards compatibility even though it's now company-based
export type CompanyBranding = TenantBranding;

export enum DeviceStatus {
    DISCONNECTED = 'DISCONNECTED',
    CONNECTING = 'CONNECTING',
    CONNECTED = 'CONNECTED',
    PAIRED = 'PAIRED',
    ERROR = 'ERROR'
}