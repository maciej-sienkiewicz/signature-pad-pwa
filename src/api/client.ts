// src/api/client.ts
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

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-App-Version': APP_CONFIG.APP_VERSION,
            'X-Client-Type': 'tablet'
        };

        // Add device authentication if available
        if (deviceConfig) {
            headers['Authorization'] = `Bearer ${deviceConfig.deviceToken}`;
            headers['X-Device-Id'] = deviceConfig.deviceId;
            headers['X-Tenant-Id'] = deviceConfig.tenantId;

            if (deviceConfig.locationId) {
                headers['X-Location-Id'] = deviceConfig.locationId;
            }
        }

        return headers;
    }

    private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
        let responseData: any;

        try {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                responseData = await response.json();
            } else {
                responseData = await response.text();
            }
        } catch (error) {
            console.error('Failed to parse response:', error);
            responseData = null;
        }

        if (!response.ok) {
            // Handle different error response formats
            let errorCode = 'UNKNOWN_ERROR';
            let errorMessage = 'An unexpected error occurred';

            if (responseData) {
                if (typeof responseData === 'object') {
                    errorCode = responseData.code || responseData.error?.code || `HTTP_${response.status}`;
                    errorMessage = responseData.message || responseData.error?.message || response.statusText;
                } else if (typeof responseData === 'string') {
                    errorMessage = responseData;
                    errorCode = `HTTP_${response.status}`;
                }
            }

            // Handle specific HTTP status codes
            switch (response.status) {
                case 401:
                    errorCode = 'UNAUTHORIZED';
                    errorMessage = 'Device authentication failed';
                    // Clear device config on authentication failure
                    this.storage.clearDeviceConfig();
                    break;
                case 403:
                    errorCode = 'FORBIDDEN';
                    errorMessage = 'Access denied';
                    break;
                case 404:
                    errorCode = 'NOT_FOUND';
                    errorMessage = 'Resource not found';
                    break;
                case 429:
                    errorCode = 'RATE_LIMITED';
                    errorMessage = 'Too many requests';
                    break;
                case 500:
                    errorCode = 'SERVER_ERROR';
                    errorMessage = 'Internal server error';
                    break;
            }

            return {
                success: false,
                error: {
                    code: errorCode,
                    message: errorMessage
                }
            };
        }

        return {
            success: true,
            data: responseData
        };
    }

    private createAbortController(): AbortController {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), this.timeout);
        return controller;
    }

    async get<T>(endpoint: string): Promise<ApiResponse<T>> {
        try {
            const controller = this.createAbortController();

            const response = await fetch(`${this.baseURL}${endpoint}`, {
                method: 'GET',
                headers: await this.getHeaders(),
                signal: controller.signal
            });

            return this.handleResponse<T>(response);
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                return {
                    success: false,
                    error: {
                        code: 'TIMEOUT',
                        message: 'Request timeout'
                    }
                };
            }

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
            const controller = this.createAbortController();

            const requestInit: RequestInit = {
                method: 'POST',
                headers: await this.getHeaders(),
                signal: controller.signal
            };

            // Only add body if data exists
            if (data !== undefined) {
                requestInit.body = JSON.stringify(data);
            }

            const response = await fetch(`${this.baseURL}${endpoint}`, requestInit);

            return this.handleResponse<T>(response);
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                return {
                    success: false,
                    error: {
                        code: 'TIMEOUT',
                        message: 'Request timeout'
                    }
                };
            }

            return {
                success: false,
                error: {
                    code: 'NETWORK_ERROR',
                    message: error instanceof Error ? error.message : 'Network error'
                }
            };
        }
    }

    async put<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
        try {
            const controller = this.createAbortController();

            const requestInit: RequestInit = {
                method: 'PUT',
                headers: await this.getHeaders(),
                signal: controller.signal
            };

            // Only add body if data exists
            if (data !== undefined) {
                requestInit.body = JSON.stringify(data);
            }

            const response = await fetch(`${this.baseURL}${endpoint}`, requestInit);

            return this.handleResponse<T>(response);
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                return {
                    success: false,
                    error: {
                        code: 'TIMEOUT',
                        message: 'Request timeout'
                    }
                };
            }

            return {
                success: false,
                error: {
                    code: 'NETWORK_ERROR',
                    message: error instanceof Error ? error.message : 'Network error'
                }
            };
        }
    }

    async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
        try {
            const controller = this.createAbortController();

            const response = await fetch(`${this.baseURL}${endpoint}`, {
                method: 'DELETE',
                headers: await this.getHeaders(),
                signal: controller.signal
            });

            return this.handleResponse<T>(response);
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                return {
                    success: false,
                    error: {
                        code: 'TIMEOUT',
                        message: 'Request timeout'
                    }
                };
            }

            return {
                success: false,
                error: {
                    code: 'NETWORK_ERROR',
                    message: error instanceof Error ? error.message : 'Network error'
                }
            };
        }
    }

    /**
     * Health check endpoint
     */
    async healthCheck(): Promise<boolean> {
        try {
            const response = await this.get<{ status: string }>('/health');
            return response.success && response.data?.status === 'UP';
        } catch (error) {
            console.error('Health check failed:', error);
            return false;
        }
    }
}

export const apiClient = new ApiClient();