<template>
  <div id="game-container">
    <div id="players-container" class="text-center grid grid-cols-4 gap-2">
      <div v-for="(_, index) in game.getPlayerCount()" :key="index" 
           :class="['player-data', { active: game.currentPlayer === index }]">
        <h2 class="text-sm md:text-xl font-bold text-center mb-1">Player {{ index + 1 }}</h2>
        <span class="player-score font-bold text-center">{{ game.getPlayerScore(index) }}</span>
      </div>
    </div>

    <div id="dice-container" class="flex justify-center gap-4 my-8">
      <div v-for="(die, index) in game.dice()" :key="index" 
           class="die w-16 h-16 bg-white rounded-lg shadow-lg flex items-center justify-center cursor-pointer"
           :class="{ 'opacity-50': die.held }"
           @click="game.toggleHold(index)">
        <i :class="['fas', `fa-dice-${die.value}`, 'text-4xl']"></i>
      </div>
    </div>

    <button @click="game.rollDice()" id="roll-button" 
            :disabled="game.rollsLeft <= 0"
            class="w-full max-w-md mx-auto bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg transition-colors duration-200">
      Roll Dice ({{ game.rollsLeft }})
    </button>

    <div id="scorecard" class="mt-8">
      <div class="grid grid-cols-6 gap-2">
        <!-- singles -->
        <div v-for="(category, index) in singleCategories" :key="index" 
             class="score-item" :data-category="category.name">
          <div class="category-icon">
            <i :class="['fas', `fa-dice-${index + 1}`]"></i>
          </div>
          <div class="score-cell" @click="selectCategory(category)">
            {{ game.getScoreByCategory(category) || '-' }}
          </div>
        </div>

        <div class="col-span-6 text-center">
          <span>
            Upper Score: 
            <span id="score-upper">{{ game.getTotalTopScore() }}</span>/63
          </span>
        </div>

        <!-- multiples -->
        <div v-for="(category, index) in multipleCategories" :key="index" 
             class="score-item" :data-category="category.name">
          <div class="category-icon">{{ category.icon }}</div>
          <div class="score-cell" @click="selectCategory(category)">
            {{ game.getScoreByCategory(category) || '-' }}
          </div>
        </div>

        <!-- colors -->
        <div v-for="(category, index) in colorCategories" :key="index" 
             class="score-item" :data-category="category.name">
          <div class="category-icon">{{ category.icon }}</div>
          <div class="score-cell" @click="selectCategory(category)">
            {{ game.getScoreByCategory(category) || '-' }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { YahtzeeGame } from '../game'
import { Categories } from '../enums/Categories'

const props = defineProps<{
  game: YahtzeeGame
}>()

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

const selectCategory = (category: { value: Categories }) => {
  if (!props.game.isCategorySelected(category.value)) {
    const score = props.game.calculateScore(category.value)
    props.game.updateSelectedScore(category.value, score)
  }
}
</script> 