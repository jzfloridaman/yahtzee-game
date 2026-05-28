import { Categories } from '../../enums/Categories';
import type { LevelDefinition, World } from './types';

// Thematic worlds. Each world introduces a new mechanic or escalates the
// existing ones. Levels within a world share a vibe (frost, echo, storm).
export const WORLDS: World[] = [
    { id: 'beginnings',    name: 'Beginnings',    description: 'Learn the basics — ice, flying chips, doubles.' },
    { id: 'frostlands',    name: 'Frostlands',    description: 'Heavy ice and the rhythmic Looping Multiplier.' },
    { id: 'echo-chamber',  name: 'Echo Chamber',  description: 'Doubles stack; bubbles scatter ×2 chips.' },
    { id: 'storm-front',   name: 'Storm Front',   description: 'Defuse the Hot Potato before the fuse runs out.' },
    { id: 'storm-surge',   name: 'Storm Surge',   description: 'Every mechanic, mixed and matched.' },
    { id: 'finale',        name: 'Finale',        description: 'Boss puzzles — the storm at full strength.' },
    { id: 'cycles',        name: 'Cycles',        description: 'Categories rotate. Score the slot at the right beat.' },
];

// Hand-authored levels. Difficulty climbs by raising the target, adding
// engagement requirements, and stacking more modifiers per board. Ice
// blocks are placed so that every block has a scorable neighbour at game
// start (chains are allowed as long as at least one end opens outward).
export const LEVELS: LevelDefinition[] = [
    // -- World 1: Beginnings --
    {
        id: 'l01-first-roll', number: 1, worldId: 'beginnings',
        label: 'First Roll',
        description: 'A taste of the multiplier. No engagement requirement.',
        targetScore: 90, requiredEngagementCount: 0,
        modifiers: [
            { kind: 'flyingMultiplier', category: Categories.Sixes },
        ],
    },
    {
        id: 'l02-thaw', number: 2, worldId: 'beginnings',
        label: 'Thaw',
        description: 'One ice block. Score a neighbour to melt it.',
        targetScore: 110, requiredEngagementCount: 1,
        modifiers: [
            { kind: 'iceBlock', category: Categories.Threes },
        ],
    },
    {
        id: 'l03-echo', number: 3, worldId: 'beginnings',
        label: 'Echo',
        description: 'A double on Full House — bank both attempts.',
        targetScore: 130, requiredEngagementCount: 1,
        modifiers: [
            { kind: 'doubleCategory', category: Categories.FullHouse },
        ],
    },
    {
        id: 'l04-triplet', number: 4, worldId: 'beginnings',
        label: 'Triplet',
        description: 'One of each kind. Engage any two.',
        targetScore: 150, requiredEngagementCount: 2,
        modifiers: [
            { kind: 'iceBlock', category: Categories.Fours },
            { kind: 'flyingMultiplier', category: Categories.Yahtzee },
            { kind: 'doubleCategory', category: Categories.Chance },
        ],
    },
    {
        id: 'l05-frosted', number: 5, worldId: 'beginnings',
        label: 'Frosted',
        description: 'Two ice blocks bracket the upper section.',
        targetScore: 160, requiredEngagementCount: 2,
        modifiers: [
            { kind: 'iceBlock', category: Categories.Twos },
            { kind: 'iceBlock', category: Categories.Fives },
            { kind: 'flyingMultiplier', category: Categories.Sixes },
        ],
    },

    // -- World 2: Frostlands --
    {
        id: 'l06-glacier', number: 6, worldId: 'frostlands',
        label: 'Glacier',
        description: 'Three ice blocks. Pick your thaw order carefully.',
        targetScore: 180, requiredEngagementCount: 2,
        modifiers: [
            { kind: 'iceBlock', category: Categories.Twos },
            { kind: 'iceBlock', category: Categories.Fours },
            { kind: 'iceBlock', category: Categories.Sixes },
            { kind: 'flyingMultiplier', category: Categories.Yahtzee },
        ],
    },
    {
        id: 'l07-pulse', number: 7, worldId: 'frostlands',
        label: 'Pulse',
        description: 'The looping multiplier breathes ×1 → ×3 → ×1. Time your big score.',
        targetScore: 170, requiredEngagementCount: 1,
        modifiers: [
            { kind: 'loopingMultiplier', category: Categories.Yahtzee, min: 1, max: 3 },
        ],
    },
    {
        id: 'l08-bracket', number: 8, worldId: 'frostlands',
        label: 'Bracket',
        description: 'Ice on either side. Loop the multiplier into a winner.',
        targetScore: 200, requiredEngagementCount: 2,
        modifiers: [
            { kind: 'iceBlock', category: Categories.Threes },
            { kind: 'iceBlock', category: Categories.Fives },
            { kind: 'loopingMultiplier', category: Categories.FullHouse, min: 1, max: 3 },
        ],
    },
    {
        id: 'l09-cold-snap', number: 9, worldId: 'frostlands',
        label: 'Cold Snap',
        description: 'Three frozen cells, one rhythmic chip.',
        targetScore: 220, requiredEngagementCount: 2,
        modifiers: [
            { kind: 'iceBlock', category: Categories.Twos },
            { kind: 'iceBlock', category: Categories.Fours },
            { kind: 'iceBlock', category: Categories.Sixes },
            { kind: 'loopingMultiplier', category: Categories.FourOfAKind, min: 1, max: 3 },
        ],
    },
    {
        id: 'l10-avalanche', number: 10, worldId: 'frostlands',
        label: 'Avalanche',
        description: 'Four ice blocks. Chain your thaws across the scorecard.',
        targetScore: 240, requiredEngagementCount: 2,
        modifiers: [
            { kind: 'iceBlock', category: Categories.Twos },
            { kind: 'iceBlock', category: Categories.Fours },
            { kind: 'iceBlock', category: Categories.Sixes },
            { kind: 'iceBlock', category: Categories.FullHouse },
            { kind: 'loopingMultiplier', category: Categories.Yahtzee, min: 1, max: 3 },
        ],
    },
    {
        id: 'l11-aurora', number: 11, worldId: 'frostlands',
        label: 'Aurora',
        description: 'Ice + a flying chip + the pulse. All three required.',
        targetScore: 260, requiredEngagementCount: 3,
        modifiers: [
            { kind: 'iceBlock', category: Categories.Threes },
            { kind: 'iceBlock', category: Categories.Sixes },
            { kind: 'flyingMultiplier', category: Categories.FourOfAKind },
            { kind: 'loopingMultiplier', category: Categories.Yahtzee, min: 1, max: 4 },
        ],
    },

    // -- World 3: Echo Chamber --
    {
        id: 'l12-reverb', number: 12, worldId: 'echo-chamber',
        label: 'Reverb',
        description: 'Two doubles. Plan dice that pay off twice.',
        targetScore: 200, requiredEngagementCount: 1,
        modifiers: [
            { kind: 'doubleCategory', category: Categories.FullHouse },
            { kind: 'doubleCategory', category: Categories.Yahtzee },
        ],
    },
    {
        id: 'l13-pop', number: 13, worldId: 'echo-chamber',
        label: 'Pop',
        description: 'A bubble scatters three ×2 chips when you score it.',
        targetScore: 180, requiredEngagementCount: 1,
        modifiers: [
            { kind: 'multiplierBubble', category: Categories.ThreeOfAKind },
        ],
    },
    {
        id: 'l14-cascade', number: 14, worldId: 'echo-chamber',
        label: 'Cascade',
        description: 'Pop the bubble early, then bank doubles into boosted chips.',
        targetScore: 230, requiredEngagementCount: 2,
        modifiers: [
            { kind: 'multiplierBubble', category: Categories.ThreeOfAKind },
            { kind: 'doubleCategory', category: Categories.FullHouse },
            { kind: 'doubleCategory', category: Categories.Yahtzee },
        ],
    },
    {
        id: 'l15-symphony', number: 15, worldId: 'echo-chamber',
        label: 'Symphony',
        description: 'Two bubbles, two doubles. Chain the scatter.',
        targetScore: 260, requiredEngagementCount: 2,
        modifiers: [
            { kind: 'multiplierBubble', category: Categories.ThreeOfAKind },
            { kind: 'multiplierBubble', category: Categories.SmallStraight },
            { kind: 'doubleCategory', category: Categories.FullHouse },
            { kind: 'doubleCategory', category: Categories.Chance },
        ],
    },
    {
        id: 'l16-resonance', number: 16, worldId: 'echo-chamber',
        label: 'Resonance',
        description: 'Ice in the mix forces ordering on the bubble pop.',
        targetScore: 280, requiredEngagementCount: 3,
        modifiers: [
            { kind: 'iceBlock', category: Categories.Fours },
            { kind: 'multiplierBubble', category: Categories.ThreeOfAKind },
            { kind: 'doubleCategory', category: Categories.FullHouse },
            { kind: 'doubleCategory', category: Categories.Yahtzee },
        ],
    },
    {
        id: 'l17-chorus', number: 17, worldId: 'echo-chamber',
        label: 'Chorus',
        description: 'Three doubles and the looping chip — peak pays compound.',
        targetScore: 300, requiredEngagementCount: 2,
        modifiers: [
            { kind: 'doubleCategory', category: Categories.FullHouse },
            { kind: 'doubleCategory', category: Categories.FourOfAKind },
            { kind: 'doubleCategory', category: Categories.Yahtzee },
            { kind: 'loopingMultiplier', category: Categories.Chance, min: 1, max: 3 },
        ],
    },

    // -- World 4: Storm Front --
    {
        id: 'l18-ignite', number: 18, worldId: 'storm-front',
        label: 'Ignite',
        description: 'A bomb arms once you start scoring. Defuse before the fuse runs out.',
        targetScore: 200, requiredEngagementCount: 1,
        modifiers: [
            { kind: 'hotPotato', category: Categories.FullHouse, fuse: 3 },
        ],
    },
    {
        id: 'l19-defuse', number: 19, worldId: 'storm-front',
        label: 'Defuse',
        description: 'Bomb + chip. Catch the boost without losing the fuse.',
        targetScore: 220, requiredEngagementCount: 2,
        modifiers: [
            { kind: 'hotPotato', category: Categories.FourOfAKind, fuse: 3 },
            { kind: 'flyingMultiplier', category: Categories.Yahtzee },
        ],
    },
    {
        id: 'l20-spark', number: 20, worldId: 'storm-front',
        label: 'Spark',
        description: 'Two bombs, a double. Tight scheduling.',
        targetScore: 240, requiredEngagementCount: 2,
        modifiers: [
            { kind: 'hotPotato', category: Categories.Fours, fuse: 3 },
            { kind: 'hotPotato', category: Categories.FullHouse, fuse: 3 },
            { kind: 'doubleCategory', category: Categories.Yahtzee },
        ],
    },
    {
        id: 'l21-combustion', number: 21, worldId: 'storm-front',
        label: 'Combustion',
        description: 'Bomb + bubble + pulse. Chain the scatter while the fuse burns.',
        targetScore: 260, requiredEngagementCount: 3,
        modifiers: [
            { kind: 'hotPotato', category: Categories.FullHouse, fuse: 4 },
            { kind: 'multiplierBubble', category: Categories.ThreeOfAKind },
            { kind: 'loopingMultiplier', category: Categories.Yahtzee, min: 1, max: 3 },
        ],
    },
    {
        id: 'l22-detonation', number: 22, worldId: 'storm-front',
        label: 'Detonation',
        description: 'Two bombs, a chip, a double. Big board, big stakes.',
        targetScore: 280, requiredEngagementCount: 3,
        modifiers: [
            { kind: 'hotPotato', category: Categories.Fours, fuse: 3 },
            { kind: 'hotPotato', category: Categories.FullHouse, fuse: 4 },
            { kind: 'flyingMultiplier', category: Categories.FourOfAKind },
            { kind: 'doubleCategory', category: Categories.Yahtzee },
        ],
    },
    {
        id: 'l23-inferno', number: 23, worldId: 'storm-front',
        label: 'Inferno',
        description: 'Bombs and chips compete for your turns.',
        targetScore: 300, requiredEngagementCount: 3,
        modifiers: [
            { kind: 'hotPotato', category: Categories.Threes, fuse: 3 },
            { kind: 'hotPotato', category: Categories.Sixes, fuse: 3 },
            { kind: 'flyingMultiplier', category: Categories.FullHouse },
            { kind: 'flyingMultiplier', category: Categories.Yahtzee },
            { kind: 'multiplierBubble', category: Categories.SmallStraight },
        ],
    },

    // -- World 5: Storm Surge --
    {
        id: 'l24-maelstrom', number: 24, worldId: 'storm-surge',
        label: 'Maelstrom',
        description: 'Every system threatens at once.',
        targetScore: 290, requiredEngagementCount: 3,
        modifiers: [
            { kind: 'iceBlock', category: Categories.Twos },
            { kind: 'iceBlock', category: Categories.Fives },
            { kind: 'hotPotato', category: Categories.FullHouse, fuse: 3 },
            { kind: 'loopingMultiplier', category: Categories.Yahtzee, min: 1, max: 3 },
            { kind: 'multiplierBubble', category: Categories.ThreeOfAKind },
        ],
    },
    {
        id: 'l25-cyclone', number: 25, worldId: 'storm-surge',
        label: 'Cyclone',
        description: 'Chips fly while the fuse burns.',
        targetScore: 310, requiredEngagementCount: 4,
        modifiers: [
            { kind: 'iceBlock', category: Categories.Fours },
            { kind: 'flyingMultiplier', category: Categories.FullHouse },
            { kind: 'flyingMultiplier', category: Categories.Yahtzee },
            { kind: 'hotPotato', category: Categories.FourOfAKind, fuse: 3 },
            { kind: 'doubleCategory', category: Categories.Chance },
        ],
    },
    {
        id: 'l26-vortex', number: 26, worldId: 'storm-surge',
        label: 'Vortex',
        description: 'Ice + bombs + bubble + two doubles. Pace yourself.',
        targetScore: 330, requiredEngagementCount: 4,
        modifiers: [
            { kind: 'iceBlock', category: Categories.Twos },
            { kind: 'iceBlock', category: Categories.Fives },
            { kind: 'hotPotato', category: Categories.SmallStraight, fuse: 3 },
            { kind: 'doubleCategory', category: Categories.FullHouse },
            { kind: 'doubleCategory', category: Categories.Yahtzee },
            { kind: 'multiplierBubble', category: Categories.ThreeOfAKind },
        ],
    },
    {
        id: 'l27-tempest-rising', number: 27, worldId: 'storm-surge',
        label: 'Tempest Rising',
        description: 'Thick ice plus bomb plus pulse. All four kinds required.',
        targetScore: 340, requiredEngagementCount: 4,
        modifiers: [
            { kind: 'iceBlock', category: Categories.Twos },
            { kind: 'iceBlock', category: Categories.Fours },
            { kind: 'iceBlock', category: Categories.Sixes },
            { kind: 'hotPotato', category: Categories.FullHouse, fuse: 4 },
            { kind: 'loopingMultiplier', category: Categories.Yahtzee, min: 1, max: 3 },
            { kind: 'doubleCategory', category: Categories.LargeStraight },
        ],
    },
    {
        id: 'l28-lightning-strike', number: 28, worldId: 'storm-surge',
        label: 'Lightning Strike',
        description: 'Two bombs, two chips, a bubble, a double.',
        targetScore: 360, requiredEngagementCount: 4,
        modifiers: [
            { kind: 'hotPotato', category: Categories.Fours, fuse: 3 },
            { kind: 'hotPotato', category: Categories.Sixes, fuse: 3 },
            { kind: 'flyingMultiplier', category: Categories.FullHouse },
            { kind: 'flyingMultiplier', category: Categories.Yahtzee },
            { kind: 'multiplierBubble', category: Categories.SmallStraight },
            { kind: 'doubleCategory', category: Categories.Chance },
        ],
    },
    {
        id: 'l29-eye-of-storm', number: 29, worldId: 'storm-surge',
        label: 'Eye of the Storm',
        description: 'One of every modifier. Engage every kind to clear.',
        targetScore: 350, requiredEngagementCount: 6,
        modifiers: [
            { kind: 'iceBlock', category: Categories.Threes },
            { kind: 'flyingMultiplier', category: Categories.FourOfAKind },
            { kind: 'doubleCategory', category: Categories.FullHouse },
            { kind: 'hotPotato', category: Categories.LargeStraight, fuse: 3 },
            { kind: 'multiplierBubble', category: Categories.SmallStraight },
            { kind: 'loopingMultiplier', category: Categories.Yahtzee, min: 1, max: 3 },
        ],
    },

    // -- World 6: Finale --
    {
        id: 'l30-crescendo', number: 30, worldId: 'finale',
        label: 'Crescendo',
        description: 'Stacked classics — three ice, two flying, two doubles.',
        targetScore: 380, requiredEngagementCount: 3,
        modifiers: [
            { kind: 'iceBlock', category: Categories.Twos },
            { kind: 'iceBlock', category: Categories.Fours },
            { kind: 'iceBlock', category: Categories.Sixes },
            { kind: 'flyingMultiplier', category: Categories.FullHouse },
            { kind: 'flyingMultiplier', category: Categories.Yahtzee },
            { kind: 'doubleCategory', category: Categories.LargeStraight },
            { kind: 'doubleCategory', category: Categories.Chance },
        ],
    },
    {
        id: 'l31-thunderhead', number: 31, worldId: 'finale',
        label: 'Thunderhead',
        description: 'Two bombs, two pulses, two doubles, a bubble. Wide threats.',
        targetScore: 400, requiredEngagementCount: 4,
        modifiers: [
            { kind: 'hotPotato', category: Categories.Threes, fuse: 3 },
            { kind: 'hotPotato', category: Categories.Sixes, fuse: 3 },
            { kind: 'multiplierBubble', category: Categories.ThreeOfAKind },
            { kind: 'loopingMultiplier', category: Categories.FullHouse, min: 1, max: 3 },
            { kind: 'loopingMultiplier', category: Categories.Yahtzee, min: 1, max: 4 },
            { kind: 'doubleCategory', category: Categories.LargeStraight },
            { kind: 'doubleCategory', category: Categories.Chance },
        ],
    },
    {
        id: 'l32-eclipse', number: 32, worldId: 'finale',
        label: 'Eclipse',
        description: 'Three ice plus storm. Long planning horizons.',
        targetScore: 420, requiredEngagementCount: 4,
        modifiers: [
            { kind: 'iceBlock', category: Categories.Twos },
            { kind: 'iceBlock', category: Categories.Fours },
            { kind: 'iceBlock', category: Categories.Sixes },
            { kind: 'hotPotato', category: Categories.FullHouse, fuse: 4 },
            { kind: 'flyingMultiplier', category: Categories.FourOfAKind },
            { kind: 'flyingMultiplier', category: Categories.Yahtzee },
            { kind: 'loopingMultiplier', category: Categories.Chance, min: 1, max: 3 },
        ],
    },
    {
        id: 'l33-catalyst', number: 33, worldId: 'finale',
        label: 'Catalyst',
        description: 'Bombs and bubbles cascade into doubles.',
        targetScore: 440, requiredEngagementCount: 5,
        modifiers: [
            { kind: 'hotPotato', category: Categories.Fours, fuse: 3 },
            { kind: 'hotPotato', category: Categories.Sixes, fuse: 3 },
            { kind: 'multiplierBubble', category: Categories.ThreeOfAKind },
            { kind: 'multiplierBubble', category: Categories.SmallStraight },
            { kind: 'doubleCategory', category: Categories.FullHouse },
            { kind: 'doubleCategory', category: Categories.Yahtzee },
            { kind: 'loopingMultiplier', category: Categories.Chance, min: 1, max: 4 },
        ],
    },
    {
        id: 'l34-apex', number: 34, worldId: 'finale',
        label: 'Apex',
        description: 'Everything, all at once. Engage every kind.',
        targetScore: 480, requiredEngagementCount: 6,
        modifiers: [
            { kind: 'iceBlock', category: Categories.Twos },
            { kind: 'iceBlock', category: Categories.Fives },
            { kind: 'flyingMultiplier', category: Categories.FullHouse },
            { kind: 'flyingMultiplier', category: Categories.Yahtzee },
            { kind: 'doubleCategory', category: Categories.FourOfAKind },
            { kind: 'doubleCategory', category: Categories.Chance },
            { kind: 'hotPotato', category: Categories.LargeStraight, fuse: 4 },
            { kind: 'multiplierBubble', category: Categories.ThreeOfAKind },
            { kind: 'loopingMultiplier', category: Categories.SmallStraight, min: 1, max: 4 },
        ],
    },

    // -- World 7: Cycles --
    {
        id: 'l35-first-spin', number: 35, worldId: 'cycles',
        label: 'First Spin',
        description: 'The Three of a Kind slot rotates through 4-of-a-kind and Chance.',
        targetScore: 130, requiredEngagementCount: 1,
        modifiers: [
            { kind: 'loopingCategory', category: Categories.ThreeOfAKind,
              cycle: [Categories.ThreeOfAKind, Categories.FourOfAKind, Categories.Chance] },
        ],
    },
    {
        id: 'l36-double-helix', number: 36, worldId: 'cycles',
        label: 'Double Helix',
        description: 'Two rotating slots — Full House flips with Yahtzee, Chance flips with Sixes.',
        targetScore: 180, requiredEngagementCount: 2,
        modifiers: [
            { kind: 'loopingCategory', category: Categories.FullHouse,
              cycle: [Categories.FullHouse, Categories.Yahtzee] },
            { kind: 'loopingCategory', category: Categories.Chance,
              cycle: [Categories.Sixes, Categories.Yahtzee, Categories.Chance] },
        ],
    },
    {
        id: 'l37-triple-loop', number: 37, worldId: 'cycles',
        label: 'Triple Loop',
        description: 'Three rotating slots, all 3-step cycles. Timing is everything.',
        targetScore: 220, requiredEngagementCount: 3,
        modifiers: [
            { kind: 'loopingCategory', category: Categories.ThreeOfAKind,
              cycle: [Categories.ThreeOfAKind, Categories.FourOfAKind, Categories.Yahtzee] },
            { kind: 'loopingCategory', category: Categories.SmallStraight,
              cycle: [Categories.SmallStraight, Categories.LargeStraight, Categories.Chance] },
            { kind: 'loopingCategory', category: Categories.FullHouse,
              cycle: [Categories.FullHouse, Categories.Yahtzee, Categories.Chance] },
        ],
    },
    {
        id: 'l38-carousel', number: 38, worldId: 'cycles',
        label: 'Carousel',
        description: 'Four rotating slots plus a flying chip looking for the right beat.',
        targetScore: 280, requiredEngagementCount: 4,
        modifiers: [
            { kind: 'loopingCategory', category: Categories.ThreeOfAKind,
              cycle: [Categories.ThreeOfAKind, Categories.Yahtzee] },
            { kind: 'loopingCategory', category: Categories.FourOfAKind,
              cycle: [Categories.FourOfAKind, Categories.Yahtzee, Categories.Chance] },
            { kind: 'loopingCategory', category: Categories.FullHouse,
              cycle: [Categories.FullHouse, Categories.Yahtzee] },
            { kind: 'loopingCategory', category: Categories.SmallStraight,
              cycle: [Categories.SmallStraight, Categories.LargeStraight] },
            { kind: 'flyingMultiplier', category: Categories.Chance, multiplier: 2 },
        ],
    },
];

export function getLevelByNumber(n: number): LevelDefinition | null {
    return LEVELS.find(l => l.number === n) ?? null;
}

export function getLevelById(id: string): LevelDefinition | null {
    return LEVELS.find(l => l.id === id) ?? null;
}

export function getLastLevelNumber(): number {
    return LEVELS[LEVELS.length - 1]?.number ?? 0;
}

export function getLevelsByWorld(worldId: string): LevelDefinition[] {
    return LEVELS.filter(l => l.worldId === worldId);
}
