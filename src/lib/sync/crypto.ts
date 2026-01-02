/**
 * Simple AES-GCM encryption utility using Web Crypto API
 */

const ALGO = 'AES-GCM';

export async function deriveKey(password: string): Promise<CryptoKey> {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        enc.encode(password),
        'PBKDF2',
        false,
        ['deriveKey']
    );

    // Use a fixed salt for simplicity in this version, or store salt in metadata
    const salt = enc.encode('ledger-manager-v1-salt');

    return await crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: 100000,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: ALGO, length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

export async function encryptData(data: string, key: CryptoKey): Promise<{ ciphertext: ArrayBuffer, iv: Uint8Array }> {
    const enc = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { name: ALGO, iv: iv as any },
        key,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        enc.encode(data) as any
    );
    return { ciphertext, iv };
}

export async function decryptData(ciphertext: ArrayBuffer, iv: Uint8Array, key: CryptoKey): Promise<string> {
    const decrypted = await crypto.subtle.decrypt(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { name: ALGO, iv: iv as any },
        key,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ciphertext as any
    );
    const dec = new TextDecoder();
    return dec.decode(decrypted);
}

// Helper to convert buffer to base64 for storage/API
export function bufferToBase64(buf: ArrayBuffer): string {
    const uint8 = new Uint8Array(buf);
    let binary = '';
    for (let i = 0; i < uint8.byteLength; i++) {
        binary += String.fromCharCode(uint8[i]);
    }
    return btoa(binary);
}

export function base64ToBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const buf = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        buf[i] = binary.charCodeAt(i);
    }
    return buf.buffer;
}
