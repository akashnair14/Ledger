import { syncEngine } from './engine';
import { db } from '../db';

const AUTO_SYNC_KEY = 'last_auto_sync';
const FREQUENCY_KEY = 'backup_frequency';

// Intervals in milliseconds
const INTERVALS = {
    'DAILY': 24 * 60 * 60 * 1000,
    'WEEKLY': 7 * 24 * 60 * 60 * 1000,
    'MONTHLY': 30 * 24 * 60 * 60 * 1000,
    'MANUAL': Infinity, // Never auto-sync
};

export type BackupFrequency = keyof typeof INTERVALS;

export class AutoSyncService {
    private isSyncing = false;

    async init() {
        if (typeof window === 'undefined') return;

        // Listen for visibility changes (app focus)
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                this.triggerSync();
            }
        });

        // Listen for online status
        window.addEventListener('online', () => {
            this.triggerSync();
        });

        // Initial trigger
        this.triggerSync();
    }

    async triggerSync() {
        if (this.isSyncing) return;

        const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
        if (!clientId) return;

        try {
            const frequency = await this.getFrequency();
            if (frequency === 'MANUAL') return;

            const lastSync = await this.getLastSync();
            const now = Date.now();
            const interval = INTERVALS[frequency];

            // Only sync if enough time has passed
            if (now - lastSync > interval) {
                this.isSyncing = true;

                // Silent sync attempt
                // Check if password exists in session or local
                const savedPass = localStorage.getItem('sync_password');
                if (savedPass) {
                    await syncEngine.setPassword(savedPass);
                    console.log(`Starting auto-backup (${frequency})...`);
                    await syncEngine.sync(clientId);
                    await this.setLastSync(now);
                    console.log('Background Auto-Sync completed');
                }
            }
        } catch (err) {
            console.error('Auto-Sync failed:', err);
        } finally {
            this.isSyncing = false;
        }
    }

    private async getLastSync(): Promise<number> {
        const meta = await db.syncMetadata.get(AUTO_SYNC_KEY);
        return meta ? Number(meta.value) : 0;
    }

    private async setLastSync(time: number) {
        await db.syncMetadata.put({ key: AUTO_SYNC_KEY, value: time.toString() });
    }

    async getFrequency(): Promise<BackupFrequency> {
        const setting = await db.settings.get(FREQUENCY_KEY);
        return (setting?.value as BackupFrequency) || 'MANUAL'; // Default to manual/off
    }

    async setFrequency(freq: BackupFrequency) {
        await db.settings.put({ key: FREQUENCY_KEY, value: freq });
        // Trigger check immediately after changing settings
        this.triggerSync();
    }
}

export const autoSync = new AutoSyncService();
