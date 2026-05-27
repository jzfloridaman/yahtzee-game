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
        <h2 class="text-sm md:text-xl font-bold text-center mb-1 flex items-center justify-center gap-1">
          <i v-if="isPlayerAI(index)" class="fas fa-robot text-orange-400"></i>
          {{ getPlayerName(index) }}
        </h2>
        <span class="player-score font-bold text-center">{{ getPlayerScore(index) }}</span>
      </div>
    </div>

    <div v-if="aiTurnInProgress" class="ai-thinking-banner">
      <i class="fas fa-robot text-orange-400"></i>
      <span>{{ getPlayerName(currentPlayer) }} is thinking</span>
      <span class="thinking-dots"><span>.</span><span>.</span><span>.</span></span>
    </div>

    <div id="dice-container" class="flex justify-center gap-4 my-8">
      <div v-for="(die, index) in dice" :key="index"
           class="die"
           :class="[
             { 'opacity-90 held': die.held, 'roll': die.isRolling },
             die.color ? die.color : ''
           ]"
           @click="toggleHold(index)">
        <i :class="['fas', `${getDieIcon(die.value)}`, 'text-white']"></i>
      </div>
    </div>

    <button @click="rollDice" id="roll-button"
            :disabled="!canRoll || isRolling || aiTurnInProgress"
            class="w-full max-w-md mx-auto bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg transition-colors duration-200"
            v-html="rollDiceText">
    </button>

    <div v-if="puzzleGoals()" class="puzzle-goals">
      <div class="puzzle-goals-title">
        <i class="fas fa-bullseye"></i>
        <span>{{ puzzleGoals()!.label }}</span>
      </div>
      <div class="puzzle-goals-row">
        <span class="puzzle-goals-label">Score</span>
        <span class="puzzle-goals-value" :class="{ 'puzzle-goal-met': puzzleGoals()!.scoreMet }">
          {{ puzzleGoals()!.currentScore }} / {{ puzzleGoals()!.targetScore }}
        </span>
      </div>
      <div v-if="puzzleGoals()!.requiredEngagementCount > 0" class="puzzle-goals-row">
        <span class="puzzle-goals-label">Engaged</span>
        <span class="puzzle-goals-value" :class="{ 'puzzle-goal-met': puzzleGoals()!.engagementMet }">
          {{ puzzleGoals()!.engagedCount }} / {{ puzzleGoals()!.requiredEngagementCount }}
        </span>
        <span class="puzzle-goals-engaged">
          <span v-for="kind in puzzleGoals()!.presentKinds" :key="kind"
                class="puzzle-goals-kind" :class="['modifier-' + kind, { engaged: puzzleGoals()!.engagedKinds.includes(kind) }]"
                :title="kindLabel(kind)">
            <i v-if="kind === 'iceBlock'" class="fas fa-snowflake"></i>
            <i v-else-if="kind === 'doubleCategory'" class="fas fa-clone"></i>
            <i v-else-if="kind === 'hotPotato'" class="fas fa-bomb"></i>
            <i v-else-if="kind === 'multiplierBubble'" class="fas fa-circle-dot"></i>
            <span v-else>×</span>
          </span>
        </span>
      </div>
    </div>

    <div v-if="pendingBonusName()" class="puzzle-bonus-banner">
      <i class="fas fa-clone"></i>
      <span>Bonus turn — score <strong>{{ pendingBonusName() }}</strong> again to bank the double.</span>
    </div>

    <div id="scorecard">
      <div class="grid grid-cols-6 gap-2">

        <!-- singles -->
        <div v-for="(category, index) in singleCategories" :key="index"
             class="score-item grid-singles" :data-category="category.name"
             :class="{ 'selected': isCategorySelected(category.value) && !isPendingBonus(category.value), 'puzzle-locked': isCategoryLocked(category.value), 'puzzle-bonus-eligible': isPendingBonus(category.value) }"
             @click="handleSelectCategory(category.value)">
          <div class="category-icon">
            <i :class="['fas', `${getDieIcon(index + 1)}`]"></i>
          </div>
          <div class="score-cell">
            {{ getScoreDisplay(category.value) }}
          </div>
          <ModifierBadge v-if="getCategoryModifier(category.value)" :modifier="getCategoryModifier(category.value)!" />
        </div>

        <!-- upper bonus progress bar-->
        <div class="upper-score-progress-bar col-span-6 text-center flex items-center justify-center grid-singles" 
              :style="{ '--progress-width': totalTopScorePercent + '%' }">
          <span>
            Upper Score: 
            <span id="score-upper">{{ totalTopScore }}</span>/63
          </span>
        </div>

        <!-- multiples -->
        <div v-for="(category, index) in multipleCategories" :key="index"
            class="score-item grid-multiples" :data-category="category.name"
            :class="{ 'selected': isCategorySelected(category.value) && !isPendingBonus(category.value), 'puzzle-locked': isCategoryLocked(category.value), 'puzzle-bonus-eligible': isPendingBonus(category.value) }"
            @click="handleSelectCategory(category.value)">
          <div class="category-icon">
              <template v-if="category.icon">
                <i :class="['fas', `${category.icon}`]"></i>
              </template>
              <template v-else>
                {{ category.text }}
              </template>
          </div>
          <div class="score-cell">
            {{ getScoreDisplay(category.value) }}
          </div>
          <ModifierBadge v-if="getCategoryModifier(category.value)" :modifier="getCategoryModifier(category.value)!" />
        </div>

        <!-- colors -->
        <div v-for="(category, index) in colorCategories" :key="index"
            class="score-item grid-colors" :data-category="category.name"
            :class="[
              { 'selected': isCategorySelected(category.value) && !isPendingBonus(category.value), 'puzzle-locked': isCategoryLocked(category.value), 'puzzle-bonus-eligible': isPendingBonus(category.value) },
              category.color ? category.color : ''
            ]"
            @click="handleSelectCategory(category.value)">
          <div class="category-icon">
              <template v-if="category.icon">
                <i :class="['fas', `${category.icon}`]"></i>
              </template>
              <template v-else>
                {{ category.text }}
              </template>
          </div>
          <div class="score-cell">
            {{ getScoreDisplay(category.value) }}
          </div>
          <ModifierBadge v-if="getCategoryModifier(category.value)" :modifier="getCategoryModifier(category.value)!" />
        </div>

        <!-- upper bonus -->
        <div class="score-item grid-colors pointer-events-none"
             :class="{ 'no-upper-bonus': !playerUpperBonusAchieved, 'has-upper-bonus': playerUpperBonusAchieved }" >
          <div class="category-icon">
            <i class="fas fa-star"></i>
          </div>
          <div class="score-cell">
            {{ playerUpperBonusAchieved ? '35' : '-' }}
          </div>
        </div>

      </div>
    </div>

    <div v-if="isPuzzleVariant" class="puzzle-legend-wrap">
      <button type="button" class="puzzle-legend-toggle" @click="showLegend = !showLegend"
              :aria-expanded="showLegend" aria-controls="puzzle-legend-panel">
        <i class="fas fa-circle-question"></i>
        <span>{{ showLegend ? 'Hide modifier help' : 'Modifier help' }}</span>
        <i class="fas" :class="showLegend ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
      </button>
      <div v-show="showLegend" id="puzzle-legend-panel" class="puzzle-legend">
        <div class="puzzle-legend-row">
          <span class="puzzle-legend-badge modifier-iceBlock"><i class="fas fa-snowflake"></i></span>
          <span class="puzzle-legend-text"><strong>Ice Block</strong> — locked. Score &gt;0 in the slot directly above or below to melt it.</span>
        </div>
        <div class="puzzle-legend-row">
          <span class="puzzle-legend-badge modifier-flyingMultiplier">×2</span>
          <span class="puzzle-legend-text"><strong>Flying Multiplier</strong> — doubles the score in this slot. Moves to a new slot at the end of every turn.</span>
        </div>
        <div class="puzzle-legend-row">
          <span class="puzzle-legend-badge modifier-doubleCategory"><i class="fas fa-clone"></i></span>
          <span class="puzzle-legend-text"><strong>Double Category</strong> — score here and you get a bonus turn to score it again. Both scores are added.</span>
        </div>
        <div class="puzzle-legend-row">
          <span class="puzzle-legend-badge modifier-hotPotato"><i class="fas fa-bomb"></i></span>
          <span class="puzzle-legend-text"><strong>Hot Potato</strong> — arms after your first non-zero score. Defuse by scoring this cell before the fuse runs out, or it burns the slot at 0.</span>
        </div>
        <div class="puzzle-legend-row">
          <span class="puzzle-legend-badge modifier-multiplierBubble"><i class="fas fa-circle-dot"></i></span>
          <span class="puzzle-legend-text"><strong>Multiplier Bubble</strong> — score here to pop it and scatter three ×2 chips to random unscored cells.</span>
        </div>
        <div class="puzzle-legend-row">
          <span class="puzzle-legend-badge modifier-loopingMultiplier">×2</span>
          <span class="puzzle-legend-text"><strong>Looping Multiplier</strong> — value oscillates each turn between min and max. Wait for the high end before scoring.</span>
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
import { GameMode } from '../enums/GameMode'
import { GameVariant } from '../enums/GameVariant'
import { getScorecardTemplate } from '../config/scorecardTemplates'
import ModifierBadge from './ModifierBadge.vue'

