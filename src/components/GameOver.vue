<template>
  <div id="game-over-container">
    <div class="text-center">
      <div v-if="winner" class="winner-banner mb-4">
        <h2 class="text-2xl font-bold text-green-400">Winner: {{ winner.name }} ({{ winner.score }})</h2>
      </div>
      <div v-if="players.length > 1" class="player-tabs flex justify-center gap-2">
        <button v-for="(player, idx) in players" :key="idx"
                @click="selectedTab = idx"
                :class="['player-tab', { active: selectedTab === idx }]">
          {{ player.name }}
        </button>
      </div>
      <div id="final-scorecard" class="w-full max-w-4xl mx-auto bg-gray-800 p-4 rounded-lg mb-4">
        <h2 class="text-2xl font-bold mb-4">Final Scorecard</h2>
        <div v-if="players[selectedTab]" class="player-final-scorecard">
          <h3 class="text-lg font-bold mb-2 text-center">{{ players[selectedTab].name }} <span class="text-green-400">({{ players[selectedTab].score }})</span></h3>
          <div class="grid grid-cols-6 gap-2">
            <!-- singles -->
            <div v-for="(category, index) in singleCategories" :key="index" 
                 class="score-item" :data-category="category.name">
              <div class="category-icon">
                <i :class="['fas', `${getDieIcon(index + 1)}`, 'text-white']"></i>
              </div>
              <div class="score-cell text-white">
                {{ getScoreDisplay(players[selectedTab], category.value) }}
              </div>
            </div>
            <div class="col-span-6 text-center">
              <span>
                Upper Score: 
                <span>{{ getUpperScore(players[selectedTab]) }}</span>/63
              </span>
            </div>
            <!-- multiples -->
            <div v-for="(category, index) in multipleCategories" :key="index" 
                 class="score-item" :data-category="category.name">
              <div class="category-icon text-white">
                <template v-if="category.icon && category.icon.startsWith('fa-')">
                  <i :class="['fas', category.icon]"></i>
                </template>
                <template v-else>
                  {{ category.text || category.icon }}
                </template>
              </div>
              <div class="score-cell">
                {{ getScoreDisplay(players[selectedTab], category.value) }}
              </div>
            </div>
            <!-- colors -->
            <div v-for="(category, index) in colorCategories" :key="index" 
                 class="score-item" 
                 :class="{ [`${category.color}`]: true }"
                 :data-category="category.name">
              <div class="category-icon">
                <template v-if="category.icon && category.icon.startsWith('fa-')">
                  <i :class="['fas', category.icon]"></i>
                </template>
                <template v-else>
                  {{ category.text || category.icon }}
                </template>
              </div>
              <div class="score-cell">
                {{ getScoreDisplay(players[selectedTab], category.value) }}
              </div>
            </div>
            <div class="score-item">
              <div class="category-icon">
                <i class="fas fa-star"></i>
              </div>
              <div class="score-cell">
                {{ isUpperSectionBonusAchieved(players[selectedTab]) ? '35' : '-' }}
              </div>
            </div>
          </div>
        </div>
      </div>
      <button @click="playAgain" class="game-mode-button w-full">Play Again</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
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
  { name: 'Three of a Kind', value: Categories.ThreeOfAKind, text: '3X' },
  { name: 'Four of a Kind', value: Categories.FourOfAKind, text: '4X' },
  { name: 'Full House', value: Categories.FullHouse, icon: 'fa-home' },
  { name: 'Small Straight', value: Categories.SmallStraight, text: 'Sm', },
  { name: 'Large Straight', value: Categories.LargeStraight, text: 'Lg',  },
  { name: 'Chance', value: Categories.Chance, text: '?', icon: 'fa-question' }
]

const colorCategories = [
  { name: 'Yahtzee', value: Categories.Yahtzee, text: 'Y!' },
  { name: 'Blue', value: Categories.Blues, text: 'B', color: 'blue' },
  { name: 'Red', value: Categories.Reds, text: 'R', color: 'red' },
  { name: 'Green', value: Categories.Greens, text: 'G', color: 'green' },
  { name: 'Color Full House', value: Categories.ColorFullHouse, icon: 'fa-home', color: 'purple' },
]

const players = computed(() => {
  if (!game.value) return [];
  return game.value.players.map((player, idx) => ({
    name: player.name || `Player ${idx + 1}`,
    score: player.getTotalScore(),
    player
  }));
});

const winner = computed(() => {
  if (!players.value.length) return null;
  return players.value.reduce((max, p) => (p.score > max.score ? p : max), players.value[0]);
});

const selectedTab = ref(0);

// Default to winner's tab
watch(players, (newPlayers) => {
  if (!newPlayers.length) return;
  const winIdx = newPlayers.findIndex(p => p === winner.value);
  selectedTab.value = winIdx !== -1 ? winIdx : 0;
}, { immediate: true });

function getScoreDisplay(playerObj: any, category: Categories): string {
  const score = playerObj.player.getScoreByCategory(category);
  if (playerObj.player.isCategorySelected(category)) {
    if (score === 0) return 'X';
    return score?.toString() || '-';
  }
  return '-';
}

function getUpperScore(playerObj: any): number {
  const upperCats = [
    Categories.Ones,
    Categories.Twos,
    Categories.Threes,
    Categories.Fours,
    Categories.Fives,
    Categories.Sixes
  ];
  const scorecard = playerObj.player.getScorecard();
  return upperCats.reduce((sum, cat) => {
    const entry = scorecard[cat];
    if (entry.selected && entry.value !== null) {
      return sum + entry.value;
    }
    return sum;
  }, 0);
}

function isUpperSectionBonusAchieved(playerObj: any): boolean {
  const upperCats = [
    Categories.Ones,
    Categories.Twos,
    Categories.Threes,
    Categories.Fours,
    Categories.Fives,
    Categories.Sixes
  ];
  const scorecard = playerObj.player.getScorecard();
  const total = upperCats.reduce((sum, cat) => {
    const entry = scorecard[cat];
    if (entry.selected && entry.value !== null) {
      return sum + entry.value;
    }
    return sum;
  }, 0);
  return total >= 63;
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
</script>

<style scoped>
.winner-banner {
  background: #222;
  border-radius: 0.5rem;
  padding: 1rem;
  margin-bottom: 1rem;
}
.player-tabs {
  /* margin-bottom: 1rem; */
}
.player-tab {
  background: #23272f;
  color: #fff;
  border: none;
  border-radius: 0.5rem 0.5rem 0 0;
  padding: 0.5rem 1.5rem;
  font-weight: bold;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
  outline: none;
}
.player-tab.active {
  background: #4ade80;
  color: #222;
}
.score-item {
  background: #6f7a87;
  border-radius: 0.25rem;
  padding: 0.5rem;
  text-align: center;
}
.score-cell {
  font-weight: bold;
  font-size: 1.1rem;
  @apply text-white;
}
.category-icon {
  margin-bottom: 0.25rem;
}
</style> 