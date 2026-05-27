<template>
  <div id="game-over-container">
    <div class="text-center">
      <div v-if="puzzleVsAiResult" class="puzzle-vs-ai-banner mb-4"
           :class="puzzleVsAiResult.isTie ? 'tie' : (puzzleVsAiResult.humanWon ? 'win' : 'lose')">
        <h2 class="text-2xl font-bold">
          <i :class="['fas', puzzleVsAiResult.isTie ? 'fa-handshake' : (puzzleVsAiResult.humanWon ? 'fa-trophy' : 'fa-robot')]"></i>
          {{ puzzleVsAiResult.headline }}
          <span class="text-sm font-normal block opacity-80">{{ puzzleVariantLabel }}</span>
        </h2>
        <div class="puzzle-vs-ai-scores">
          <div v-for="row in puzzleVsAiResult.rows" :key="row.index"
               class="puzzle-vs-ai-row" :class="{ winner: row.isWinner }">
            <i v-if="row.isAi" class="fas fa-robot text-orange-300"></i>
            <i v-else class="fas fa-user text-blue-300"></i>
            <span class="puzzle-vs-ai-name">{{ row.name }}</span>
            <span class="puzzle-vs-ai-score">{{ row.score }}</span>
          </div>
        </div>
      </div>
      <div v-else-if="puzzleResult" class="puzzle-result-banner mb-4" :class="puzzleResult.status">
        <h2 class="text-2xl font-bold">
          <i :class="['fas', puzzleResult.status === 'win' ? 'fa-trophy' : 'fa-circle-xmark']"></i>
          {{ puzzleResult.status === 'win' ? 'Puzzle Cleared!' : 'Puzzle Failed' }}
          <span class="text-sm font-normal block opacity-80">{{ puzzleVariantLabel }}</span>
        </h2>
        <div v-if="isAdventure && earnedStars > 0" class="puzzle-result-stars">
          <i v-for="n in 3" :key="n" class="fas fa-star"
             :class="{ filled: n <= earnedStars }"></i>
        </div>
        <div class="puzzle-result-rows mt-3">
          <div class="puzzle-result-row" :class="{ 'goal-met': puzzleResult.scoreMet }">
            <i :class="['fas', puzzleResult.scoreMet ? 'fa-check' : 'fa-xmark']"></i>
            <span>Score</span>
            <span class="puzzle-result-value">{{ puzzleResult.totalScore }} / {{ puzzleResult.targetScore }}</span>
          </div>
          <div v-if="puzzleResult.requiredEngagementCount > 0" class="puzzle-result-row" :class="{ 'goal-met': puzzleResult.engagementMet }">
            <i :class="['fas', puzzleResult.engagementMet ? 'fa-check' : 'fa-xmark']"></i>
            <span>Engagement</span>
            <span class="puzzle-result-value">{{ puzzleResult.engagedKinds.length }} / {{ puzzleResult.requiredEngagementCount }}</span>
            <span class="puzzle-result-kinds">
              <span v-for="kind in puzzleResult.presentKinds" :key="kind"
                    class="puzzle-result-kind" :class="['modifier-' + kind, { engaged: puzzleResult.engagedKinds.includes(kind) }]">
                <i v-if="kind === 'iceBlock'" class="fas fa-snowflake"></i>
                <i v-else-if="kind === 'doubleCategory'" class="fas fa-clone"></i>
                <i v-else-if="kind === 'hotPotato'" class="fas fa-bomb"></i>
                <i v-else-if="kind === 'multiplierBubble'" class="fas fa-circle-dot"></i>
                <span v-else>×</span>
              </span>
            </span>
          </div>
        </div>
      </div>
      <div v-else-if="winner && !puzzleVsAiResult" class="winner-banner mb-4">
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
      <div class="flex flex-col gap-2 max-w-md mx-auto">
        <button v-if="isAdventure && canAdvance"
                @click="nextLevel"
                class="game-mode-button w-full !bg-green-600 hover:!bg-green-700">
          <i class="fas fa-arrow-right mr-2"></i>Next Level
        </button>
        <button v-if="puzzleResult || puzzleVsAiResult"
                @click="retryPuzzle"
                class="game-mode-button w-full !bg-amber-500 hover:!bg-amber-600">
          <i class="fas fa-rotate-right mr-2"></i>Retry — {{ retryLabel }}
        </button>
        <button v-if="isAdventure" @click="backToLevels" class="game-mode-button w-full">
          <i class="fas fa-list mr-2"></i>Level Select
        </button>
        <button @click="playAgain" class="game-mode-button w-full">{{ (puzzleResult || puzzleVsAiResult) ? 'Main Menu' : 'Play Again' }}</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import { Categories } from '../enums/Categories'
