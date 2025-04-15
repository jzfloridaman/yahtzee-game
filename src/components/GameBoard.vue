<template>
  <div id="game-container">
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
          <div class="score-cell" @click="selectCategory(category)">
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
          <div class="score-cell" @click="selectCategory(category)">
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
          <div class="score-cell" @click="selectCategory(category)">
            {{ getScoreDisplay(category.value) }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useGameStore } from '../stores/gameStore'
import { Categories } from '../enums/Categories'
import { GameState } from '../enums/GameState'
const emit = defineEmits<{
  (e: 'end-game'): void
}>()

const gameStore = useGameStore()

// Local reactive states
const isRolling = ref(false);

// Computed properties for game state
const currentGame = computed(() => gameStore.currentGame);
const playerCount = computed(() => currentGame.value?.getPlayerCount() || 0);
const currentPlayer = computed(() => currentGame.value?.currentPlayer || 0);
const dice = computed(() => currentGame.value?.dice() || []);
const rollsLeft = computed(() => currentGame.value?.rollsLeft || 0);
const newRoll = computed(() => currentGame.value?.newRoll || false);
const canRoll = computed(() => currentGame.value && currentGame.value.rollsLeft > 0);
const totalTopScore = computed(() => currentGame.value?.getTotalTopScore() || 0);

const totalTopScorePercent = computed(() => {
  return (totalTopScore.value / 63) * 100;
})

// Game actions
const rollDice = () => {
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
  currentGame.value?.toggleHold(index)
}

const getPlayerScore = (index: number): number => {
  return currentGame.value?.getPlayerScore(index) || 0
}

const getScoreDisplay = (category: Categories): string => {
  // If category is already selected, just return the stored score
  if(currentGame.value?.isCategorySelected(category)){
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

const selectCategory = (category: { value: Categories }) => {
  if (!currentGame.value || currentGame.value.isCategorySelected(category.value) || newRoll.value) {
    return;
  }

  const score = currentGame.value.calculateScore(category.value);
  if (score !== undefined && category.value !== Categories.TopBonus) {

    currentGame.value.updateSelectedScore(category.value, score, false);

    setTimeout(() => {
      if (currentGame.value) {

        if (currentGame.value.isGameOver()){
          if(currentGame.value.state === GameState.GameOver){
            endGame();
          }
        }

        currentGame.value.nextPlayer();
        currentGame.value.newRoll = true;
        currentGame.value.rollsLeft = 2;
        
      }
    }, 0);
  }
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
  { name: 'Top Bonus', value: Categories.TopBonus, text: 'B!' }
]


const endGame = () => {
  emit('end-game');
}
</script> 