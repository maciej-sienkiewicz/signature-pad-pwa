// src/types/device.types.ts
export interface DeviceConfig {
    deviceId: string;
    deviceToken: string;
    tenantId: string;
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

export enum DeviceStatus {
    DISCONNECTED = 'DISCONNECTED',
    CONNECTING = 'CONNECTING',
    CONNECTED = 'CONNECTED',
    PAIRED = 'PAIRED',
    ERROR = 'ERROR'
}