const emit = defineEmits<{
  (e: 'end-game'): void
}>()

const gameStore = useGameStore()
const peerStore = usePeerStore()

// Local reactive states
const isRolling = ref(false);
const showLegend = ref(false);

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

const playerUpperBonusAchieved = computed(() => {
  return currentGame.value?.players[currentPlayer.value].scoreManager.isUpperSectionBonusAchieved() || false;
})

const rollsLeft = computed(() => {
  const rolls = currentGame.value?.rollsLeft || 0;
  return rolls;
});

const newRoll = computed(() => currentGame.value?.newRoll || false);
const canRoll = computed(() => currentGame.value && currentGame.value.rollsLeft > 0);
const totalTopScore = computed(() => currentGame.value?.getTotalTopScore() || 0);

const isPlayerAI = (index: number): boolean => {
  return currentGame.value?.players[index]?.controller.kind === 'ai'
}
const getPlayerName = (index: number): string => {
  return currentGame.value?.players[index]?.name || `Player ${index + 1}`
}
const aiTurnInProgress = computed(() => isPlayerAI(currentPlayer.value))

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

// Game actions — all branching (host / client / local) lives inside the
// current player's controller now; these handlers are thin dispatchers.
const rollDice = () => {
  isRolling.value = true;
  gameStore.rollDice();
  setTimeout(() => { isRolling.value = false; }, 1000);
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
  gameStore.toggleHold(index);
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
  gameStore.selectCategory(category);
}

