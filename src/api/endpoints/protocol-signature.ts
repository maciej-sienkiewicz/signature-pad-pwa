// src/api/endpoints/protocol-signature.ts
import { apiClient } from '../client';
import { ApiResponse } from '../../types/api.types';

export interface ProtocolSignatureSubmissionRequest {
    sessionId: string;
    signatureImage: string; // base64 encoded PNG
    signedAt: string; // ISO string
    deviceId: string;
    signaturePlacement?: {
        fieldId?: string;
        page: number;
        x: number;
        y: number;
        width: number;
        height: number;
    };
}

export interface ProtocolSignatureResponse {
    success: boolean;
    sessionId: string;
    message: string;
    signedAt?: string;
    signedDocumentUrl?: string;
    signatureImageUrl?: string;
}

export class ProtocolSignatureAPI {
    /**
     * Submit a completed protocol signature
     */
    static async submitProtocolSignature(submission: ProtocolSignatureSubmissionRequest): Promise<ApiResponse<ProtocolSignatureResponse>> {
        try {
            // Validate signature data before sending
            if (!submission.signatureImage || !submission.signatureImage.startsWith('data:image/')) {
                throw new Error('Invalid signature image format');
            }

            if (!submission.sessionId || !submission.deviceId) {
                throw new Error('Missing required fields');
            }

            return await apiClient.post<ProtocolSignatureResponse>('/signatures/submit', {
                sessionId: submission.sessionId,
                signatureImage: submission.signatureImage,
                signedAt: submission.signedAt,
                deviceId: submission.deviceId,
            });

        } catch (error) {
            console.error('Error submitting protocol signature:', error);
            return {
                success: false,
                error: {
                    code: 'SUBMISSION_ERROR',
                    message: error instanceof Error ? error.message : 'Failed to submit protocol signature'
                }
            };
        }
    }

    /**
     * Get protocol signature session details
     */
    static async getProtocolSession(sessionId: string): Promise<ApiResponse<any>> {
        return apiClient.get<any>(`/document-signatures/sessions/${sessionId}`);
    }

    /**
     * Cancel a protocol signature session
     */
    static async cancelProtocolSession(sessionId: string, reason?: string): Promise<ApiResponse<void>> {
        return apiClient.post<void>(`/document-signatures/sessions/${sessionId}/cancel`, {
            reason
        });
    }

    /**
     * Acknowledge protocol viewing started
     */
    static async acknowledgeDocumentViewing(sessionId: string, status: string): Promise<ApiResponse<void>> {
        return apiClient.post<void>(`/document-signatures/sessions/${sessionId}/viewing-status`, {
            status,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Download protocol document for viewing
     */
    static async downloadProtocolDocument(sessionId: string): Promise<ApiResponse<Blob>> {
        try {
            const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/document-signatures/sessions/${sessionId}/document`, {
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
                    message: error instanceof Error ? error.message : 'Failed to download protocol document'
                }
            };
        }
    }
}