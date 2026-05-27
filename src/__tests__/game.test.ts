/**
 * @jest-environment jsdom
 */
import { YahtzeeGame } from '../game';
import { Categories } from '../enums/Categories';
import { GameState } from '../enums/GameState';

describe('YahtzeeGame', () => {
  let game: YahtzeeGame;

  beforeEach(() => {
    game = new YahtzeeGame();
  });

  test('should initialize with default values', () => {
    expect(game.players.length).toBe(0);
    expect(game.rollsLeft).toBe(2);
    expect(game.state).toBe(GameState.MainMenu);
  });

  test('should start a new game with multiple players', () => {
    game.startNewGame(4);
    expect(game.players.length).toBe(4);
    expect(game.state).toBe(GameState.Playing);
    expect(game.dice().length).toBe(5);
  });

  test('should calculate score for a category', () => {
    game.startNewGame(1);
    game.rollDice();
    const score = game.calculateScore(Categories.Ones);
    expect(score).toBeGreaterThanOrEqual(0);
  });

  test('should switch to the next player in multiplayer mode', () => {
    game.startNewGame(3);
    game.nextPlayer();
    expect(game.currentPlayer).toBe(1);
    game.nextPlayer();
    expect(game.currentPlayer).toBe(2);
    game.nextPlayer();
    expect(game.currentPlayer).toBe(0);
  });

  test('should set game over when all categories are selected', () => {
    game.startNewGame(1);
    const scoreManager = game.players[0].scoreManager;
    for (const category in Categories) {
      if (!isNaN(Number(category))) continue;
      scoreManager.updateScorecard(Categories[category as keyof typeof Categories], 10, true);
    }
    // isGameOver is currently side-effecting: first call marks player done,
    // second call sees all players completed and flips state. Tracked as a
    // P3 cleanup in docs/refactor-plan.md.
    expect(game.isGameOver()).toBe(false);
    expect(game.isGameOver()).toBe(true);
    expect(game.state).toBe(GameState.GameOver);
  });
});