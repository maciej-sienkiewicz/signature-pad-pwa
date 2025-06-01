import { ApiResponse } from '../types/api.types';
import { ENV } from '../config/environment';
import { APP_CONFIG } from '../config/constants';
import { StorageService } from '../services/storage.service';

class ApiClient {
    private baseURL: string;
    private timeout: number;
    private storage: StorageService;

    constructor() {
        this.baseURL = ENV.API_BASE_URL;
        this.timeout = APP_CONFIG.API_TIMEOUT;
        this.storage = new StorageService();
    }

    private async getHeaders(): Promise<Record<string, string>> {
        const deviceConfig = this.storage.getDeviceConfig();

        return {
            'Content-Type': 'application/json',
            'X-App-Version': APP_CONFIG.APP_VERSION,
            ...(deviceConfig && {
                'X-Device-Id': deviceConfig.deviceId,
                'X-Device-Token': deviceConfig.deviceToken,
                'X-Tenant-Id': deviceConfig.tenantId
            })
        };
    }

    private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
        if (!response.ok) {
            const error = await response.json().catch(() => ({
                code: 'UNKNOWN_ERROR',
                message: 'An unexpected error occurred'
            }));

            return {
                success: false,
                error
            };
        }

        const data = await response.json();
        return {
            success: true,
            data
        };
    }

    async get<T>(endpoint: string): Promise<ApiResponse<T>> {
        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                method: 'GET',
                headers: await this.getHeaders(),
                signal: AbortSignal.timeout(this.timeout)
            });

            return this.handleResponse<T>(response);
        } catch (error) {
            return {
                success: false,
                error: {
                    code: 'NETWORK_ERROR',
                    message: error instanceof Error ? error.message : 'Network error'
                }
            };
        }
    }

    async post<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                method: 'POST',
                headers: await this.getHeaders(),
                body: data ? JSON.stringify(data) : undefined,
                signal: AbortSignal.timeout(this.timeout)
            });

            return this.handleResponse<T>(response);
        } catch (error) {
            return {
                success: false,
                error: {
                    code: 'NETWORK_ERROR',
                    message: error instanceof Error ? error.message : 'Network error'
                }
            };
        }
    }
}

export const apiClient = new ApiClient();