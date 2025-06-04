// src/types/signature.types.ts
export interface SignatureRequest {
    sessionId: string;
    companyId: number;          // Changed from customerId, now numeric companyId
    workstationId: string;      // Added workstationId
    customerName: string;
    vehicleInfo: {
        make: string;
        model: string;
        licensePlate: string;
        vin?: string;
    };
    serviceType: string;
    documentId?: string;        // Made optional
    documentType: string;
    timestamp: string;
    // Additional fields that might come from backend
    additionalNotes?: string;
}

export interface SignatureData {
    sessionId: string;
    signatureImage: string; // base64
    signedAt: string;
    deviceId: string;
}