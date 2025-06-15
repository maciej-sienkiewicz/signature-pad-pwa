// src/components/SignaturePad/SignatureCanvas.tsx - POPRAWIONA WERSJA
import { forwardRef, useImperativeHandle, useRef } from 'react';
import SignatureCanvasLib from 'react-signature-canvas';
import styles from './SignaturePad.module.css';

export interface SignatureCanvasRef {
    clear: () => void;
    isEmpty: () => boolean;
    toDataURL: (type?: string) => string;
    getTrimmedCanvas: () => HTMLCanvasElement;
}

const SignatureCanvas = forwardRef<SignatureCanvasRef, any>((props, ref) => {
    const canvasRef = useRef<SignatureCanvasLib>(null);

    useImperativeHandle(ref, () => ({
        clear: () => {
            if (canvasRef.current) {
                canvasRef.current.clear();
            }
        },
        isEmpty: () => {
            if (!canvasRef.current) {
                return true;
            }
            return canvasRef.current.isEmpty();
        },
        toDataURL: (type?: string) => {
            if (!canvasRef.current) {
                return '';
            }
            return canvasRef.current.toDataURL(type);
        },
        getTrimmedCanvas: () => {
            if (!canvasRef.current) {
                throw new Error('Canvas not available');
            }
            return canvasRef.current.getTrimmedCanvas();
        }
    }));

    return (
        <div className={styles.canvas}>
            <SignatureCanvasLib
                ref={canvasRef}
                canvasProps={{
                    className: styles.signatureCanvas
                }}
                backgroundColor="white"
                penColor="#1a1a1a"
                minWidth={1}
                maxWidth={3}
                velocityFilterWeight={0.7}
                {...props}
            />
            <div className={styles.signatureLine}>
                <span>Podpis klienta</span>
            </div>
        </div>
    );
});

SignatureCanvas.displayName = 'SignatureCanvas';

export default SignatureCanvas;