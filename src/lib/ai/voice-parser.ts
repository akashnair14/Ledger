export type VoiceIntent = {
    type: 'CREDIT' | 'PAYMENT';
    amount: number;
    name: string; // Customer/Supplier Name attempt
    original: string;
} | null;

export function parseVoiceCommand(transcript: string): VoiceIntent {
    const t = transcript.toLowerCase().trim();
    if (!t) return null;

    // 1. Identify Type
    // Payment: "Paid", "Sent", "Gave" (implies money leaving us -> Payment to Supplier OR We gave credit?? Context matters)
    // Wait, let's stick to the app's terminology:
    // Customer Context: "Received" (Money in), "Given" (Credit out)
    // Supplier Context: "Paid" (Money out), "Purchased" (Credit in)

    // Let's try to detect direction:
    // MONEY IN (We received): "received", "got", "took", "from"
    // MONEY OUT (We paid/gave): "paid", "gave", "sent", "to"

    // Simplification for now:
    // "Received 500 from Rahul" -> PAYMENT (from Customer)
    // "Paid 500 to Shop" -> PAYMENT (to Supplier)

    // Maybe we just map strictly to 'CREDIT' vs 'PAYMENT' based on keywords?
    // "Credit": 'credit', 'loan', 'gave', 'purchased'
    // "Payment": 'paid', 'received', 'payment', 'settled'

    let type: 'CREDIT' | 'PAYMENT' | null = null;

    if (t.includes('received') || t.includes('got') || t.includes('take') || t.includes('payment')) {
        // RECEIVED usually means PAYMENT (Money In)
        type = 'PAYMENT';
    } else if (t.includes('paid') || t.includes('sent') || t.includes('pay')) {
        // PAID usually means PAYMENT (Money Out - Supplier)
        type = 'PAYMENT';
    } else if (t.includes('credit') || t.includes('loan') || t.includes('give') || t.includes('gave') || t.includes('purchase') || t.includes('bought')) {
        // GAVE/CREDIT/PURCHASE -> CREDIT
        type = 'CREDIT';
    }

    // Default fallbacks if ambiguous? Let's generic match.
    if (!type) {
        // Heuristic: If it says "from", likely received. If "to", likely paid.
        if (t.includes(' from ')) type = 'PAYMENT';
        else if (t.includes(' to ')) type = 'CREDIT'; // "Given to"
    }

    if (!type) type = 'CREDIT'; // Default

    // 2. Extract Amount
    // Look for digits, maybe with "rs" or "rupees"
    const amountMatch = t.match(/(\d+(?:,\d+)*(?:\.\d+)?)/);
    const amount = amountMatch ? parseFloat(amountMatch[0].replace(/,/g, '')) : 0;

    if (amount === 0) return null; // No amount, useless command

    // 3. Extract Name (The hardest part)
    // "Paid 500 to [Name]"
    // "Received 500 from [Name]"
    // "Add [Name] 500"

    let name = '';
    const nameRegexes = [
        /(?:to|from|for|with)\s+(.+)/, // "to Rahul", "from Shyam"
        /(?:paid|received|gave|add)\s+(.+?)\s+\d+/, // "Paid Rahul 500"
        /\d+\s+(?:to|from)\s+(.+)/, // "500 to Rahul"
    ];

    for (const regex of nameRegexes) {
        const m = t.match(regex);
        if (m && m[1]) {
            name = m[1].replace(/(rupees|rs|bucks|only)/g, '').trim();
            break;
        }
    }

    return {
        type,
        amount,
        name: name || 'Unknown',
        original: transcript
    };
}
