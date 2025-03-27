/**
 * @jest-environment jsdom
 */
jest.mock('../ui/ui', () => ({
    initializeUI: jest.fn(), // Mock the initializeUI function
  }));
import { YahtzeeGame } from '../game';
import { Categories } from '../enums/Categories';
import { GameState } from '../enums/GameState';

describe('YahtzeeGame', () => {
  let game: YahtzeeGame;

  beforeEach(() => {
    game = new YahtzeeGame();
  });

  test('should initialize with default values', () => {
    expect(game.players).toBe(1);
    expect(game.rollsLeft).toBe(2);
    expect(game.state).toBe(GameState.MainMenu);
  });

  test('should start a new game with multiple players', () => {
    game.startNewGame(4);
    expect(game.players).toBe(4);
    expect(game.state).toBe(GameState.Playing);
    expect(game.dice().length).toBe(5); // Assuming 5 dice are used in the game
  });

  test('should calculate score for a category', () => {
    game.startNewGame(1);
    game.rollDice();
    const score = game.calculateScore(Categories.Ones);
    expect(score).toBeGreaterThanOrEqual(0); // Score should be valid
  });

  test('should switch to the next player in multiplayer mode', () => {
    game.startNewGame(3);
    game.nextPlayer();
    expect(game.currentPlayer).toBe(1);
    game.nextPlayer();
    expect(game.currentPlayer).toBe(2);
    game.nextPlayer();
    expect(game.currentPlayer).toBe(0); // Should loop back to the first player
  });

  test('should set game over when all categories are selected', () => {
    game.startNewGame(1);
    const scoreManager = game['scoreManager'][0]; // Access the first player's ScoreManager
    for (const category in Categories) {
      if (!isNaN(Number(category))) continue; // Skip numeric keys
      scoreManager.updateScorecard(Categories[category as keyof typeof Categories], 10, true);
    }
    expect(game.isGameOver()).toBe(true);
    expect(game.state).toBe(GameState.GameOver);
  });
});