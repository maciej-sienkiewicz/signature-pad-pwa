// src/types/protocol-signature.types.ts - ROZSZERZONA WERSJA

export interface ProtocolSignatureRequest {
    sessionId: string;
    documentId: string;
    companyId: number;
    signerName: string;
    signatureTitle: string;
    documentTitle: string;
    documentType: string;
    pageCount: number;
    previewUrls: string[]; // Usuń to - nie potrzebne
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

    // NOWE POLA dla dokumentu
    documentData: string; // Base64 encoded PDF
    documentSize: number; // Size in bytes for validation
    documentHash?: string; // Optional hash for verification
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