import { useGameStore } from '../stores/gameStore'
import { getLastLevelNumber } from '../puzzle/levels/definitions'
import { computeStars } from '../puzzle/levels/progression'
import { GameVariant } from '../enums/GameVariant'

const gameStore = useGameStore()
const game = computed(() => gameStore.currentGame)

const emit = defineEmits<{
  (e: 'restart-game'): void
  (e: 'retry-puzzle'): void
  (e: 'next-level'): void
  (e: 'back-to-levels'): void
}>()

const playAgain = () => {
  emit('restart-game');
}

const retryPuzzle = () => {
  emit('retry-puzzle');
}

const nextLevel = () => {
  emit('next-level');
}

const backToLevels = () => {
  emit('back-to-levels');
}

// Vs-AI puzzle: 2+ players on the Puzzle variant. Suppress the solo
// target/engagement banner in favor of a winner banner.
const isPuzzleVsAi = computed(() => {
  const g = game.value
  if (!g || g.variant !== GameVariant.Puzzle) return false
  return g.players.length >= 2
})

const puzzleVsAiResult = computed(() => {
  if (!isPuzzleVsAi.value) return null
  const g = game.value!
  const rows = g.players.map((p, index) => ({
    index,
    name: p.name,
    score: p.getTotalScore(),
    isAi: p.controller.kind === 'ai',
    isWinner: false,
  }))
  const sorted = [...rows].sort((a, b) => b.score - a.score)
  const topScore = sorted[0].score
  const winners = sorted.filter(r => r.score === topScore)
  for (const w of winners) {
    rows.find(r => r.index === w.index)!.isWinner = true
  }
  const isTie = winners.length > 1
  const humanWon = !isTie && !winners[0].isAi
  const headline = isTie
    ? 'Tie Game'
    : (humanWon ? 'You Beat the Dice Master!' : 'The Dice Master Wins')
  return { rows, isTie, humanWon, headline }
})

const puzzleResult = computed(() => {
  if (isPuzzleVsAi.value) return null
  const g = game.value
  const pe = g?.getPuzzleEngine()
  if (!g || !pe) return null
  // Solo puzzle — single player's engine result.
  return pe.getResult(g.players[0]?.getTotalScore() ?? 0)
})

const retryLabel = computed(() => {
  if (isPuzzleVsAi.value) return 'Same Puzzle'
  if (isAdventure.value) return 'Same Level'
  return 'Same Puzzle'
})

const puzzleVariantLabel = computed(() => {
  const config = game.value?.puzzleConfig
  if (!config) return ''
  // Prefix Adventure levels with their number for orientation.
  if (gameStore.currentAdventureLevel != null) {
    return `Level ${gameStore.currentAdventureLevel} — ${config.label}`
  }
  return config.label
})

const isAdventure = computed(() => gameStore.currentAdventureLevel != null)

const canAdvance = computed(() => {
  if (!isAdventure.value) return false
  if (puzzleResult.value?.status !== 'win') return false
  const next = (gameStore.currentAdventureLevel ?? 0) + 1
  return next <= getLastLevelNumber() && gameStore.isLevelUnlocked(next)
})

// Persist Adventure progress when arriving at GameOver after a win.
// recordAdventureWin is idempotent on best-score (only writes if higher)
// and on highestUnlocked (only bumps if matching current ceiling), so
// running it here is safe even if the user retries the same level.
onMounted(() => {
  if (!isAdventure.value) return
  const result = puzzleResult.value
  if (result?.status !== 'win') return
  const levelId = game.value?.puzzleConfig?.id
  const levelNumber = gameStore.currentAdventureLevel
  if (levelId && levelNumber != null) {
    gameStore.recordAdventureWin(levelId, levelNumber, result.totalScore, result.targetScore)
  }
})

