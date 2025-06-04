// src/api/endpoints/signature.ts
import { apiClient } from '../client';
import { ApiResponse } from '../../types/api.types';

export interface SignatureSubmissionRequest {
    sessionId: string;
    signatureImage: string; // base64 encoded PNG
    signedAt: string; // ISO string
    deviceId: string;
}

export interface SignatureResponse {
    success: boolean;
    sessionId: string;
    message: string;
    signedAt?: string;
    documentUrl?: string;
}

export interface SignatureSession {
    sessionId: string;
    status: 'PENDING' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED';
    customerName: string;
    vehicleInfo?: {
        make: string;
        model: string;
        licensePlate: string;
        vin?: string;
    };
    serviceType?: string;
    documentType?: string;
    createdAt: string;
    expiresAt: string;
    signedAt?: string;
    hasSignature: boolean;
}

export class SignatureAPI {
    /**
     * Submit a completed signature
     */
    static async submitSignature(submission: SignatureSubmissionRequest): Promise<ApiResponse<SignatureResponse>> {
        try {
            // Validate signature data before sending
            if (!submission.signatureImage || !submission.signatureImage.startsWith('data:image/')) {
                throw new Error('Invalid signature image format');
            }

            if (!submission.sessionId || !submission.deviceId) {
                throw new Error('Missing required fields');
            }

            // Add device authentication headers will be handled by apiClient
            return await apiClient.post<SignatureResponse>('/signatures', {
                sessionId: submission.sessionId,
                signatureImage: submission.signatureImage,
                signedAt: submission.signedAt,
                deviceId: submission.deviceId
            });

        } catch (error) {
            console.error('Error submitting signature:', error);
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
     * Get signature session details
     */
    static async getSignatureSession(sessionId: string): Promise<ApiResponse<SignatureSession>> {
        return apiClient.get<SignatureSession>(`/signatures/${sessionId}`);
    }

    /**
     * Cancel a signature session (if allowed)
     */
    static async cancelSignatureSession(sessionId: string): Promise<ApiResponse<void>> {
        return apiClient.delete<void>(`/signatures/${sessionId}`);
    }

    /**
     * Acknowledge signature completion (tablet -> server notification)
     */
    static async acknowledgeCompletion(sessionId: string, success: boolean): Promise<ApiResponse<void>> {
        return apiClient.post<void>(`/signatures/${sessionId}/acknowledge`, {
            success,
            timestamp: new Date().toISOString()
        });
    }
}