import { Categories } from '../../enums/Categories';
import type { Die } from '../../types/Die';
import type { YahtzeeGame } from '../../game';
import { useCalculateScore } from '../../utils/CalculateScore';
import { LoopingCategoryModifier } from '../../puzzle/modifiers/LoopingCategoryModifier';
import type { PuzzleEngine } from '../../puzzle/PuzzleEngine';

export type AIDecision =
    | { action: 'pickCategory'; category: Categories }
    | { action: 'rollAgain'; holds: boolean[] };

// Greedy v1: maximize immediate expected value. Always take "great" rolls.
// Otherwise hold dice toward the best target available and re-roll.
//
// Not optimal — no straight-pursuit, no color-pursuit, no probability-aware
// look-ahead. Plays a respectable game (~150-220 typical) and ships in one
// file. Difficulty levels and smarter heuristics belong in follow-ups.
export class GreedyStrategy {
    decide(game: YahtzeeGame): AIDecision {
        const dice = game.dice();
        const player = game.players[game.currentPlayer];
        const scorecard = player.getScorecard();
        const rollsLeft = game.rollsLeft;
        // Puzzle mode: never pick a category the engine vetoes (ice blocks).
        // canScoreFn is a permissive `() => true` outside Puzzle.
        const engine = game.getPuzzleEngine?.(game.currentPlayer) ?? null;
        const canScore = (cat: Categories) => engine ? engine.canScore(cat) : true;

        const potentials = this.scorePotentials(scorecard, dice, canScore, engine);

        // Out of rolls — must pick a category.
        if (rollsLeft === 0) {
            return { action: 'pickCategory', category: this.pickBestCategory(potentials, scorecard, canScore) };
        }

        // Take a great roll immediately rather than risking another roll.
        const great = this.findGreatScore(potentials, scorecard);
        if (great !== null && canScore(great)) {
            return { action: 'pickCategory', category: great };
        }

        // Roll again with holds toward the best target.
        const target = this.pickRollTarget(scorecard, dice, canScore);
        const holds = this.computeHolds(dice, target);
        return { action: 'rollAgain', holds };
    }

    // Score every unselected, scorable category against the current dice.
    // For loopingCategory slots, swap in the currently-active cycle category
    // so the AI sees the score the engine would actually bank.
    private scorePotentials(
        scorecard: Record<string, { selected: boolean }>,
        dice: Die[],
        canScore: (c: Categories) => boolean,
        engine: PuzzleEngine | null,
    ): Map<Categories, number> {
        const map = new Map<Categories, number>();
        for (const [category, entry] of Object.entries(scorecard)) {
            if (entry.selected) continue;
            const cat = category as Categories;
            if (!canScore(cat)) continue;
            const effectiveCat = this.effectiveScoringCategory(cat, engine);
            map.set(cat, useCalculateScore(effectiveCat, dice));
        }
        return map;
    }

    // Returns the category whose scoring rule will actually apply when the
    // player scores `slotCategory`. Today only LoopingCategory rewrites this.
    private effectiveScoringCategory(slotCategory: Categories, engine: PuzzleEngine | null): Categories {
        if (!engine) return slotCategory;
        const mod = engine.getModifierAt(slotCategory);
        if (mod instanceof LoopingCategoryModifier) {
            return mod.activeCategory;
        }
        return slotCategory;
    }

    // Definite "take it" thresholds — these scores are too good to risk.
    private findGreatScore(
        potentials: Map<Categories, number>,
        scorecard: Record<string, { selected: boolean }>,
    ): Categories | null {
        const get = (c: Categories) => potentials.get(c) ?? -1;

        if (get(Categories.Yahtzee) === 50) return Categories.Yahtzee;
        if (get(Categories.LargeStraight) === 40) return Categories.LargeStraight;
        if (get(Categories.Reds) === 35) return Categories.Reds;
        if (get(Categories.Greens) === 35) return Categories.Greens;
        if (get(Categories.Blues) === 35) return Categories.Blues;
        if (get(Categories.SmallStraight) === 30) return Categories.SmallStraight;
        if (get(Categories.FullHouse) === 25) return Categories.FullHouse;

        // Strong upper-section rolls: 4+ of any face value.
        if (get(Categories.Sixes) >= 24) return Categories.Sixes;
        if (get(Categories.Fives) >= 20) return Categories.Fives;
        if (get(Categories.Fours) >= 16) return Categories.Fours;

        // FourOfAKind with a big payout (≥ 20) — rare enough to grab.
        if (get(Categories.FourOfAKind) >= 20 && !scorecard[Categories.FourOfAKind]?.selected) {
            return Categories.FourOfAKind;
        }

        return null;
    }

