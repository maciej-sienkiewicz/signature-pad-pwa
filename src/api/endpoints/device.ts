// src/api/endpoints/device.ts
import { apiClient } from '../client';
import { ApiResponse } from '../../types/api.types';
import { DeviceConfig, TenantBranding } from '../../types/device.types';

// Updated request interfaces to match new backend API
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
    deviceToken: string;        // JWT token from backend
    websocketUrl: string;
}

export class DeviceAPI {
    /**
     * Complete tablet pairing with the provided code
     * Note: Registration is now handled by the main CRM app, not the tablet
     */
    static async completePairing(request: TabletPairingRequest): Promise<ApiResponse<TabletCredentials>> {
        return apiClient.post<TabletCredentials>('/tablets/pair', request);
    }

    /**
     * Get company branding information
     * Updated to use companyId instead of tenantId
     */
    static async getCompanyBranding(companyId: number): Promise<ApiResponse<TenantBranding>> {
        return apiClient.get<TenantBranding>(`/companies/${companyId}/branding`);
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

    /**
     * Test endpoint for development - generates pairing code
     * This is for development/testing purposes only
     */
    static async generateTestPairingCode(): Promise<ApiResponse<PairingCodeResponse>> {
        // This endpoint should only be available in development
        if (process.env.REACT_APP_ENVIRONMENT !== 'development') {
            return {
                success: false,
                error: {
                    code: 'NOT_AVAILABLE',
                    message: 'This endpoint is only available in development mode'
                }
            };
        }

        return apiClient.post<PairingCodeResponse>('/tablets/dev/generate-pairing-code', {});
    }
}