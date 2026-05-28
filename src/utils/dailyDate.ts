// UTC date-key helpers for Daily Puzzle. Keys are stable "YYYY-MM-DD"
// strings — fair across time zones and easy to compare lexicographically.

// Returns the current UTC date as "YYYY-MM-DD".
export function getDailyDateKey(now: Date = new Date()): string {
    const y = now.getUTCFullYear();
    const m = String(now.getUTCMonth() + 1).padStart(2, '0');
    const d = String(now.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

// Whole-day delta between two YYYY-MM-DD keys (b - a). Negative when a > b.
export function daysBetween(a: string, b: string): number {
    const aMs = Date.UTC(...parseKey(a));
    const bMs = Date.UTC(...parseKey(b));
    return Math.round((bMs - aMs) / 86400000);
}

function parseKey(key: string): [number, number, number] {
    const [y, m, d] = key.split('-').map(Number);
    // Date.UTC takes 0-indexed month.
    return [y, m - 1, d];
}
