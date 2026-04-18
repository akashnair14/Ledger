'use client';

import { useEffect } from 'react';
import { useSettings, saveSetting, processSyncQueue } from '@/hooks/useSupabase';
import { db } from '@/lib/db';
import { createClient } from '@/lib/supabase/client';

/**
 * Global component to keep local IndexedDB settings in sync with Supabase cloud settings.
 * This ensures that components using direct DB access (like PDF generation) 
 * always have the latest business branding.
 */
export const SettingsSync = () => {
    const { settings, isLoading } = useSettings();

    useEffect(() => {
        const sync = async () => {
            if (isLoading) return;

            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) return; // Only sync if authenticated

            // 1. Cloud to Local Sync
            if (settings) {
                for (const [key, value] of Object.entries(settings)) {
                    const local = await db.settings.get(key);
                    if (!local || local.value !== value) {
                        await db.settings.put({ key, value });
                    }
                }
            }

            // 2. Local to Cloud Migration (if missing in cloud)
            const localSettings = await db.settings.toArray();
            for (const ls of localSettings) {
                if (!settings || !settings[ls.key]) {
                    try {
                        console.log(`Migrating local setting ${ls.key} to cloud...`);
                        await saveSetting(ls.key, ls.value as string);
                    } catch (err) {
                        console.warn(`Failed to migrate setting ${ls.key}:`, err);
                    }
                }
            }
            
            // 3. Sync Pending Mutations to Cloud
            await processSyncQueue();
        };
        sync();

        // 4. Attach event listeners for dynamic reconnections
        const handleOnline = async () => {
             const supabase = createClient();
             const { data: { user } } = await supabase.auth.getUser();
             
             if (!user) return;

             console.log('[Sync] Network restored, processing queue...');
             processSyncQueue();
        };
        window.addEventListener('online', handleOnline);
        return () => window.removeEventListener('online', handleOnline);
    }, [isLoading, settings]);

    return null;
};
