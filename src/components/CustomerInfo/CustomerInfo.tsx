// src/components/CustomerInfo/CustomerInfo.tsx
import { SignatureRequest } from '../../types/signature.types';
import styles from './CustomerInfo.module.css';

interface CustomerInfoProps {
    request: SignatureRequest;
}

export default function CustomerInfo({ request }: CustomerInfoProps) {
    return (
        <div className={styles.container}>
            <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Dane klienta</h3>
                <p className={styles.customerName}>{request.customerName}</p>
            </div>

            <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Pojazd</h3>
                <div className={styles.vehicleInfo}>
                    <p className={styles.vehicleMake}>
                        {request.vehicleInfo.make} {request.vehicleInfo.model}
                    </p>
                    <p className={styles.vehiclePlate}>
                        {request.vehicleInfo.licensePlate}
                    </p>
                </div>
            </div>

            <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Usługa</h3>
                <p className={styles.serviceType}>{request.serviceType}</p>
            </div>
        </div>
    );
}