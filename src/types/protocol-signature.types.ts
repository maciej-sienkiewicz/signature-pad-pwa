// src/types/protocol-signature.types.ts
export interface ProtocolSignatureRequest {
    sessionId: string;
    documentId: string;
    companyId: number;
    signerName: string;
    signatureTitle: string;
    documentTitle: string;
    documentType: string;
    pageCount: number;
    previewUrls: string[];
    instructions?: string;
    businessContext?: {
        protocolId: number;
        documentType: string;
        source?: string;
        [key: string]: any;
    };
    timeoutMinutes: number;
    expiresAt: string;
    signatureFields?: SignatureFieldDefinition[];
}

export interface SignatureFieldDefinition {
    fieldId: string;
    page: number;
    x: number;
    y: number;
    width: number;
    height: number;
    required: boolean;
    label?: string;
}

export interface ProtocolSignatureData {
    sessionId: string;
    signatureImage: string; // base64
    signedAt: string;
    deviceId: string;
    signaturePlacement?: SignaturePlacement;
}

export interface SignaturePlacement {
    fieldId?: string;
    page: number;
    x: number;
    y: number;
    width: number;
    height: number;
}

export enum ProtocolSignatureStatus {
    PENDING = 'PENDING',
    GENERATING_PDF = 'GENERATING_PDF',
    SENT_TO_TABLET = 'SENT_TO_TABLET',
    VIEWING_DOCUMENT = 'VIEWING_DOCUMENT',
    SIGNING_IN_PROGRESS = 'SIGNING_IN_PROGRESS',
    COMPLETED = 'COMPLETED',
    EXPIRED = 'EXPIRED',
    CANCELLED = 'CANCELLED',
    ERROR = 'ERROR'
}