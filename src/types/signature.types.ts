export interface SignatureRequest {
    sessionId: string;
    customerId: string;
    customerName: string;
    vehicleInfo: {
        make: string;
        model: string;
        licensePlate: string;
        vin?: string;
    };
    serviceType: string;
    documentId: string;
    documentType: string;
    timestamp: string;
}

export interface SignatureData {
    sessionId: string;
    signatureImage: string; // base64
    signedAt: string;
    deviceId: string;
}