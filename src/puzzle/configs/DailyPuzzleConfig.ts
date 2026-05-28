import type { ScorecardTemplateEntry } from '../../config/scorecardTemplates';
import type { PuzzleConfig, PuzzleModifier, RNG } from '../types';
import { PUZZLE_VARIANT_SPECS, VariantPuzzleConfig } from './variants';
import { mulberry32, hashString } from '../../utils/seededRandom';

// Daily Puzzle — a single deterministic puzzle per UTC date.
//
// Determinism strategy:
//   1. Hash the dateKey to a 32-bit seed.
//   2. Use a separate mulberry32 stream to pick the underlying variant
//      spec from PUZZLE_VARIANT_SPECS.
//   3. Build the modifier placements with a fresh mulberry32 seeded from
//      the dateKey (shifted) so two devices on the same UTC date land on
//      identical modifier types AND identical cells.
//
// Mid-game randomness (Flying Multiplier relocation, Multiplier Bubble
// scatter) intentionally stays on Math.random() — both players have the
// same starting board; what happens after move 1 is their own puzzle.
export class DailyPuzzleConfig implements PuzzleConfig {
    readonly id: string;
    readonly label: string;
    readonly description: string;
    readonly targetScore: number;
    readonly requiredEngagementCount: number;
    readonly dateKey: string;
    private readonly innerConfig: VariantPuzzleConfig;
    private readonly buildSeed: number;

    constructor(dateKey: string) {
        this.dateKey = dateKey;
        const baseSeed = hashString(dateKey);
        // Variant pick uses an offset stream so a future "harder Saturday"
        // tweak can reach into baseSeed directly without disturbing the
        // build-side sequence.
        const pickRng = mulberry32(baseSeed ^ 0x9e3779b9);
        const spec = PUZZLE_VARIANT_SPECS[Math.floor(pickRng() * PUZZLE_VARIANT_SPECS.length)];
        this.innerConfig = new VariantPuzzleConfig(spec);

        this.id = `daily-${dateKey}`;
        this.label = 'Daily Puzzle';
        this.description = `${dateKey} — ${spec.label}`;
        this.targetScore = spec.targetScore;
        this.requiredEngagementCount = spec.requiredEngagementCount;
        // Build-side stream is the raw base seed; isolated from the pick stream.
        this.buildSeed = baseSeed;
    }

    build(template: ScorecardTemplateEntry[], _rng?: RNG): PuzzleModifier[] {
        // Always use the seeded RNG — we ignore the caller's `rng` because
        // the daily puzzle's whole contract is determinism.
        const rng = mulberry32(this.buildSeed);
        return this.innerConfig.build(template, rng);
    }
}
