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
           :class="{ 'opacity-90 held': die.held, [`${die.color}`]: true }"
           @click="toggleHold(index)">
        <i :class="['fas', `${getDieIcon(die.value)}`, 'text-white']"></i>
      </div>
    </div>

    <button @click="rollDice" id="roll-button" 
            :disabled="!canRoll"
            class="w-full max-w-md mx-auto bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg transition-colors duration-200">
      Roll Dice ({{ rollsLeft }})
    </button>

    <div id="scorecard" class="mt-8">
      <div class="grid grid-cols-6 gap-2">
        <!-- singles -->
        <div v-for="(category, index) in singleCategories" :key="index" 
             class="score-item" :data-category="category.name">
          <div class="category-icon">
            <i :class="['fas', `${getDieIcon(index + 1)}`]"></i>
          </div>
          <div class="score-cell" @click="selectCategory(category)">
            {{ getScoreDisplay(category.value) }}
          </div>
        </div>

        <div class="col-span-6 text-center">
          <span>
            Upper Score: 
            <span id="score-upper">{{ totalTopScore }}</span>/63
          </span>
        </div>

        <!-- multiples -->
        <div v-for="(category, index) in multipleCategories" :key="index" 
             class="score-item" :data-category="category.name">
          <div class="category-icon">{{ category.icon }}</div>
          <div class="score-cell" @click="selectCategory(category)">
            {{ getScoreDisplay(category.value) }}
          </div>
        </div>

        <!-- colors -->
        <div v-for="(category, index) in colorCategories" :key="index" 
             class="score-item" :data-category="category.name">
          <div class="category-icon">{{ category.icon }}</div>
          <div class="score-cell" @click="selectCategory(category)">
            {{ getScoreDisplay(category.value) }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/gameStore'
import { Categories } from '../enums/Categories'

const gameStore = useGameStore()

// Computed properties for game state
const currentGame = computed(() => gameStore.currentGame);
const playerCount = computed(() => currentGame.value?.getPlayerCount() || 0);
const currentPlayer = computed(() => currentGame.value?.currentPlayer || 0);
const dice = computed(() => currentGame.value?.dice() || []);
const rollsLeft = computed(() => currentGame.value?.rollsLeft || 0);
const canRoll = computed(() => currentGame.value && currentGame.value.rollsLeft > 0);
const totalTopScore = computed(() => currentGame.value?.getTotalTopScore() || 0);

// Game actions
const rollDice = () => {
  //console.log('rollDice');
  //currentGame.value?.rollDice()
  gameStore.rollDice();
}

const toggleHold = (index: number) => {
  currentGame.value?.toggleHold(index)
}

const getPlayerScore = (index: number): number => {
  return currentGame.value?.getPlayerScore(index) || 0
}

const getScoreDisplay = (category: Categories): string => {
  const score = currentGame.value?.getScoreByCategory(category)
  return score === null || score === undefined ? '-' : score.toString()
}

const selectCategory = (category: { value: Categories }) => {
  if (currentGame.value && !currentGame.value.isCategorySelected(category.value)) {
    const score = currentGame.value.calculateScore(category.value)
    if (score !== undefined) {
      currentGame.value.updateSelectedScore(category.value, score)
    }
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
  { name: 'Three of a Kind', value: Categories.ThreeOfAKind, icon: '3X' },
  { name: 'Four of a Kind', value: Categories.FourOfAKind, icon: '4X' },
  { name: 'Full House', value: Categories.FullHouse, icon: '🏠' },
  { name: 'Small Straight', value: Categories.SmallStraight, icon: 'Sm' },
  { name: 'Large Straight', value: Categories.LargeStraight, icon: 'Lg' },
  { name: 'Chance', value: Categories.Chance, icon: '?' }
]

const colorCategories = [
  { name: 'Yahtzee', value: Categories.Yahtzee, icon: 'Y!' },
  { name: 'Blue', value: Categories.Blues, icon: 'B' },
  { name: 'Red', value: Categories.Reds, icon: 'R' },
  { name: 'Green', value: Categories.Greens, icon: 'G' },
  { name: 'Color Full House', value: Categories.ColorFullHouse, icon: '🏠' },
  { name: 'Top Bonus', value: Categories.TopBonus, icon: 'B!' }
]
</script> 