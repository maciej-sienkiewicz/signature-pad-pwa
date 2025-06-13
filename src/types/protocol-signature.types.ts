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