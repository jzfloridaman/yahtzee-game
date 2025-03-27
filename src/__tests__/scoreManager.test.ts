import { ScoreManager } from '../managers/ScoreManager';
import { Categories } from '../enums/Categories';
import { Die } from '../types/Die';

describe('ScoreManager', () => {
  let scoreManager: ScoreManager;

  beforeEach(() => {
    scoreManager = new ScoreManager();
    scoreManager.initializeScorecard();
  });

  test('should initialize scorecard with all categories unselected', () => {
    const scorecard = scoreManager.getScorecard();
    for (const category in scorecard) {
      expect(scorecard[category as Categories].selected).toBe(false);
      expect(scorecard[category as Categories].value).toBeNull();
    }
  });

  test('should calculate score for a category', () => {
    const dice: Die[] = [
      { value: 1, color: 'red', held: false },
      { value: 1, color: 'blue', held: false },
      { value: 2, color: 'green', held: false },
      { value: 3, color: 'red', held: false },
      { value: 4, color: 'blue', held: false },
    ];
    const score = scoreManager.calculateScore(Categories.Ones, dice);
    expect(score).toBe(2); // Two dice with value 1
  });

  test('should update scorecard for a category', () => {
    scoreManager.updateScorecard(Categories.Ones, 10, true);
    const scorecard = scoreManager.getScorecard();
    expect(scorecard[Categories.Ones].value).toBe(10);
    expect(scorecard[Categories.Ones].selected).toBe(true);
  });

  test('should calculate total score', () => {
    scoreManager.updateScorecard(Categories.Ones, 10, true);
    scoreManager.updateScorecard(Categories.Twos, 20, true);
    const totalScore = scoreManager.getTotalScore();
    expect(totalScore).toBe(30);
  });
});