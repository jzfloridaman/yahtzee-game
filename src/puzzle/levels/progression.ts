export interface AdventureProgress {
    highestUnlocked: number;
    bestScores: Record<string, number>;
    // Persisted best star rating per level (1-3). Falls back to 0 / not
    // present for never-cleared levels.
    bestStars?: Record<string, number>;
}

// Star rating thresholds expressed as score multipliers over the target.
// 1 star = meet target; 2 stars = +25% over target; 3 stars = +50% over.
// Adventure wins always award at least 1 star (engagement is part of the
// win condition already, so reaching this point implies a real clear).
export const STAR_THRESHOLDS = [
    { stars: 3, multiplier: 1.5 },
    { stars: 2, multiplier: 1.25 },
    { stars: 1, multiplier: 1.0 },
] as const;

export function computeStars(totalScore: number, targetScore: number): number {
    if (targetScore <= 0) return totalScore > 0 ? 3 : 0;
    for (const tier of STAR_THRESHOLDS) {
        if (totalScore >= targetScore * tier.multiplier) return tier.stars;
    }
    return 0;
}

// Pure progression rule applied when a player wins an Adventure level.
// Returns a new AdventureProgress reflecting the updated best score, best
// star rating, and the next-level unlock (only bumps when the cleared
// level matched the current ceiling AND a higher level exists).
export function applyWinToProgress(
    progress: AdventureProgress,
    levelId: string,
    levelNumber: number,
    score: number,
    lastLevelNumber: number,
    earnedStars: number = 0,
): AdventureProgress {
    const prevBest = progress.bestScores[levelId] ?? 0;
    const bestScores = score > prevBest
        ? { ...progress.bestScores, [levelId]: score }
        : progress.bestScores;
    const prevStarsMap = progress.bestStars ?? {};
    const prevStars = prevStarsMap[levelId] ?? 0;
    const bestStars = earnedStars > prevStars
        ? { ...prevStarsMap, [levelId]: earnedStars }
        : prevStarsMap;
    const highestUnlocked =
        levelNumber === progress.highestUnlocked && levelNumber < lastLevelNumber
            ? levelNumber + 1
            : progress.highestUnlocked;
    return { highestUnlocked, bestScores, bestStars };
}
