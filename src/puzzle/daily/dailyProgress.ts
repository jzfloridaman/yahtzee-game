import { daysBetween } from '../../utils/dailyDate';
import {
    DAILY_HISTORY_LIMIT,
    type DailyPuzzleProgress,
    type DailyResult,
} from './types';

export function defaultProgress(): DailyPuzzleProgress {
    return {
        version: 1,
        bestScore: 0,
        currentStreak: 0,
        longestStreak: 0,
        lastPlayedDateKey: null,
        history: [],
    };
}

// Parses a stored JSON string into a valid DailyPuzzleProgress. Tolerant
// of missing/bad fields — falls back to defaults to avoid wedging users
// on a corrupted localStorage entry.
export function loadDailyProgress(raw: string | null): DailyPuzzleProgress {
    if (!raw) return defaultProgress();
    try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return defaultProgress();
        return {
            version: 1,
            bestScore: typeof parsed.bestScore === 'number' ? parsed.bestScore : 0,
            currentStreak: typeof parsed.currentStreak === 'number' ? parsed.currentStreak : 0,
            longestStreak: typeof parsed.longestStreak === 'number' ? parsed.longestStreak : 0,
            lastPlayedDateKey: typeof parsed.lastPlayedDateKey === 'string'
                ? parsed.lastPlayedDateKey
                : null,
            history: Array.isArray(parsed.history)
                ? parsed.history.filter(isDailyResult).slice(0, DAILY_HISTORY_LIMIT)
                : [],
        };
    } catch {
        return defaultProgress();
    }
}

function isDailyResult(x: unknown): x is DailyResult {
    if (!x || typeof x !== 'object') return false;
    const r = x as DailyResult;
    return typeof r.dateKey === 'string'
        && typeof r.score === 'number'
        && typeof r.won === 'boolean';
}

// Pure progression rule. Applies a completed daily attempt to the progress
// object and returns a new shape (no mutation). Streak rules:
//   - Win on a day adjacent to the last winning day → streak += 1.
//   - Win on a fresh start (lastPlayedDateKey null) → streak = 1.
//   - Loss → streak = 0.
//   - Skipped day (gap > 1) before today's win → streak resets to 1.
// "Today" is passed in so callers can drive deterministic tests.
export function applyDailyResult(
    progress: DailyPuzzleProgress,
    result: DailyResult,
    today: string,
): DailyPuzzleProgress {
    // Replays of an already-recorded day don't count — return unchanged.
    if (progress.lastPlayedDateKey === result.dateKey) {
        return progress;
    }

    let currentStreak: number;
    if (!result.won) {
        currentStreak = 0;
    } else if (!progress.lastPlayedDateKey) {
        currentStreak = 1;
    } else {
        const gap = daysBetween(progress.lastPlayedDateKey, result.dateKey);
        // gap of exactly 1 day means "consecutive" — extend the streak.
        currentStreak = gap === 1 ? progress.currentStreak + 1 : 1;
    }

    const longestStreak = Math.max(progress.longestStreak, currentStreak);
    const bestScore = Math.max(progress.bestScore, result.score);

    const history = [result, ...progress.history.filter(h => h.dateKey !== result.dateKey)]
        .slice(0, DAILY_HISTORY_LIMIT);

    return {
        version: 1,
        bestScore,
        currentStreak,
        longestStreak,
        lastPlayedDateKey: result.dateKey,
        history,
    };
}

// Returns the *currently-valid* streak. If today is more than 1 day after
// the last play, the persisted currentStreak is stale and should display
// as 0 (the next win restarts at 1). Pure — doesn't mutate progress.
export function currentStreakFor(progress: DailyPuzzleProgress, today: string): number {
    if (!progress.lastPlayedDateKey) return 0;
    const gap = daysBetween(progress.lastPlayedDateKey, today);
    if (gap > 1) return 0;
    return progress.currentStreak;
}

export function hasPlayedToday(progress: DailyPuzzleProgress, today: string): boolean {
    return progress.lastPlayedDateKey === today;
}

export function recentHistory(progress: DailyPuzzleProgress, n: number): DailyResult[] {
    return progress.history.slice(0, n);
}
