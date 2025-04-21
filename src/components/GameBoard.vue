<template>
  <div id="game-container">
    <div v-if="isOnlineGame && !isHostTurn" class="waiting-message">
      <div class="bg-gray-800 text-white p-4 shadow-lg text-center waiting-message-content">
        <i class="fas fa-spinner fa-spin text-2xl mb-2"></i>
        <p class="text-lg font-bold">
          <template v-if="peerStore.isHost">
            Waiting for Player 2 to make their move...
          </template>
          <template v-else>
            Waiting for Player 1 to make their move...
          </template>
        </p>
      </div>
    </div>
    <div v-else-if="isOnlineGame && !gameStore.isGameActive" class="waiting-message">
      <div class="bg-purple-600 text-white p-4 rounded-lg shadow-lg text-center">
        <i class="fas fa-spinner fa-spin text-2xl mb-2"></i>
        <p v-if="peerStore.isHost" class="text-lg font-bold">Click the Start Game button to begin!</p>
        <p v-else class="text-lg font-bold">Waiting for host to start the game...</p>
        <button v-if="peerStore.isHost" 
                @click="startGame" 
                class="mt-4 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg">
          Start Game
        </button>
      </div>
    </div>

    <div id="players-container" 
          class="text-center grid gap-2"
        :class="[`grid-cols-${playerCount}`]">
      <div v-for="(_, index) in playerCount" :key="index" 
           :class="['player-data', { active: currentPlayer === index }]">
        <h2 class="text-sm md:text-xl font-bold text-center mb-1">Player {{ index + 1 }}</h2>
        <span class="player-score font-bold text-center">{{ getPlayerScore(index) }}</span>
      </div>
    </div>

    <div id="dice-container" class="flex justify-center gap-4 my-8">
      <div v-for="(die, index) in dice" :key="index" 
           class="die"
           :class="{ 'opacity-90 held': die.held, [`${die.color}`]: true, 'roll': die.isRolling }"
           @click="toggleHold(index)">
        <i :class="['fas', `${getDieIcon(die.value)}`, 'text-white']"></i>
      </div>
    </div>

    <button @click="rollDice" id="roll-button" 
            :disabled="!canRoll || isRolling"
            class="w-full max-w-md mx-auto bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg transition-colors duration-200"
            v-html="rollDiceText">
    </button>

    <div id="scorecard">
      <div class="grid grid-cols-6 gap-2">
        <!-- singles -->
        <div v-for="(category, index) in singleCategories" :key="index" 
             class="score-item" :data-category="category.name"
             :class="{ 'selected': isCategorySelected(category.value) }">
          <div class="category-icon">
            <i :class="['fas', `${getDieIcon(index + 1)}`]"></i>
          </div>
          <div class="score-cell" @click="selectCategory(category.value)">
            {{ getScoreDisplay(category.value) }}
          </div>
        </div>

        <div class="upper-score-progress-bar col-span-6 text-center flex items-center justify-center" :style="{ '--progress-width': totalTopScorePercent + '%' }">
          <span>
            Upper Score: 
            <span id="score-upper">{{ totalTopScore }}</span>/63
          </span>
        </div>

        <!-- multiples -->
        <div v-for="(category, index) in multipleCategories" :key="index" 
            class="score-item" :data-category="category.name"
            :class="{ 'selected': isCategorySelected(category.value) }">
          <div class="category-icon">
              <template v-if="category.icon">
                <i :class="['fas', `${category.icon}`]"></i>
              </template>
              <template v-else>
                {{ category.text }}
              </template>
          </div>
          <div class="score-cell" @click="selectCategory(category.value)">
            {{ getScoreDisplay(category.value) }}
          </div>
        </div>

        <!-- colors -->
        <div v-for="(category, index) in colorCategories" :key="index" 
            class="score-item" :data-category="category.name"
            :class="{ 'selected': isCategorySelected(category.value), [`${category.color}`]: true }">
          <div class="category-icon">
              <template v-if="category.icon">
                <i :class="['fas', `${category.icon}`]"></i>
              </template>
              <template v-else>
                {{ category.text }}
              </template>
          </div>
          <div class="score-cell" @click="selectCategory(category.value)">
            {{ getScoreDisplay(category.value) }}
          </div>
        </div>
        <div class="score-item">
          <div class="category-icon">
            <i class="fas fa-star"></i>
          </div>
          <div class="score-cell">
            {{ currentGame?.players[currentPlayer].scoreManager.isUpperSectionBonusAchieved() ? '35' : '-' }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import { useGameStore } from '../stores/gameStore'
import { usePeerStore } from '../stores/peerStore'
import { Categories } from '../enums/Categories'
import { GameState } from '../enums/GameState'
import { GameMode } from '../enums/GameMode'
import { SoundEffects } from '../enums/SoundEffects';
import { showYahtzeeAnimation, showScoreAnimation } from '../utils/animations'

const emit = defineEmits<{
  (e: 'end-game'): void
}>()

const gameStore = useGameStore()
const peerStore = usePeerStore()

// Local reactive states
const isRolling = ref(false);

// Computed properties for game state
const currentGame = computed(() => gameStore.currentGame);
const playerCount = computed(() => currentGame.value?.getPlayerCount() || 0);
const currentPlayer = computed(() => currentGame.value?.currentPlayer || 0);
const dice = computed(() => {
  if (!currentGame.value) return [];
  const currentDice = currentGame.value.dice();
  //console.log('Dice computed property updated:', JSON.stringify(currentDice, null, 2));
  return currentDice.map(die => ({
    value: die.value,
    color: die.color,
    held: die.held,
    isRolling: die.isRolling
  }));
});

const rollsLeft = computed(() => {
  const rolls = currentGame.value?.rollsLeft || 0;
  return rolls;
});

const newRoll = computed(() => currentGame.value?.newRoll || false);
const canRoll = computed(() => currentGame.value && currentGame.value.rollsLeft > 0);
const totalTopScore = computed(() => currentGame.value?.getTotalTopScore() || 0);

// Online game state
const isOnlineGame = computed(() => gameStore.currentGameMode === GameMode.OnlineMultiPlayer)
const isHostTurn = computed(() => {
  if (!isOnlineGame.value || !gameStore.currentGame) return true
  // Host is always player 0, client is always player 1
  // If it's host's turn (currentPlayer === 0) and we're the host, or
  // if it's client's turn (currentPlayer === 1) and we're the client
  return (gameStore.currentGame.currentPlayer === 0 && peerStore.isHost) || 
         (gameStore.currentGame.currentPlayer === 1 && !peerStore.isHost)
})

const totalTopScorePercent = computed(() => {
  return (totalTopScore.value / 63) * 100;
})

// Game actions
const rollDice = () => {
  // this really needs to be refactored to keep it DRY
  if (isOnlineGame.value) {
    if (peerStore.isHost) {
      isRolling.value = true;
      gameStore.rollDice();
      dice.value.forEach((die) => {
        if (!die.held) {
          die.isRolling = true;
          setTimeout(() => {
            die.isRolling = false;
          }, 1000);
        }
      });
      setTimeout(() => {
        isRolling.value = false;
      }, 1000);
    } else {
      peerStore.sendData({ type: 'rollDice' });
      // animate dice
      gameStore.playRollDiceAnimation();
    }
  } else {
    isRolling.value = true;
    gameStore.rollDice();
    dice.value.forEach((die) => {
      if (!die.held) {
        die.isRolling = true;
        setTimeout(() => {
          die.isRolling = false;
        }, 1000);
      }
    });
    setTimeout(() => {
      isRolling.value = false;
    }, 1000);
  }
}

const rollDiceText = computed(() => {

  let text = `<div class="flex gap-2">`;
    if(newRoll.value){
        text += `<div class="text-center flex-1">START ROLL</div>`;
    }else{
        text += `<div class="flex-1">ROLL</div>`
        if(rollsLeft.value === 0){
            text += `<div class="w-12 rounded text-slate-600"><span class="fa fa-solid fa-circle"></span></div>`;
            text += `<div class="w-12 rounded text-slate-600"><span class="fa fa-solid fa-circle"></span></div>`;
            text += `<div class="w-12 rounded text-slate-600"><span class="fa fa-solid fa-circle"></span></div>`;
        }
        if(rollsLeft.value === 1){
            text += `<div class="w-12 rounded text-blue-300"><span class="fa fa-solid fa-circle"></span></div>`;
            text += `<div class="w-12 rounded text-slate-600"><span class="fa fa-solid fa-circle"></span></div>`;
            text += `<div class="w-12 rounded text-slate-600"><span class="fa fa-solid fa-circle"></span></div>`;
        }
        if(rollsLeft.value === 2){
            text += `<div class="w-12 rounded text-blue-300"><span class="fa fa-solid fa-circle"></span></div>`;
            text += `<div class="w-12 rounded text-blue-300"><span class="fa fa-solid fa-circle"></span></div>`;
            text += `<div class="w-12 rounded text-slate-600"><span class="fa fa-solid fa-circle"></span></div>`;
        } 
    }

    return text + `</div>`;
})

const toggleHold = (index: number) => {

  // this needs to be refactored to keep it DRY

  if (isOnlineGame.value) {

    if(newRoll.value){
      return;
    }

    if (peerStore.isHost) {
      peerStore.sendData({ type: 'holdDice', index });
      currentGame.value?.toggleHold(index);
      gameStore.playSoundEffect?.(SoundEffects.DiceHold);
    } else {
      peerStore.sendData({ type: 'holdDice', index });
      gameStore.playSoundEffect?.(SoundEffects.DiceHold);
      //gameStore.toggleHold(index);
      currentGame.value?.toggleHold(index);
    }
  } else {

    if(newRoll.value){
      return;
    }

    currentGame.value?.toggleHold(index);
    gameStore.playSoundEffect?.(SoundEffects.DiceHold);
  }
}

const getPlayerScore = (index: number): number => {
  return currentGame.value?.getPlayerScore(index) || 0;
}

const getScoreDisplay = (category: Categories): string => {
  // If category is already selected, just return the stored score
  if(currentGame.value?.isCategorySelected(category)){
    // if score is 0 return X
    if(currentGame.value?.getScoreByCategory(category) === 0){
      return 'X';
    }
    return currentGame.value?.getScoreByCategory(category)?.toString() || '-';
  }
  
  // Only calculate score if we're not in a new roll state
  if (newRoll.value) {
    return '-';
  }
  
  const score = currentGame.value?.calculateScore(category);
  return score === null || score === undefined ? '-' : score.toString();
}

const isCategorySelected = (category: Categories): boolean => {
  return currentGame.value?.isCategorySelected(category) || false
}

const selectCategory = (category: Categories) => {
  if (!currentGame.value || currentGame.value.isCategorySelected(category)) return;

    // this needs to be refactored to keep it DRY

  if (isOnlineGame.value) {

    // dont allow to select category if newroll
    if(newRoll.value){
      return;
    }

    const peerStore = usePeerStore()
    if (peerStore.isHost) {
      // Host calculates score and updates game state
      const score = currentGame.value.calculateScore(category);
      //currentGame.value.updateSelectedScore(category, score, false);
      handleCategorySelection(category, score);
      //console.log('sending select category to player 2 with score:', score);
      peerStore.sendData({ type: 'selectCategory', category, score: score });
      gameStore.sendGameState();
      gameStore.nextPlayer();
    } else {

      const score = currentGame.value.calculateScore(category);
      // check for bonus yahtzee scores.
      if(currentGame.value.isCategorySelected(Categories.Yahtzee) && category !== Categories.Yahtzee){
        if (currentGame.value.dice().every(die => die.value === currentGame.value?.dice()[0].value) && 
            currentGame.value.dice()[0].value !== 0) {  
          let currentYahtzeeScore = currentGame.value.getScoreByCategory(Categories.Yahtzee);
          if(currentYahtzeeScore > 0 && score > 0){
            let updateYahtzeeScore = currentYahtzeeScore + 100;
            peerStore.sendData({ type: 'bonusYahtzee', category, score: updateYahtzeeScore });
            gameStore.playSoundEffect?.(SoundEffects.Yahtzee)
            showYahtzeeAnimation();
          }
        }
      }
      // Client sends category selection to host
      
      peerStore.sendData({ type: 'selectCategory', category, score: score });
      // showScoreAnimation(score);
      scoringAudioAndAnimation(category,score);
    }
  } else {

    // Single player or local multiplayer
    if(newRoll.value){
      return;
    }

    const score = currentGame.value.calculateScore(category);
    handleCategorySelection(category, score);
    //currentGame.value.updateSelectedScore(category, score, false);
  }
}

const scoringAudioAndAnimation = (category: Categories, score: number) => {
  if(score > 0){
    if(category === Categories.Yahtzee){
      showYahtzeeAnimation();
      gameStore.playSoundEffect?.(SoundEffects.Yahtzee)
    }else{  
      showScoreAnimation(score);
      gameStore.playSoundEffect?.(SoundEffects.Score)
    }
  }else{
    gameStore.playSoundEffect?.(SoundEffects.NoScore)
  }
}

const handleCategorySelection = (category: Categories, score: number) => {
  if (!currentGame.value) return;

  // Check for additional Yahtzee
  if(currentGame.value.isCategorySelected(Categories.Yahtzee) && category !== Categories.Yahtzee){
    if (currentGame.value.dice().every(die => die.value === currentGame.value?.dice()[0].value) && 
        currentGame.value.dice()[0].value !== 0) {  
      let currentYahtzeeScore = currentGame.value.getScoreByCategory(Categories.Yahtzee);
      if(currentYahtzeeScore > 0 && score > 0){
        let updateYahtzeeScore = currentYahtzeeScore + 100;
        currentGame.value.updateSelectedScore(Categories.Yahtzee, updateYahtzeeScore);
        if(isOnlineGame.value && peerStore.isHost){
          peerStore.sendData({ type: 'bonusYahtzee', category, score: updateYahtzeeScore });
        }
        gameStore.playSoundEffect?.(SoundEffects.Yahtzee)
        showYahtzeeAnimation();
      }
    }
  }

  currentGame.value.updateSelectedScore(category, score, false);
  scoringAudioAndAnimation(category,score);

  setTimeout(() => {
    if (currentGame.value) {
      if (currentGame.value.isGameOver()){
        if(currentGame.value.state === GameState.GameOver){
          endGame();
        }
      }

      if(!isOnlineGame.value){
        currentGame.value.nextPlayer();
        currentGame.value.newRoll = true;
        currentGame.value.rollsLeft = 2;
      }


    }
  }, 0);
}

const getDieIcon = (die: number): string => {
  switch (die) {
    case 1:
      return 'fa-dice-one'
    case 2:
      return 'fa-dice-two'
    case 3:
      return 'fa-dice-three'
    case 4:
      return 'fa-dice-four'
    case 5:
      return 'fa-dice-five'
    case 6:
      return 'fa-dice-six'
    default:
      return 'fa-dice'
  } 
}

const singleCategories = [
  { name: 'Ones', value: Categories.Ones },
  { name: 'Twos', value: Categories.Twos },
  { name: 'Threes', value: Categories.Threes },
  { name: 'Fours', value: Categories.Fours },
  { name: 'Fives', value: Categories.Fives },
  { name: 'Sixes', value: Categories.Sixes }
]

const multipleCategories = [
  { name: 'Three of a Kind', value: Categories.ThreeOfAKind, text: '3X' },
  { name: 'Four of a Kind', value: Categories.FourOfAKind, text: '4X' },
  { name: 'Full House', value: Categories.FullHouse, icon: 'fas fa-home' },
  { name: 'Small Straight', value: Categories.SmallStraight, text: 'Sm' },
  { name: 'Large Straight', value: Categories.LargeStraight, text: 'Lg' },
  { name: 'Chance', value: Categories.Chance, text: '?' }
]

const colorCategories = [
  { name: 'Yahtzee', value: Categories.Yahtzee, text: 'Y!' },
  { name: 'Blue', value: Categories.Blues, text: 'B', color: 'blue' },
  { name: 'Red', value: Categories.Reds, text: 'R', color: 'red' },
  { name: 'Green', value: Categories.Greens, text: 'G', color: 'green' },
  { name: 'Color Full House', value: Categories.ColorFullHouse, icon: 'fas fa-home', color: 'purple' },
]


const endGame = () => {
  emit('end-game');
}

const startGame = () => {
  gameStore.startOnlineGame();
};
</script>

<style scoped>
.waiting-message {
  position: fixed;
  top:0;
  left:0;
  z-index: 49; /* 100 */
  height: 100vh;
  width: 100vw;
  background-color: rgba(0, 0, 0, 0.1);
  /* bottom:0; 
  z-index: 100;
  width: 100%;
  max-width: 400px; /*
  /* top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  opacity: 0.75; */
}

.waiting-message .waiting-message-content{
position:fixed;
  /* top: 50%;
   */
   bottom:0;
  /* left: 50%;
  transform: translate(-50%, -50%); */
  opacity: 0.98;
  width:100%;

}

/* ... rest of the styles ... */
</style> 