export type DieColor = 'red' | 'green' | 'blue' | 'blank';

export type Die = {
  value: number;
  color?: DieColor;
  held: boolean;
  isRolling: boolean;
};