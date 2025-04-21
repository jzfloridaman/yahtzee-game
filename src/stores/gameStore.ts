import { defineStore } from 'pinia'
import { YahtzeeGame } from '../game'
import { GameMode } from '../enums/GameMode'
import { SoundEffects } from '../enums/SoundEffects'
import { usePeerStore } from './peerStore'
import { Categories } from '../enums/Categories'

import { showYahtzeeAnimation, showScoreAnimation, showEmojiAnimation } from '../utils/animations'
interface PlayerScore {
  playerNumber: number;
  score: number;
}

interface GameHistory {
  date: string;
  mode: GameMode;
  players: number;
  scores: PlayerScore[];
}

const MAX_HISTORY_ITEMS = 10;

export const useGameStore = defineStore('game', {
  state: () => ({
    // Game state
    game: null as YahtzeeGame | null,
    gameMode: null as GameMode | null,
    isGameActive: false,
    gameIsOver: false,

    // Audio settings
    bgmEnabled: localStorage.getItem('bgmEnabled') === 'true',
    sfxEnabled: localStorage.getItem('sfxEnabled') === 'true',
    playSoundEffect: null as ((effect: SoundEffects) => void) | null,

    // UI state
    showAudioSettings: false,
    showGameHistory: false,
    showGameOptions: false,

    // Game history
    gameHistory: JSON.parse(localStorage.getItem('gameHistory') || '[]') as GameHistory[],
  }),

  getters: {
    currentGame: (state) => state.game,
    currentGameMode: (state) => state.gameMode,
    gameIsActive: (state) => state.isGameActive,
    audioSettings: (state) => ({
      bgmEnabled: state.bgmEnabled,
      sfxEnabled: state.sfxEnabled
    }),
  },

  actions: {
    initializeGame(mode: GameMode, players: number = 1) {
      this.game = new YahtzeeGame()
      this.game.setGameMode(mode)
      this.gameMode = mode
      this.isGameActive = true
      this.game.setPlayers(players)
      this.game.startNewGame(players)

      // If this is an online game, set up the peer connection
      if (mode === GameMode.OnlineMultiPlayer) {
        const peerStore = usePeerStore()
        if (peerStore.isHost) {
          // Host sends initial game state
          this.sendGameState()
        }
      }
    },

    sendGameState() {
      const peerStore = usePeerStore();
      if (this.game && peerStore.isConnected) {
        console.log('Sending game state');
        const gameState = {
          type: 'gameState',
          data: this.game.getGameState()
        };
        peerStore.sendData(gameState);
      } else {
        console.log('Cannot send game state:', {
          hasGame: !!this.game,
          isConnected: peerStore.isConnected
        });
      }
    },

    handleIncomingData(data: any) {
      if (this.gameMode !== GameMode.OnlineMultiPlayer) {
        console.log('Not in online mode');
        return;
      }

      //console.log('Received data:', data);

      switch (data.type) {
        case 'gameStarted':
          console.log('Game started message received');
          if (!usePeerStore().isHost) {
            this.initializeGame(GameMode.OnlineMultiPlayer, 2);
          }
          break;

        case 'gameOver':
          console.log('Game over message received');
          this.endGame();
          break;

        case 'gameState':
          console.log('Updating game state');
          if (!usePeerStore().isHost && this.game) {

            this.game.updateFromState(data.data);

            if(!data.data.newRoll){
              this.playRollDiceAnimation();
            }
            
            
            if (data.data.isGameOver) {
              this.gameIsOver = true;
            }
          }
          break;
        case 'rollDice':
          //console.log('Rolling dice');
          if (usePeerStore().isHost) {
            this.rollDice();
            // Send updated game state after rolling
            this.sendGameState();
            this.playRollDiceAnimation();
          }else{
            // animate dice on client
            this.playRollDiceAnimation();
          }
          break;
        case 'holdDice':
          //console.log('Holding dice at index:', data.index);
          if (usePeerStore().isHost) {
            this.game?.toggleHold(data.index);
            //this.sendGameState();
          } else {
            // Client should update its held state
            this.game?.toggleHold(data.index);
          }
          break;

        case 'bonusYahtzee':
          //console.log('Bonus yahtzee message received');
          if(usePeerStore().isHost){
            this.game?.updateSelectedScore(Categories.Yahtzee, data.score, false);
          }

          if(data.score > 0){
            showYahtzeeAnimation();
            //showScoreAnimation(data.score);
          }
          

          break;

        case 'selectCategory':
          //console.log('Selecting category:', data.category);
          if (usePeerStore().isHost) {

            if(this.game?.isGameOver()){
              console.log('Game is over, cannot select category');
              usePeerStore().sendData({ type: 'gameOver' });
              this.endGame();
              return;
            }

            // Host calculates score and updates game state
            // needs to check for bonus yahtzee scores.
            const score = this.game?.calculateScore(data.category as Categories) || 0;
            this.game?.updateSelectedScore(data.category as Categories, score, false);

            if(data.category === Categories.Yahtzee && score > 0){
              showYahtzeeAnimation();
            }

            showScoreAnimation(score, data.category);
            
            this.sendGameState();
            this.nextPlayer();

          } else {
            if(data.category === Categories.Yahtzee && data.score > 0){
              showYahtzeeAnimation();
            }
            showScoreAnimation(data.score, data.category);

          }
          break;

        case 'emoji':
          if(data.emoji){
            showEmojiAnimation(data.emoji);
          }else{
            console.log('Unknown emoji:', data.emoji);
          }
          break;

        case 'chatMessage':
          console.log('Chat message received:', data.message);
          break;

        case 'resyncRequest':
          if (usePeerStore().isHost) {
            this.sendGameState();
          }
          break;
        default:
          console.log('Unknown data type:', data.type);
      }
    },

    saveGameHistory() {
      localStorage.setItem('gameHistory', JSON.stringify(this.gameHistory))
    },

    endGame() {
      if (this.game) {
        // Create scores array with player numbers
        const scores: PlayerScore[] = Array.from(
          { length: this.game.getPlayerCount() }, 
          (_, i) => ({
            playerNumber: i + 1,
            score: this.game!.getPlayerScore(i)
          })
        );

        // Add new game to history
        this.gameHistory.unshift({
          date: new Date().toISOString(),
          mode: this.gameMode!,
          players: this.game.getPlayerCount(),
          scores
        })

        // Keep only the last 10 games
        this.gameHistory = this.gameHistory.slice(0, MAX_HISTORY_ITEMS)
        
        // Save to localStorage
        this.saveGameHistory()

        // Disconnect from peer if in online mode
        if (this.gameMode === GameMode.OnlineMultiPlayer) {
          usePeerStore().disconnect()
        }
      }

      // enable the game over screen
      this.gameIsOver = true;
    },

    nextPlayer() {
      if (this.game) {
        this.game.nextPlayer()
        // Reset rolls and newRoll state for the next player
        this.game.rollsLeft = 2
        this.game.newRoll = true
        if (this.gameMode === GameMode.OnlineMultiPlayer) {
          if(this.game.isGameOver()){
            this.endGame();
            return;
          }
          this.game.forceDiceReset();
          this.sendGameState()
        }
      }
    },

    // Audio settings
    toggleAudioSettings() {
      this.showAudioSettings = !this.showAudioSettings
    },

    toggleGameHistory() {
      this.showGameHistory = !this.showGameHistory
    },

    toggleGameOptions() {
      this.showGameOptions = !this.showGameOptions
    },

    setBgmEnabled(enabled: boolean) {
      this.bgmEnabled = enabled
      localStorage.setItem('bgmEnabled', enabled.toString())
    },

    setSfxEnabled(enabled: boolean) {
      this.sfxEnabled = enabled
      localStorage.setItem('sfxEnabled', enabled.toString())
    },

    // Game actions
    restartGame() {
      if (this.game) {
        const playerCount = this.game.getPlayerCount()
        this.game.startNewGame(playerCount)
        if (this.gameMode === GameMode.OnlineMultiPlayer) {
          this.sendGameState()
        }
      }
    },

    newGame() {
      if (this.gameMode === GameMode.OnlineMultiPlayer) {
        usePeerStore().disconnect()
      }
      this.game = null
      this.gameMode = null
      this.isGameActive = false
      this.gameIsOver = false
    },

    rollDice() {
      if(!this.game){
        console.log('no game');
        return;
      }

      if(this.game.rollsLeft === 0 && !this.game.newRoll){
        return;
      }
    
      if(this.game.newRoll){   
          this.game.newRoll = false;
          this.game.startNewRoll();
          this.playSoundEffect?.(SoundEffects.DiceRoll);
          this.game.rollDice();
          this.game.rollsLeft = 2;
      }else{
          this.playSoundEffect?.(SoundEffects.DiceRoll);
          this.game.rollDice();
      }

      if (this.gameMode === GameMode.OnlineMultiPlayer) {
        const peerStore = usePeerStore()

        if (peerStore.isHost) {

          // Host sends updated game state after rolling
          this.sendGameState()
          peerStore.sendData({ type: 'rollDice' });
        } else {
          // Client sends roll request to host
          peerStore.sendData({ type: 'rollDice' });
        }
      }
    },

    toggleHold(index: number) {
      if (this.game) {
        if (this.gameMode === GameMode.OnlineMultiPlayer) {
          const peerStore = usePeerStore()
          if (peerStore.isHost) {
            this.game.toggleHold(index)
            this.sendGameState()
            peerStore.sendData({ type: 'holdDice', index })
          } else {
            peerStore.sendData({ type: 'holdDice', index })
          }
        } else {
          this.game.toggleHold(index)
        }
      }
    },

    playRollDiceAnimation() {

      if (this.game) {
        const dice = this.game.dice();
        dice.forEach((die) => {
          if (!die.held) {
            die.isRolling = true;
          }
        });
        setTimeout(() => {
          dice.forEach((die) => {
            die.isRolling = false;
          });
        }, 1000);
      }
    },

    // i dont think this is needed
    selectCategory(category: Categories) {
      if (this.game) {
        if (this.gameMode === GameMode.OnlineMultiPlayer) {
          const peerStore = usePeerStore()
          if (peerStore.isHost) {
            this.game.selectCategory(category)
            // Send the category selection to the client
            peerStore.sendData({ type: 'selectCategory', category, score: 1000 })
            this.sendGameState()
            // After selecting a category, move to next player
            this.nextPlayer()
          } else {
            //console.log('selecting category on client, sending to host');
            peerStore.sendData({ type: 'selectCategory', category })
            this.game.selectCategory(category)
          }
        } else {
          this.game.selectCategory(category)
        }
      }
    },

    startOnlineGame() {
      if (this.gameMode === GameMode.OnlineMultiPlayer) {
        const peerStore = usePeerStore();
        if (peerStore.isHost) {
          // Host initializes game
          this.initializeGame(GameMode.OnlineMultiPlayer, 2);
          // Send game started message to client
          peerStore.sendData({ type: 'gameStarted' });
          // Send initial game state
          this.sendGameState();
        }
      }
    },
  },
}) 