const handleSelectCategory = (category: Categories) => {
  if (isCategoryLocked(category)) return;
  selectCategory(category);
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

const ALL_SINGLE_CATEGORIES = [
  { name: 'Ones', value: Categories.Ones },
  { name: 'Twos', value: Categories.Twos },
  { name: 'Threes', value: Categories.Threes },
  { name: 'Fours', value: Categories.Fours },
  { name: 'Fives', value: Categories.Fives },
  { name: 'Sixes', value: Categories.Sixes }
]

const ALL_MULTIPLE_CATEGORIES = [
  { name: 'Three of a Kind', value: Categories.ThreeOfAKind, text: '3X' },
  { name: 'Four of a Kind', value: Categories.FourOfAKind, text: '4X' },
  { name: 'Full House', value: Categories.FullHouse, icon: 'fas fa-home' },
  { name: 'Small Straight', value: Categories.SmallStraight, text: 'Sm' },
  { name: 'Large Straight', value: Categories.LargeStraight, text: 'Lg' },
  { name: 'Chance', value: Categories.Chance, text: '?' }
]

const ALL_COLOR_CATEGORIES = [
  { name: 'Yahtzee', value: Categories.Yahtzee, text: 'Y!', color: '' },
  { name: 'Blue', value: Categories.Blues, text: 'B', color: 'blue' },
  { name: 'Red', value: Categories.Reds, text: 'R', color: 'red' },
  { name: 'Green', value: Categories.Greens, text: 'G', color: 'green' },
  { name: 'Color Full House', value: Categories.ColorFullHouse, icon: 'fas fa-home', color: 'purple' },
]

const allowedCategories = computed(() => {
  const variant = currentGame.value?.variant ?? GameVariant.Rainbow
  return new Set(getScorecardTemplate(variant).map(entry => entry.category))
})

const singleCategories = computed(() => ALL_SINGLE_CATEGORIES.filter(c => allowedCategories.value.has(c.value)))
const multipleCategories = computed(() => ALL_MULTIPLE_CATEGORIES.filter(c => allowedCategories.value.has(c.value)))
const colorCategories = computed(() => ALL_COLOR_CATEGORIES.filter(c => allowedCategories.value.has(c.value)))

// Puzzle Mode helpers. PuzzleEngine state (modifiers, pending bonus) is
// mutated outside Vue's reactivity, so derived values must be re-read on
// every render — using computed() would cache the initial `null` forever.
// The scorecard mutations that happen alongside engine changes drive the
// re-renders.
const isPuzzleVariant = computed(() => currentGame.value?.variant === GameVariant.Puzzle)
const puzzleEngine = computed(() => currentGame.value?.getPuzzleEngine() ?? null)

const pendingBonusCategory = (): Categories | null => puzzleEngine.value?.getPendingBonusCategory() ?? null
const getCategoryModifier = (category: Categories) => puzzleEngine.value?.getModifierAt(category) ?? null
const isPendingBonus = (category: Categories): boolean => pendingBonusCategory() === category
const isCategoryLocked = (category: Categories): boolean => {
  const pe = puzzleEngine.value
  if (!pe) return false
  if (!pe.canScore(category)) return true
  // During a bonus turn only the bonus category is interactable.
  const pending = pendingBonusCategory()
  if (pending && pending !== category) return true
  return false
}

const CATEGORY_NAMES: Partial<Record<Categories, string>> = Object.fromEntries(
  [...ALL_SINGLE_CATEGORIES, ...ALL_MULTIPLE_CATEGORIES, ...ALL_COLOR_CATEGORIES].map(c => [c.value, c.name])
) as Partial<Record<Categories, string>>

const pendingBonusName = (): string | null => {
  const pending = pendingBonusCategory()
  if (!pending) return null
  return CATEGORY_NAMES[pending] ?? pending
}

// Live goals panel — re-reads engine state on each render (raw mutations
// aren't tracked by Vue reactivity; the scorecard write that fires along
// with every engine change drives the re-render).
type GoalsView = {
  label: string;
  currentScore: number;
  targetScore: number;
  scoreMet: boolean;
  requiredEngagementCount: number;
  engagedCount: number;
  presentKinds: string[];
  engagedKinds: string[];
  engagementMet: boolean;
}
const puzzleGoals = (): GoalsView | null => {
  const game = currentGame.value
  const pe = game?.getPuzzleEngine()
  const config = game?.puzzleConfig
  if (!pe || !config) return null
  const currentScore = game!.getTotalScore()
  const targetScore = pe.getTargetScore()
  const requiredEngagementCount = pe.getRequiredEngagementCount()
  const presentKinds = pe.getPresentKinds()
  const engagedKinds = pe.getEngagedKinds()
  return {
    label: config.label,
    currentScore,
    targetScore,
    scoreMet: currentScore >= targetScore,
    requiredEngagementCount,
    engagedCount: engagedKinds.length,
    presentKinds,
    engagedKinds,
    engagementMet: engagedKinds.length >= requiredEngagementCount,
  }
}

const kindLabel = (kind: string): string => {
  switch (kind) {
    case 'iceBlock': return 'Ice Block — clear by scoring an adjacent slot'
    case 'flyingMultiplier': return 'Flying Multiplier — score the boosted slot'
    case 'doubleCategory': return 'Double Category — complete the bonus turn'
    case 'hotPotato': return 'Hot Potato — defuse before the fuse expires'
    case 'multiplierBubble': return 'Multiplier Bubble — score to scatter chips'
    case 'loopingMultiplier': return 'Looping Multiplier — score while value is high'
    default: return kind
  }
}


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
}

.waiting-message .waiting-message-content{
position:fixed;
   bottom:0;
  opacity: 0.98;
  width:100%;

}

.ai-thinking-banner {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 30;
  background-color: rgba(31, 41, 55, 0.95);
  color: white;
  padding: 0.75rem 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-weight: 600;
  pointer-events: none;
  border-top: 2px solid rgba(251, 146, 60, 0.5);
}

.ai-thinking-banner .thinking-dots span {
  display: inline-block;
  animation: thinking-dot 1.4s infinite;
}
.ai-thinking-banner .thinking-dots span:nth-child(2) { animation-delay: 0.2s; }
.ai-thinking-banner .thinking-dots span:nth-child(3) { animation-delay: 0.4s; }

@keyframes thinking-dot {
  0%, 60%, 100% { opacity: 0.3; }
  30% { opacity: 1; }
}
</style> 