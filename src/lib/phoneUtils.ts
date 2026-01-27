/**
 * Normalizes a phone number by removing spaces, dashes, parentheses, and other non-digit characters.
 * Keeps the leading '+' if present for international codes.
 */
export function normalizePhoneNumber(phone: string): string {
    if (!phone) return '';

    // Remove all characters except digits and the leading +
    let normalized = phone.replace(/[^\d+]/g, '');

    // If it starts with 00, replace with +
    if (normalized.startsWith('00')) {
        normalized = '+' + normalized.slice(2);
    }

    // If it's 12 digits starting with 91 but no +, add +
    if (normalized.length === 12 && normalized.startsWith('91')) {
        normalized = '+' + normalized;
    }

    // If it's 11 digits starting with 0, it's a local format with leading 0 (common in some regions)
    // We can strip the 0 or keep it based on preference. Usually, stripping is safer for storage.
    if (normalized.length === 11 && normalized.startsWith('0')) {
        normalized = normalized.slice(1);
    }

    return normalized;
}

/**
 * Validates if the phone number is roughly correct.
 * Allows 10 digits for local, and 12-14 characters for international.
 */
export function isValidPhone(phone: string): boolean {
    const normalized = normalizePhoneNumber(phone);

    // Basic check: must have at least 10 digits
    const digitsOnly = normalized.replace(/\D/g, '');
    if (digitsOnly.length < 10) return false;

    // International format: + followed by 10-14 digits
    if (normalized.startsWith('+')) {
        return /^\+\d{10,15}$/.test(normalized);
    }

    // Local format: 10 digits
    return /^\d{10}$/.test(normalized);
}

/**
 * Formats a phone number for display.
 * Example: +91 98765 43210 or 98765 43210
 */
export function formatPhoneDisplay(phone: string): string {
    const normalized = normalizePhoneNumber(phone);
    const digits = normalized.replace(/\D/g, '');

    if (digits.length === 10) {
        return `${digits.slice(0, 5)} ${digits.slice(5)}`;
    }

    if (normalized.startsWith('+91') && digits.length === 12) {
        return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
    }

    if (normalized.startsWith('+')) {
        // Generic international format
        return normalized.slice(0, 4) + ' ' + normalized.slice(4, 9) + ' ' + normalized.slice(9);
    }

    return normalized;
}
