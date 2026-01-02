import { db } from '../db';
import { driveClient } from './drive';
import { encryptData, decryptData, deriveKey, bufferToBase64, base64ToBuffer } from './crypto';

const FILENAME = 'ledgerData.enc';
const METADATA_FILENAME = 'metadata.json';

export class SyncEngine {
    private key: CryptoKey | null = null;

    async setPassword(password: string) {
        this.key = await deriveKey(password);
    }

    async sync(clientId: string) {
        if (!this.key) throw new Error('Password not set');

        await driveClient.init(clientId);
        await driveClient.authenticate();

        // 1. Download metadata
        const remoteMetaFile = await driveClient.findFile(METADATA_FILENAME);
        if (remoteMetaFile) {
            await driveClient.downloadFile(remoteMetaFile.id);
        }

        // 2. Prepare local state
        const customers = await db.customers.toArray();
        const transactions = await db.transactions.toArray();
        const books = await db.books.toArray();
        const attachments = await db.attachments.toArray();

        // Note: For attachments, we might need to handle large blobs differently later,
        // but for now we'll include them in the encrypted bundle if reasonably sized.
        // TODO: Move large attachments to separate Drive files for optimization.

        const payload = JSON.stringify({
            customers,
            transactions,
            books,
            attachments: await Promise.all(attachments.map(async a => ({
                ...a,
                blob: await this.blobToBase64(a.blob)
            })))
        });

        // 3. Encrypt & Upload
        const encrypted = await encryptData(payload, this.key);
        const dataToSave = JSON.stringify({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            iv: bufferToBase64(encrypted.iv.buffer as any),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ciphertext: bufferToBase64(encrypted.ciphertext as any)
        });

        const dataFile = await driveClient.findFile(FILENAME);
        await driveClient.uploadFile(FILENAME, dataToSave, dataFile?.id);

        // 4. Update Remote Metadata
        const newMeta = { lastSync: Date.now() };
        await driveClient.uploadFile(METADATA_FILENAME, JSON.stringify(newMeta), remoteMetaFile?.id);

        return newMeta;
    }

    async pull(clientId: string) {
        if (!this.key) throw new Error('Password not set');

        await driveClient.init(clientId);
        await driveClient.authenticate();

        const dataFile = await driveClient.findFile(FILENAME);
        if (!dataFile) return null;

        const dataContent = await driveClient.downloadFile(dataFile.id);
        const { iv, ciphertext } = JSON.parse(dataContent);

        const decrypted = await decryptData(
            base64ToBuffer(ciphertext),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            new Uint8Array(base64ToBuffer(iv)) as any,
            this.key
        );

        const { customers, transactions, books, attachments } = JSON.parse(decrypted);

        // 1. Sync Books
        for (const b of (books || [])) {
            const local = await db.books.get(b.id);
            if (!local || b.updatedAt > local.updatedAt) {
                await db.books.put(b);
            }
        }

        // 2. Sync Customers
        for (const c of (customers || [])) {
            const local = await db.customers.get(c.id);
            if (!local || c.updatedAt > local.updatedAt) {
                await db.customers.put(c);
            }
        }

        // 3. Sync Transactions
        for (const t of (transactions || [])) {
            const local = await db.transactions.get(t.id);
            if (!local || t.updatedAt > local.updatedAt) {
                await db.transactions.put(t);
            }
        }

        // 4. Sync Attachments
        for (const a of (attachments || [])) {
            const local = await db.attachments.get(a.id);
            if (!local || a.updatedAt > local.updatedAt) {
                await db.attachments.put({
                    ...a,
                    blob: this.base64ToBlob(a.blob, a.mimeType)
                });
            }
        }

        return true;
    }

    private async blobToBase64(blob: Blob): Promise<string> {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
        });
    }

    private base64ToBlob(base64: string, mimeType: string): Blob {
        const byteString = atob(base64.split(',')[1]);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }
        return new Blob([ab], { type: mimeType });
    }

}

export const syncEngine = new SyncEngine();
