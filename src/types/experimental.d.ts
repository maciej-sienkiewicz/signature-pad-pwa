// src/types/experimental.d.ts
// Simplified type definitions for experimental browser APIs to avoid conflicts

declare global {
    interface Navigator {
        getBattery?(): Promise<BatteryManagerCustom>;
    }

    interface BatteryManagerCustom extends EventTarget {
        readonly charging: boolean;
        readonly chargingTime: number;
        readonly dischargingTime: number;
        readonly level: number;
        onchargingchange: ((this: BatteryManagerCustom, ev: Event) => any) | null;
        onchargingtimechange: ((this: BatteryManagerCustom, ev: Event) => any) | null;
        ondischargingtimechange: ((this: BatteryManagerCustom, ev: Event) => any) | null;
        onlevelchange: ((this: BatteryManagerCustom, ev: Event) => any) | null;
        addEventListener(type: 'levelchange', listener: () => void): void;
        removeEventListener(type: 'levelchange', listener: () => void): void;
    }

    interface Screen {
        orientation?: ScreenOrientationCustom;
    }

    interface ScreenOrientationCustom {
        readonly angle: number;
        readonly type: string;
        addEventListener(type: 'change', listener: () => void): void;
        removeEventListener(type: 'change', listener: () => void): void;
    }

    // PWA Install prompt
    interface BeforeInstallPromptEvent extends Event {
        readonly platforms: string[];
        readonly userChoice: Promise<{
            outcome: 'accepted' | 'dismissed';
            platform: string;
        }>;
        prompt(): Promise<void>;
    }

    interface WindowEventMap {
        beforeinstallprompt: BeforeInstallPromptEvent;
    }

    // Device orientation permissions (iOS)
    interface Window {
        DeviceOrientationEvent?: {
            requestPermission?(): Promise<'granted' | 'denied'>;
        };
        DeviceMotionEvent?: {
            requestPermission?(): Promise<'granted' | 'denied'>;
        };
    }
}

export {};