import React from 'react';
import StatusIndicator from '../StatusIndicator/StatusIndicator';
import styles from 'Layout.module.css';

interface LayoutProps {
    children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
    return (
        <div className={styles.layout}>
            <header className={styles.header}>
                <StatusIndicator />
            </header>
            <main className={styles.main}>
                {children}
            </main>
        </div>
    );
}