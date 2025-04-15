export enum SoundEffects {
  DiceRoll = '/sounds/dice-roll-3.mp3',
  DiceHold = '/sounds/hold-dice.mp3',
  Score = '/sounds/score.mp3',
  NoScore = '/sounds/no-score.mp3',
  Yahtzee = '/sounds/yahtzee-3.mp3'
}

export const SoundVolumes: { [key in SoundEffects]: number } = {
  [SoundEffects.DiceRoll]: 0.3,
  [SoundEffects.DiceHold]: 0.7,
  [SoundEffects.Score]: 1.0,
  [SoundEffects.NoScore]: 1.0,
  [SoundEffects.Yahtzee]: 0.4
} 