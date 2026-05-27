import { Categories } from '../../enums/Categories';
import type { ScorecardTemplateEntry } from '../../config/scorecardTemplates';
import type { PuzzleConfig, PuzzleModifier } from '../types';
import { IceBlockModifier } from '../modifiers/IceBlockModifier';
import { FlyingMultiplierModifier } from '../modifiers/FlyingMultiplierModifier';
import { DoubleCategoryModifier } from '../modifiers/DoubleCategoryModifier';

// Variant definitions. Each one tweaks the modifier mix + win rules so a
// random pick lands on a distinct play experience even though we only have
// three modifier kinds to work with right now.
type VariantSpec = {
    id: string;
    label: string;
    description: string;
    targetScore: number;
    requiredEngagementCount: number;
    iceBlocks: number;
    flyingMultipliers: number;
    doubleCategories: number;
};

const VARIANTS: VariantSpec[] = [
    {
        id: 'warm-up',
        label: 'Warm-Up',
        description: 'A gentle introduction. One of each modifier, no engagement requirement.',
        targetScore: 120,
        requiredEngagementCount: 0,
        iceBlocks: 1, flyingMultipliers: 1, doubleCategories: 1,
    },
    {
        id: 'standard',
        label: 'Standard',
        description: 'The bread-and-butter puzzle. Use any two of the three modifier types.',
        targetScore: 175,
        requiredEngagementCount: 2,
        iceBlocks: 2, flyingMultipliers: 1, doubleCategories: 1,
    },
    {
        id: 'frosty',
        label: 'Frosty',
        description: 'Heavy ice, no doubles. Clear ice or land the multiplier.',
        targetScore: 150,
        requiredEngagementCount: 1,
        iceBlocks: 3, flyingMultipliers: 1, doubleCategories: 0,
    },
    {
        id: 'lightning',
        label: 'Lightning',
        description: 'Two flying multipliers. Use the boost to chase a higher target.',
        targetScore: 220,
        requiredEngagementCount: 2,
        iceBlocks: 1, flyingMultipliers: 2, doubleCategories: 1,
    },
    {
        id: 'echo',
        label: 'Echo',
        description: 'Two double-category slots. Big bonus-turn potential.',
        targetScore: 200,
        requiredEngagementCount: 2,
        iceBlocks: 1, flyingMultipliers: 1, doubleCategories: 2,
    },
    {
        id: 'marathon',
        label: 'Marathon',
        description: 'Standard mix, but you have to engage every modifier kind to win.',
        targetScore: 260,
        requiredEngagementCount: 3,
        iceBlocks: 2, flyingMultipliers: 1, doubleCategories: 1,
    },
    {
        id: 'tempest',
        label: 'Tempest',
        description: 'Everything dialled up — heavy modifiers, all kinds required.',
        targetScore: 230,
        requiredEngagementCount: 3,
        iceBlocks: 3, flyingMultipliers: 2, doubleCategories: 1,
    },
    {
        id: 'frost-storm',
        label: 'Frost Storm',
        description: 'Ice and lightning only — clear an ice block AND boost a score.',
        targetScore: 180,
        requiredEngagementCount: 2,
        iceBlocks: 3, flyingMultipliers: 2, doubleCategories: 0,
    },
    {
        id: 'bouncing',
        label: 'Bouncing',
        description: 'No ice, lots of flying chips. Catch them and double up.',
        targetScore: 240,
        requiredEngagementCount: 2,
        iceBlocks: 0, flyingMultipliers: 3, doubleCategories: 1,
    },
    {
        id: 'echo-chain',
        label: 'Echo Chain',
        description: 'Three double-category slots. High ceiling if you nail the bonus turns.',
        targetScore: 260,
        requiredEngagementCount: 3,
        iceBlocks: 1, flyingMultipliers: 1, doubleCategories: 3,
    },
];

// Categories ineligible for initial modifier placement. Ones stays open so
// the player always has a guaranteed-scorable slot on turn 1.
const PLACEMENT_BLOCKLIST: Categories[] = [Categories.Ones];

function takeRandom<T>(pool: T[], count: number): T[] {
    const remaining = [...pool];
    const picked: T[] = [];
    while (picked.length < count && remaining.length > 0) {
        const idx = Math.floor(Math.random() * remaining.length);
        picked.push(remaining.splice(idx, 1)[0]);
    }
    return picked;
}

// Pick ice block positions such that no two are adjacent in the template,
// avoiding the soft-lock where a chain of ice has no scorable neighbor.
function pickIceBlockPositions(template: ScorecardTemplateEntry[], count: number): Categories[] {
    if (count <= 0) return [];
    const order = template.map(e => e.category).filter(c => !PLACEMENT_BLOCKLIST.includes(c));
    const indexOf = new Map(order.map((c, i) => [c, i] as const));
    // Greedy: shuffle eligible cells and keep the ones with no adjacent neighbour already picked.
    const shuffled = takeRandom(order, order.length);
    const picked: Categories[] = [];
    for (const cell of shuffled) {
        if (picked.length >= count) break;
        const i = indexOf.get(cell)!;
        const collision = picked.some(p => {
            const pi = indexOf.get(p)!;
            return Math.abs(pi - i) === 1;
        });
        if (!collision) picked.push(cell);
    }
    return picked;
}

class VariantPuzzleConfig implements PuzzleConfig {
    readonly id: string;
    readonly label: string;
    readonly description: string;
    readonly targetScore: number;
    readonly requiredEngagementCount: number;
    private readonly spec: VariantSpec;

    constructor(spec: VariantSpec) {
        this.spec = spec;
        this.id = spec.id;
        this.label = spec.label;
        this.description = spec.description;
        this.targetScore = spec.targetScore;
        this.requiredEngagementCount = spec.requiredEngagementCount;
    }

    build(template: ScorecardTemplateEntry[]): PuzzleModifier[] {
        const taken = new Set<Categories>();
        const modifiers: PuzzleModifier[] = [];

        // Ice blocks first (most placement-constrained).
        const icePositions = pickIceBlockPositions(template, this.spec.iceBlocks);
        for (const cat of icePositions) {
            taken.add(cat);
            modifiers.push(new IceBlockModifier(cat));
        }

        const remainingPool = template
            .map(e => e.category)
            .filter(c => !PLACEMENT_BLOCKLIST.includes(c) && !taken.has(c));

        // Flying multipliers and double categories share what's left.
        const flying = takeRandom(remainingPool, this.spec.flyingMultipliers);
        flying.forEach(c => taken.add(c));
        for (const cat of flying) modifiers.push(new FlyingMultiplierModifier(cat, 2));

        const stillRemaining = remainingPool.filter(c => !taken.has(c));
        const doubles = takeRandom(stillRemaining, this.spec.doubleCategories);
        for (const cat of doubles) modifiers.push(new DoubleCategoryModifier(cat));

        return modifiers;
    }
}

export const PUZZLE_VARIANTS: PuzzleConfig[] = VARIANTS.map(spec => new VariantPuzzleConfig(spec));

export function pickRandomVariant(): PuzzleConfig {
    return PUZZLE_VARIANTS[Math.floor(Math.random() * PUZZLE_VARIANTS.length)];
}
