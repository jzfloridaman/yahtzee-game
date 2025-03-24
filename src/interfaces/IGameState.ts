export interface IGameState {
    startNewGame(): void;
    isGameOver(): boolean;
    setGameOver(): void;
}