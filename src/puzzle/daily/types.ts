// Persisted state for the Daily Puzzle feature. Local for now; shaped to
// round-trip to a future server backend as-is.

export interface DailyResult {
    dateKey: string;        // "YYYY-MM-DD"
    score: number;
    won: boolean;
}

export interface DailyPuzzleProgress {
    version: 1;
    bestScore: number;
    currentStreak: number;
    longestStreak: number;
    lastPlayedDateKey: string | null;
    // Newest-first, bounded to last 30 entries.
    history: DailyResult[];
}

export const DAILY_HISTORY_LIMIT = 30;
