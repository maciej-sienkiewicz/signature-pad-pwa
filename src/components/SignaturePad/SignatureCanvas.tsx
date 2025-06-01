import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import SignatureCanvasLib from 'react-signature-canvas';
import styles from './SignaturePad.module.css';

const SignatureCanvas = forwardRef((props, ref) => {
    const canvasRef = useRef<SignatureCanvasLib>(null);

    useImperativeHandle(ref, () => ({
        clear: () => canvasRef.current?.clear(),
        isEmpty: () => canvasRef.current?.isEmpty() || true,
        toDataURL: (type?: string) => canvasRef.current?.toDataURL(type)
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
            />
            <div className={styles.signatureLine}>
                <span>Podpis klienta</span>
            </div>
        </div>
    );
});

SignatureCanvas.displayName = 'SignatureCanvas';

export default SignatureCanvas;