<template>
  <div id="game-over-container">
    <h1 class="text-3xl font-bold text-center">Game Over</h1>
    <div class="text-center">
      <p class="mb-4">You scored <span class="final-score">{{ game?.getTotalScore()|| '-'}}</span> points!</p>
      <div id="final-scorecard" class="w-full max-w-4xl mx-auto bg-gray-800 p-4 rounded-lg mb-4">
        <h2 class="text-2xl font-bold mb-4">Final Scorecard</h2>
        <div class="grid grid-cols-6 gap-2">
          <!-- singles -->
          <div v-for="(category, index) in singleCategories" :key="index" 
               class="score-item" :data-category="category.name">
            <div class="category-icon">
              <i :class="['fas', `fa-dice-${index + 1}`]"></i>
            </div>
            <div class="score-cell">
              {{ game?.getScoreByCategory(category.value) || '-' }}
            </div>
          </div>

          <div class="col-span-6 text-center">
            <span>
              Upper Score: 
              <span id="final-upper-score">{{ game?.getTotalTopScore() }}</span>/63
            </span>
          </div>

          <!-- multiples -->
          <div v-for="(category, index) in multipleCategories" :key="index" 
               class="score-item" :data-category="category.name">
            <div class="category-icon">{{ category.icon }}</div>
            <div class="score-cell">
              {{ game?.getScoreByCategory(category.value) || '-' }}
            </div>
          </div>

          <!-- colors -->
          <div v-for="(category, index) in colorCategories" :key="index" 
               class="score-item" :data-category="category.name">
            <div class="category-icon">{{ category.icon }}</div>
            <div class="score-cell">
              {{ game?.getScoreByCategory(category.value) || '-' }}
            </div>
          </div>
        </div>
      </div>
      <button @click="$emit('restart-game')" class="game-mode-button w-full">Play Again</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { YahtzeeGame } from '../game'
import { Categories } from '../enums/Categories'

import { useGameStore } from '../stores/gameStore'

const gameStore = useGameStore()
const game = computed(() => gameStore.currentGame)

const emit = defineEmits<{
  (e: 'restart-game'): void
}>()

const playAgain = () => {
  emit('restart-game');
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