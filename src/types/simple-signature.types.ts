// src/types/simple-signature.types.ts

export interface SimpleSignatureRequest {
    sessionId: string;
    companyId: number;
    signerName: string;
    signatureTitle: string;
    instructions?: string;
    businessContext?: Record<string, any>;
    timeoutMinutes: number;
    expiresAt: string;
    externalReference?: string;
    signatureType: SimpleSignatureType;
}

export interface SimpleSignatureData {
    sessionId: string;
    signatureImage: string; // base64
    signedAt: string;
    deviceId: string;
}

export enum SimpleSignatureType {
    GENERAL = 'GENERAL',
    ACKNOWLEDGMENT = 'ACKNOWLEDGMENT',
    AGREEMENT = 'AGREEMENT',
    RECEIPT = 'RECEIPT',
    AUTHORIZATION = 'AUTHORIZATION',
    WITNESS = 'WITNESS',
    CUSTOM = 'CUSTOM'
}

export enum SimpleSignatureStatus {
    PENDING = 'PENDING',
    SENT_TO_TABLET = 'SENT_TO_TABLET',
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETED = 'COMPLETED',
    EXPIRED = 'EXPIRED',
    CANCELLED = 'CANCELLED',
    ERROR = 'ERROR'
}

export interface SimpleSignatureSession {
    sessionId: string;
    tabletId: string;
    companyId: number;
    signerName: string;
    signatureTitle: string;
    instructions?: string;
    businessContext?: Record<string, any>;
    signatureType: SimpleSignatureType;
    externalReference?: string;
    status: SimpleSignatureStatus;
    createdAt: string;
    expiresAt: string;
    signedAt?: string;
    signatureImageUrl?: string;
}