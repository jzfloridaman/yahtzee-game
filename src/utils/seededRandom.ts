// Tiny seeded PRNG used by Daily Puzzle for deterministic placement.
// Mulberry32 produces ~32-bit numbers from a 32-bit seed with good
// distribution for our use case (picking categories from a small pool).
// Two devices on the same UTC date produce identical sequences.

import type { RNG } from '../puzzle/types';

// Deterministic 32-bit hash of a string. FNV-1a chosen for being short
// and predictable across platforms. Seed quality is sufficient for
// shuffling a 17-item array — we're not generating crypto keys.
export function hashString(s: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        // 16777619 = FNV prime. Math.imul keeps the result a 32-bit int.
        h = Math.imul(h, 0x01000193);
    }
    // Force unsigned so consumers see a positive seed.
    return h >>> 0;
}

// Mulberry32 — small, fast, good-enough PRNG for game shuffles.
// Each call returns a number in [0, 1) and advances the seed by one step.
export function mulberry32(seed: number): RNG {
    let a = seed >>> 0;
    return function (): number {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