    // Last-roll decision: take the highest available score. If every option
    // is zero, dump into the lowest-value upper slot (preserving Chance and
    // the better lower-section slots for future turns).
    private pickBestCategory(
        potentials: Map<Categories, number>,
        scorecard: Record<string, { selected: boolean }>,
        canScore: (c: Categories) => boolean,
    ): Categories {
        let best: Categories | null = null;
        let bestScore = -1;
        for (const [cat, score] of potentials.entries()) {
            if (score > bestScore) {
                bestScore = score;
                best = cat;
            }
        }
        if (best !== null && bestScore > 0) return best;

        const dumpOrder: Categories[] = [
            Categories.Ones,
            Categories.Twos,
            Categories.Threes,
            Categories.Reds,
            Categories.Greens,
            Categories.Blues,
            Categories.ColorFullHouse,
            Categories.ThreeOfAKind,
            Categories.FourOfAKind,
            Categories.Yahtzee,
            Categories.SmallStraight,
            Categories.LargeStraight,
            Categories.FullHouse,
            Categories.Fours,
            Categories.Fives,
            Categories.Sixes,
            Categories.Chance,
        ];
        for (const cat of dumpOrder) {
            if (!scorecard[cat]?.selected && canScore(cat)) return cat;
        }
        // Every scorable category is selected or blocked — fall back to any
        // unselected one (last resort; applySelectCategory will no-op on
        // blocked picks, but at least we don't crash).
        for (const cat of dumpOrder) {
            if (!scorecard[cat]?.selected) return cat;
        }
        return best ?? Categories.Chance;
    }

    // Pick the category we'd most like to score, given current dice — the
    // target informs which dice to hold for the next roll.
    private pickRollTarget(
        scorecard: Record<string, { selected: boolean }>,
        dice: Die[],
        canScore: (c: Categories) => boolean,
    ): Categories {
        const valueCounts = new Map<number, number>();
        for (const die of dice) {
            valueCounts.set(die.value, (valueCounts.get(die.value) ?? 0) + 1);
        }
        let dominantValue = 1;
        let maxCount = 0;
        for (const [value, count] of valueCounts.entries()) {
            if (count > maxCount) {
                maxCount = count;
                dominantValue = value;
            }
        }

        const open = (cat: Categories) => !scorecard[cat]?.selected && canScore(cat);

        // 3+ of a kind → keep pursuing Yahtzee / FourOfAKind / ThreeOfAKind.
        if (maxCount >= 3) {
            if (open(Categories.Yahtzee)) return Categories.Yahtzee;
            if (open(Categories.FourOfAKind)) return Categories.FourOfAKind;
            if (open(Categories.ThreeOfAKind)) return Categories.ThreeOfAKind;
        }

        // 2 of a kind → upper section for that face value if available.
        if (maxCount >= 2) {
            const upper = upperCategoryForValue(dominantValue);
            if (open(upper)) return upper;
        }

        // Otherwise pursue the highest-value upper category that's still open.
        for (let value = 6; value >= 1; value--) {
            const upper = upperCategoryForValue(value);
            if (open(upper)) return upper;
        }

        return Categories.Chance;
    }

    // Decide which dice to hold given the target category.
    private computeHolds(dice: Die[], target: Categories): boolean[] {
        const targetValue = valueForUpperCategory(target);
        if (targetValue !== null) {
            return dice.map(d => d.value === targetValue);
        }

        if (target === Categories.Yahtzee ||
            target === Categories.FourOfAKind ||
            target === Categories.ThreeOfAKind ||
            target === Categories.FullHouse) {
            // Hold dice with the most common value.
            const counts = new Map<number, number>();
            for (const die of dice) {
                counts.set(die.value, (counts.get(die.value) ?? 0) + 1);
            }
            let dominantValue = 0;
            let maxCount = 0;
            for (const [value, count] of counts.entries()) {
                if (count > maxCount) {
                    maxCount = count;
                    dominantValue = value;
                }
            }
            return dice.map(d => d.value === dominantValue);
        }

        // Chance / straights / color categories: no good hold heuristic yet.
        // Hold nothing and re-roll everything.
        return dice.map(() => false);
    }
}

function upperCategoryForValue(value: number): Categories {
    const map: Record<number, Categories> = {
        1: Categories.Ones,
        2: Categories.Twos,
        3: Categories.Threes,
        4: Categories.Fours,
        5: Categories.Fives,
        6: Categories.Sixes,
    };
    return map[value] ?? Categories.Ones;
}

function valueForUpperCategory(category: Categories): number | null {
    switch (category) {
        case Categories.Ones: return 1;
        case Categories.Twos: return 2;
        case Categories.Threes: return 3;
        case Categories.Fours: return 4;
        case Categories.Fives: return 5;
        case Categories.Sixes: return 6;
        default: return null;
    }
}