const earnedStars = computed(() => {
  const result = puzzleResult.value
  if (!isAdventure.value || result?.status !== 'win') return 0
  return computeStars(result.totalScore, result.targetScore)
})

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
.puzzle-result-banner {
  border-radius: 0.5rem;
  padding: 1rem;
  margin-bottom: 1rem;
  border-width: 2px;
  border-style: solid;
  text-align: center;
}
.puzzle-result-banner.win {
  background: linear-gradient(135deg, #064e3b 0%, #047857 100%);
  border-color: #34d399;
  color: #ecfdf5;
}
.puzzle-result-banner.lose {
  background: linear-gradient(135deg, #7f1d1d 0%, #b91c1c 100%);
  border-color: #fca5a5;
  color: #fef2f2;
}
.puzzle-vs-ai-banner {
  border-radius: 0.5rem;
  padding: 1rem;
  margin-bottom: 1rem;
  border-width: 2px;
  border-style: solid;
  text-align: center;
}
.puzzle-vs-ai-banner.win {
  background: linear-gradient(135deg, #064e3b 0%, #047857 100%);
  border-color: #34d399;
  color: #ecfdf5;
}
.puzzle-vs-ai-banner.lose {
  background: linear-gradient(135deg, #7f1d1d 0%, #b91c1c 100%);
  border-color: #fca5a5;
  color: #fef2f2;
}
.puzzle-vs-ai-banner.tie {
  background: linear-gradient(135deg, #1e3a8a 0%, #3730a3 100%);
  border-color: #a5b4fc;
  color: #eef2ff;
}
.puzzle-vs-ai-scores {
  display: inline-flex;
  flex-direction: column;
  gap: 0.4rem;
  align-items: stretch;
  margin-top: 0.75rem;
  min-width: 14rem;
}
.puzzle-vs-ai-row {
  display: grid;
  grid-template-columns: 1.4rem 1fr auto;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.75rem;
  border-radius: 0.4rem;
  background: rgba(0, 0, 0, 0.18);
  font-size: 1rem;
  opacity: 0.75;
}
.puzzle-vs-ai-row.winner {
  opacity: 1;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.12);
  outline: 1px solid rgba(255, 255, 255, 0.2);
}
.puzzle-vs-ai-name {
  text-align: left;
}
.puzzle-vs-ai-score {
  font-variant-numeric: tabular-nums;
  font-size: 1.1rem;
}

.puzzle-result-stars {
  display: flex;
  gap: 0.4rem;
  justify-content: center;
  margin: 0.5rem 0;
  font-size: 1.6rem;
  color: rgba(252, 211, 77, 0.25);
}
.puzzle-result-stars .filled {
  color: #fbbf24;
  text-shadow: 0 0 8px rgba(251, 191, 36, 0.5);
}
.puzzle-result-rows {
  display: inline-flex;
  flex-direction: column;
  gap: 0.25rem;
  align-items: stretch;
  font-size: 0.95rem;
}
.puzzle-result-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  opacity: 0.85;
}
.puzzle-result-row.goal-met {
  opacity: 1;
  font-weight: 700;
}
.puzzle-result-value {
  font-variant-numeric: tabular-nums;
}
.puzzle-result-kinds {
  display: inline-flex;
  gap: 0.25rem;
  margin-left: 0.5rem;
}
.puzzle-result-kind {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.4rem;
  height: 1.4rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: bold;
  color: #fff;
  opacity: 0.4;
  filter: grayscale(80%);
}
.puzzle-result-kind.engaged { opacity: 1; filter: none; }
.puzzle-result-kind.modifier-iceBlock          { background: #38bdf8; }
.puzzle-result-kind.modifier-flyingMultiplier  { background: #f59e0b; color: #111; }
.puzzle-result-kind.modifier-doubleCategory    { background: #a855f7; }
.puzzle-result-kind.modifier-hotPotato         { background: #dc2626; }
.puzzle-result-kind.modifier-multiplierBubble  { background: #14b8a6; }
.puzzle-result-kind.modifier-loopingMultiplier { background: #ec4899; }
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