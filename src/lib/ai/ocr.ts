import Tesseract from 'tesseract.js';

export type ReceiptData = {
    amount?: number;
    date?: string; // ISO String
    invoiceNumber?: string;
    rawText: string;
};

export async function scanReceipt(file: File): Promise<ReceiptData> {
    try {
        const { data: { text } } = await Tesseract.recognize(
            file,
            'eng',
            {
                logger: m => console.log(m) // Optional progress logging
            }
        );

        console.log('OCR Raw Text:', text);

        return parseReceiptText(text);

    } catch (error) {
        console.error('OCR Error:', error);
        throw new Error('Failed to scan receipt');
    }
}

function parseReceiptText(text: string): ReceiptData {
    const lines = text.split('\n');
    let amount: number | undefined;
    let date: string | undefined;
    let invoiceNumber: string | undefined;

    // 1. Extract Amount
    // Strategy: Look for "Total", "Grand Total", "Amount" and then find the number
    // Regex for currency: 100, 1,000, 100.00, 1,000.50
    const moneyRegex = /(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?|\d+)/g;
    const allNumbers: number[] = [];

    const totalKeywords = ['total', 'grand total', 'net amount', 'amount due', 'balance'];
    let foundTotalAmount = false;

    for (const line of lines) {
        const lower = line.toLowerCase();


        // Date Extraction
        if (!date) {
            // 1. DD/MM/YYYY or DD-MM-YYYY
            const dmyMatch = line.match(/\b(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})\b/);
            if (dmyMatch) {
                const [, d, m, y] = dmyMatch;
                const fullYear = y.length === 2 ? `20${y}` : y;
                if (parseInt(m) <= 12 && parseInt(d) <= 31) {
                    date = new Date(`${fullYear}-${m}-${d}`).toISOString();
                }
            }

            // 2. YYYY-MM-DD (ISOish)
            if (!date) {
                const ymdMatch = line.match(/\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b/);
                if (ymdMatch) {
                    const [, y, m, d] = ymdMatch;
                    if (parseInt(m) <= 12 && parseInt(d) <= 31) {
                        date = new Date(`${y}-${m}-${d}`).toISOString();
                    }
                }
            }

            // 3. MMM DD, YYYY (e.g. Jan 01, 2024 or 01 Jan 2024)
            if (!date) {
                const monthNames = "jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec";
                const textDateMatch = line.match(new RegExp(`\\b(\\d{1,2})[- ](${monthNames})[a-z]*[- ,]+(\\d{4})`, 'i')) ||
                    line.match(new RegExp(`\\b(${monthNames})[a-z]*[- ]+(\\d{1,2})[- ,]+(\\d{4})`, 'i'));

                if (textDateMatch) {
                    try {
                        const parsed = new Date(textDateMatch[0]);
                        if (!isNaN(parsed.getTime())) {
                            date = parsed.toISOString();
                        }
                    } catch { } // _e is unused
                }
            }
        }

        // Invoice Number Extraction
        if (!invoiceNumber) {
            const invMatch = line.match(/(?:inv|invoice|bill|receipt)\s*(?:no|num|#)?\.?\s*[:\-]?\s*([a-z0-9\-/]+)/i);
            if (invMatch && invMatch[1].length > 2) {
                invoiceNumber = invMatch[1];
            }
        }

        // Amount Extraction Logic
        if (!foundTotalAmount && totalKeywords.some(k => lower.includes(k))) {
            const match = line.match(moneyRegex);
            if (match) {
                // Clean up and parse
                const val = parseFloat(match[0].replace(/,/g, ''));
                if (!isNaN(val)) {
                    amount = val;
                    foundTotalAmount = true; // High confidence
                }
            }
        }

        // Collect all potential money values just in case
        const matches = line.match(moneyRegex);
        if (matches) {
            matches.forEach(m => {
                const val = parseFloat(m.replace(/,/g, ''));
                if (!isNaN(val)) allNumbers.push(val);
            });
        }
    }

    // Fallback: If no explicit "Total" found, take the largest number
    if (!amount && allNumbers.length > 0) {
        amount = Math.max(...allNumbers);
    }

    return {
        amount,
        date,
        invoiceNumber,
        rawText: text
    };
}
