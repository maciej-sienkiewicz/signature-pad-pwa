// src/contexts/SignatureContext.tsx
import React, { createContext, useContext } from 'react';

interface SignatureContextValue {}

const SignatureContext = createContext<SignatureContextValue | null>(null);

export function SignatureProvider({ children }: { children: React.ReactNode }) {
    return (
        <SignatureContext.Provider value={{}}>
            {children}
        </SignatureContext.Provider>
    );
}

export function useSignature() {
    const context = useContext(SignatureContext);
    if (!context) {
        throw new Error('useSignature must be used within SignatureProvider');
    }
    return context;
}