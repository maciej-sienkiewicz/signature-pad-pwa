// src/api/endpoints/device.ts
import { apiClient } from '../client';
import { ApiResponse } from '../../types/api.types';
import { DeviceConfig, TenantBranding } from '../../types/device.types';

export interface TabletRegistrationRequest {
    tenantId: string;
    locationId: string;
    workstationId?: string;
}

export interface TabletPairingRequest {
    code: string;
    deviceName: string;
}

export interface PairingCodeResponse {
    code: string;
    expiresIn: number;
}

export interface TabletCredentials {
    deviceId: string;
    deviceToken: string;
    websocketUrl: string;
}

export class DeviceAPI {
    /**
     * Initialize tablet registration and get pairing code
     */
    static async initiateRegistration(request: TabletRegistrationRequest): Promise<ApiResponse<PairingCodeResponse>> {
        return apiClient.post<PairingCodeResponse>('/tablets/register', request);
    }

    /**
     * Complete tablet pairing with the provided code
     */
    static async completePairing(request: TabletPairingRequest): Promise<ApiResponse<TabletCredentials>> {
        return apiClient.post<TabletCredentials>('/tablets/pair', request);
    }

    /**
     * Get tenant branding information
     */
    static async getTenantBranding(tenantId: string): Promise<ApiResponse<TenantBranding>> {
        return apiClient.get<TenantBranding>(`/tenants/${tenantId}/branding`);
    }

    /**
     * Update tablet status (heartbeat)
     */
    static async updateTabletStatus(deviceId: string, status: {
        batteryLevel?: number;
        orientation?: string;
        isActive: boolean;
    }): Promise<ApiResponse<void>> {
        return apiClient.post<void>(`/tablets/${deviceId}/status`, status);
    }

    /**
     * Get tablet information
     */
    static async getTabletInfo(deviceId: string): Promise<ApiResponse<DeviceConfig>> {
        return apiClient.get<DeviceConfig>(`/tablets/${deviceId}`);
    }
}