export enum SoundEffects {
  DiceRoll = '/yahtzee/sounds/dice-roll-3.mp3',
  DiceHold = '/yahtzee/sounds/hold-dice.mp3',
  Score = '/yahtzee/sounds/score.mp3',
  NoScore = '/yahtzee/sounds/no-score.mp3',
  Yahtzee = '/yahtzee/sounds/yahtzee-3.mp3'
}

export const SoundVolumes: { [key in SoundEffects]: number } = {
  [SoundEffects.DiceRoll]: 0.3,
  [SoundEffects.DiceHold]: 0.7,
  [SoundEffects.Score]: 1.0,
  [SoundEffects.NoScore]: 1.0,
  [SoundEffects.Yahtzee]: 0.7
} 