'use client';

import { useEffect } from 'react';
import { useSettings, saveSetting } from '@/hooks/useSupabase';
import { db } from '@/lib/db';

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
                        console.error(`Failed to migrate setting ${ls.key}:`, err);
                    }
                }
            }
        };
        sync();
    }, [isLoading, settings]);

    return null;
};
