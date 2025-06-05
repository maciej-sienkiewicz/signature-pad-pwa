// src/api/endpoints/simple-signature.ts
import { apiClient } from '../client';
import { ApiResponse } from '../../types/api.types';

export interface SimpleSignatureSubmissionRequest {
    sessionId: string;
    signatureImage: string; // base64 encoded PNG
    signedAt: string; // ISO string
    deviceId: string;
}

export interface SimpleSignatureResponse {
    success: boolean;
    sessionId: string;
    message: string;
    signedAt?: string;
    signatureImageUrl?: string;
}

export interface SimpleSignatureSession {
    sessionId: string;
    tabletId: string;
    companyId: number;
    signerName: string;
    signatureTitle: string;
    instructions?: string;
    businessContext?: Record<string, any>;
    signatureType: string;
    externalReference?: string;
    status: 'PENDING' | 'SENT_TO_TABLET' | 'IN_PROGRESS' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED' | 'ERROR';
    createdAt: string;
    expiresAt: string;
    signedAt?: string;
    signatureImageUrl?: string;
}

export class SimpleSignatureAPI {
    /**
     * Submit a simple signature
     */
    static async submitSignature(submission: SimpleSignatureSubmissionRequest): Promise<ApiResponse<SimpleSignatureResponse>> {
        try {
            // Validate signature data before sending
            if (!submission.signatureImage || !submission.signatureImage.startsWith('data:image/')) {
                throw new Error('Invalid signature image format');
            }

            if (!submission.sessionId || !submission.deviceId) {
                throw new Error('Missing required fields');
            }

            return await apiClient.post<SimpleSignatureResponse>('/signature/simple/submit', {
                sessionId: submission.sessionId,
                signatureImage: submission.signatureImage,
                signedAt: submission.signedAt,
                deviceId: submission.deviceId
            });

        } catch (error) {
            console.error('Error submitting simple signature:', error);
            return {
                success: false,
                error: {
                    code: 'SUBMISSION_ERROR',
                    message: error instanceof Error ? error.message : 'Failed to submit signature'
                }
            };
        }
    }

    /**
     * Get simple signature session details
     */
    static async getSignatureSession(sessionId: string): Promise<ApiResponse<SimpleSignatureSession>> {
        return apiClient.get<SimpleSignatureSession>(`/signature/simple/sessions/${sessionId}`);
    }

    /**
     * Cancel a simple signature session
     */
    static async cancelSignatureSession(sessionId: string, reason?: string): Promise<ApiResponse<void>> {
        return apiClient.post<void>(`/signature/simple/sessions/${sessionId}/cancel`, {
            reason
        });
    }

    /**
     * Get session status
     */
    static async getSessionStatus(sessionId: string): Promise<ApiResponse<{ status: string }>> {
        return apiClient.get<{ status: string }>(`/signature/simple/sessions/${sessionId}/status`);
    }

    /**
     * Download signature image
     */
    static async downloadSignature(sessionId: string): Promise<ApiResponse<Blob>> {
        try {
            const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/signature/simple/sessions/${sessionId}/signature`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('deviceToken')}`,
                    'X-Device-Id': localStorage.getItem('deviceId') || '',
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const blob = await response.blob();
            return {
                success: true,
                data: blob
            };
        } catch (error) {
            return {
                success: false,
                error: {
                    code: 'DOWNLOAD_ERROR',
                    message: error instanceof Error ? error.message : 'Failed to download signature'
                }
            };
        }
    }

    /**
     * Get list of simple signature sessions (for admin/management)
     */
    static async getSignatureSessions(
        page: number = 0,
        size: number = 20,
        status?: string
    ): Promise<ApiResponse<{
        sessions: SimpleSignatureSession[];
        totalPages: number;
        totalElements: number;
    }>> {
        const params = new URLSearchParams({
            page: page.toString(),
            size: size.toString()
        });

        if (status) {
            params.append('status', status);
        }

        return apiClient.get<{
            sessions: SimpleSignatureSession[];
            totalPages: number;
            totalElements: number;
        }>(`/signature/simple/sessions?${params.toString()}`);
    }
}