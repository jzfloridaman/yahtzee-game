/**
 * @jest-environment jsdom
 */
import { YahtzeeGame } from '../../../game';
import { Categories } from '../../../enums/Categories';
import { GameVariant } from '../../../enums/GameVariant';
import { GreedyStrategy } from '../GreedyStrategy';
import { LevelPuzzleConfig } from '../../../puzzle/configs/LevelPuzzleConfig';
import type { LevelDefinition } from '../../../puzzle/levels/types';

function makePuzzleGame(modifiers: LevelDefinition['modifiers']): YahtzeeGame {
    const game = new YahtzeeGame();
    game.setVariant(GameVariant.Puzzle);
    game.setPuzzleConfig(new LevelPuzzleConfig({
        id: 'test', number: 1, worldId: 'test', label: 'test',
        targetScore: 0, requiredEngagementCount: 0,
        modifiers,
    }));
    game.startNewGame(1);
    game.newRoll = false; // skip dice reset on next dice() access
    return game;
}

function forceDice(game: YahtzeeGame, values: number[]): void {
    const dice = game.dice();
    for (let i = 0; i < dice.length && i < values.length; i++) {
        dice[i].value = values[i];
    }
}

describe('GreedyStrategy puzzle awareness', () => {
    test('skips an ice-blocked category when picking the last-roll best', () => {
        const game = makePuzzleGame([
            { kind: 'iceBlock', category: Categories.Yahtzee },
        ]);
        // Five 6s — without ice, AI would lock in Yahtzee (50).
        forceDice(game, [6, 6, 6, 6, 6]);
        game.rollsLeft = 0;
        const decision = new GreedyStrategy().decide(game);
        expect(decision.action).toBe('pickCategory');
        if (decision.action === 'pickCategory') {
            expect(decision.category).not.toBe(Categories.Yahtzee);
            // Should fall through to Sixes (30) — the next best legal score.
            expect(decision.category).toBe(Categories.Sixes);
        }
    });

    test('great-score shortcut respects ice blocks', () => {
        const game = makePuzzleGame([
            { kind: 'iceBlock', category: Categories.LargeStraight },
        ]);
        // 1-2-3-4-5 — a Large Straight (40). AI would normally take it, but
        // the block forces a roll-again decision instead of a pick.
        forceDice(game, [1, 2, 3, 4, 5]);
        game.rollsLeft = 2;
        const decision = new GreedyStrategy().decide(game);
        if (decision.action === 'pickCategory') {
            expect(decision.category).not.toBe(Categories.LargeStraight);
        }
    });
});
