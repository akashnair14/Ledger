import { db } from '../db';

const CREDENTIAL_ID_KEY = 'biometric_credential_id';
const LOCK_ENABLED_KEY = 'biometric_lock_enabled';

export class BioAuthService {
    async isSupported(): Promise<boolean> {
        return (
            window.PublicKeyCredential &&
            await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        );
    }

    async isEnabled(): Promise<boolean> {
        const [meta, credId] = await Promise.all([
            db.syncMetadata.get(LOCK_ENABLED_KEY),
            db.syncMetadata.get(CREDENTIAL_ID_KEY)
        ]);
        return !!meta?.value && !!credId?.value;
    }

    async setEnabled(enabled: boolean): Promise<void> {
        await db.syncMetadata.put({ key: LOCK_ENABLED_KEY, value: enabled });
    }

    async register(): Promise<boolean> {
        if (!await this.isSupported()) return false;

        const challenge = crypto.getRandomValues(new Uint8Array(32));
        const userId = crypto.getRandomValues(new Uint8Array(16));

        try {
            const credential = await navigator.credentials.create({
                publicKey: {
                    challenge,
                    rp: { name: 'LedgerManager' },
                    user: {
                        id: userId,
                        name: 'user@ledgermanager.local',
                        displayName: 'Ledger User'
                    },
                    pubKeyCredParams: [{ alg: -7, type: 'public-key' }], // ES256
                    authenticatorSelection: {
                        authenticatorAttachment: 'platform',
                        userVerification: 'required'
                    },
                    timeout: 60000
                }
            }) as PublicKeyCredential;

            if (credential) {
                const credentialId = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
                await db.syncMetadata.put({ key: CREDENTIAL_ID_KEY, value: credentialId });
                return true;
            }
        } catch (err) {
            console.error('Biometric registration failed:', err);
        }
        return false;
    }

    async authenticate(): Promise<boolean> {
        const credIdMeta = await db.syncMetadata.get(CREDENTIAL_ID_KEY);
        if (!credIdMeta) return false;

        const storedId = credIdMeta.value as string;
        if (!storedId) return false;

        const credentialId = new Uint8Array(atob(storedId).split('').map(c => c.charCodeAt(0)));
        const challenge = crypto.getRandomValues(new Uint8Array(32));

        try {
            const assertion = await navigator.credentials.get({
                publicKey: {
                    challenge,
                    allowCredentials: [{
                        id: credentialId,
                        type: 'public-key'
                    }],
                    userVerification: 'required',
                    timeout: 60000
                }
            });

            return !!assertion;
        } catch (err) {
            console.error('Biometric authentication failed:', err);
            return false;
        }
    }
}

export const bioAuth = new BioAuthService();
