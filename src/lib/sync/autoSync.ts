import { syncEngine } from './engine';
import { db } from '../db';

const AUTO_SYNC_KEY = 'last_auto_sync';
const SYNC_INTERVAL = 15 * 60 * 1000; // 15 minutes

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
            const lastSync = await this.getLastSync();
            const now = Date.now();

            // Only sync if enough time has passed or if we are forced
            if (now - lastSync > SYNC_INTERVAL) {
                this.isSyncing = true;

                // Silent sync attempt
                // Check if password exists in session or local
                const savedPass = localStorage.getItem('sync_password');
                if (savedPass) {
                    await syncEngine.setPassword(savedPass);
                    await syncEngine.pull(clientId);
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
}

export const autoSync = new AutoSyncService();
