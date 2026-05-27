<template>
  <div id="game-container">
    <!-- "Waiting for opponent's turn" message moved inline into
         .bottom-stack so it doesn't cover the dice/roll panel. The
         second waiting-message (host hasn't started yet) stays as a
         full-screen overlay because no dice/roll panel is meaningful
         until the host taps Start. -->
    <div v-if="isOnlineGame && !gameStore.isGameActive" class="waiting-message">
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

    <header id="players-container" class="players-header">
      <div v-for="(_, index) in playerCount" :key="index"
           :class="['player-chip', { active: currentPlayer === index }]">
        <div class="player-avatar">
          <i v-if="isPlayerAI(index)" class="fas fa-robot"></i>
          <template v-else>{{ getPlayerName(index).charAt(0).toUpperCase() }}</template>
        </div>
        <div class="player-meta">
          <div class="player-name">{{ getPlayerName(index) }}</div>
          <div class="player-score">{{ getPlayerScore(index) }}</div>
        </div>
      </div>
    </header>

    <main class="game-main">
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
      <!-- Modifier help legend lives inside the goals panel so the whole
           puzzle context (target, engagement progress, mechanic key)
           stays in one container. -->
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
          <span class="puzzle-legend-text"><strong>Flying Multiplier</strong> — doubles the score in this slot. Moves at end of every turn.</span>
        </div>
        <div class="puzzle-legend-row">
          <span class="puzzle-legend-badge modifier-doubleCategory"><i class="fas fa-clone"></i></span>
          <span class="puzzle-legend-text"><strong>Double Category</strong> — score here and you get a bonus turn to score it again.</span>
        </div>
        <div class="puzzle-legend-row">
          <span class="puzzle-legend-badge modifier-hotPotato"><i class="fas fa-bomb"></i></span>
          <span class="puzzle-legend-text"><strong>Hot Potato</strong> — arms after your first non-zero score. Defuse before the fuse runs out.</span>
        </div>
        <div class="puzzle-legend-row">
          <span class="puzzle-legend-badge modifier-multiplierBubble"><i class="fas fa-circle-dot"></i></span>
          <span class="puzzle-legend-text"><strong>Multiplier Bubble</strong> — score here to scatter three ×2 chips to random cells.</span>
        </div>
        <div class="puzzle-legend-row">
          <span class="puzzle-legend-badge modifier-loopingMultiplier">×2</span>
          <span class="puzzle-legend-text"><strong>Looping Multiplier</strong> — value oscillates each turn. Wait for the high end.</span>
        </div>
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
             class="score-item grid-singles"
             :data-category="category.name"
             :data-modifier-kind="getCategoryModifier(category.value)?.kind || ''"
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
            class="score-item grid-multiples"
            :data-category="category.name"
            :data-modifier-kind="getCategoryModifier(category.value)?.kind || ''"
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
            class="score-item grid-colors"
            :data-category="category.name"
            :data-modifier-kind="getCategoryModifier(category.value)?.kind || ''"
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
    </main>

    <!-- Fixed bottom group: dice tray + action zone pinned to viewport
         bottom; horizontally centered to the 430px column on desktop.
         The AI-thinking banner slides in here when applicable so it
         sits ABOVE the dice rather than covering them. -->
    <footer class="bottom-stack">
      <div v-if="aiTurnInProgress" class="ai-thinking-banner">
        <i class="fas fa-robot text-orange-400"></i>
        <span>{{ getPlayerName(currentPlayer) }} is thinking</span>
        <span class="thinking-dots"><span>.</span><span>.</span><span>.</span></span>
      </div>

      <div v-else-if="isOnlineGame && !isHostTurn" class="ai-thinking-banner">
        <i class="fas fa-spinner fa-spin text-blue-300"></i>
        <span>{{ peerStore.isHost ? 'Waiting for Player 2…' : 'Waiting for Player 1…' }}</span>
      </div>

      <div id="dice-container">
        <div v-for="(die, index) in dice" :key="index"
             class="die"
             :class="[
               { held: die.held, roll: die.isRolling },
               die.color ? die.color : ''
             ]"
             :data-pips="die.value"
             @click="toggleHold(index)">
          <div class="die-cube">
            <div v-for="face in 6" :key="face" class="face" :data-face="face">
              <span v-for="n in 9" :key="n" class="pip" :data-slot="n"></span>
            </div>
          </div>
        </div>
      </div>
      <div class="action-zone">
        <div class="action-chip held-chip" :class="{ active: heldCount > 0 }">
          <i class="fas fa-thumbtack"></i>
          <span>{{ heldCount }}</span>
        </div>
        <button @click="rollDice" id="roll-button"
                :disabled="!canRoll || isRolling || aiTurnInProgress">
          <span class="roll-label">{{ newRoll ? 'START ROLL' : 'ROLL' }}</span>
        </button>
        <div class="rolls-left" :aria-label="`${rollsLeft} rolls remaining`">
          <span class="dot" :class="{ used: newRoll || rollsLeft < 3 }"></span>
          <span class="dot" :class="{ used: newRoll || rollsLeft < 2 }"></span>
          <span class="dot" :class="{ used: newRoll || rollsLeft < 1 }"></span>
        </div>
      </div>
    </footer>
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
import type { EngineEvent } from '../puzzle/types'
import { playModifierSfx } from '../utils/synthSfx'
import {
  showIceMelt,
  showFlyingRelocate,
  showHotPotatoArmed,
  showHotPotatoDefuse,
  showHotPotatoExpire,
  showBubblePop,
  showLoopingChange,
  showBonusTurnGlow,
  showScoreBreakdown,
  showGoalMet,
} from '../utils/cellAnimations'

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

const heldCount = computed(() => dice.value.filter(d => d.held).length)

// Used to render category icons (Ones..Sixes) in the scorecard — the
// dice themselves use CSS pips now, but the FontAwesome dice glyph still
// reads well at the small icon size in a scorecard cell.
const getDieIcon = (die: number): string => {
  switch (die) {
    case 1: return 'fa-dice-one'
    case 2: return 'fa-dice-two'
    case 3: return 'fa-dice-three'
    case 4: return 'fa-dice-four'
    case 5: return 'fa-dice-five'
    case 6: return 'fa-dice-six'
    default: return 'fa-dice'
  }
}

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

// ---- Puzzle event bus subscription ----
// Each PuzzleEngine emits lifecycle events (ice melt, flying relocate,
// hot potato fuse, etc.). Subscribe per active engine and route to
// cell-anchored animation helpers + synthesized SFX. SFX gated by the
// shared sfxEnabled toggle (same as the existing audio system).
const unsubscribers: Array<() => void> = []

function handleEngineEvent(event: EngineEvent) {
  const sfx = gameStore.sfxEnabled
  switch (event.type) {
    case 'iceBlock:melt':
      showIceMelt(event.category)
      if (sfx) playModifierSfx('iceMelt')
      break
    case 'flyingMultiplier:relocate':
      showFlyingRelocate(event.from, event.to, event.multiplier)
      if (sfx) playModifierSfx('flyingWhoosh')
      break
    case 'flyingMultiplier:applied':
    case 'loopingMultiplier:applied':
      showScoreBreakdown(event.category, event.raw, event.multiplier, event.final)
      break
    case 'hotPotato:armed':
      showHotPotatoArmed(event.category)
      if (sfx) playModifierSfx('bombArm')
      break
    case 'hotPotato:tick':
      if (sfx) playModifierSfx('bombTick')
      break
    case 'hotPotato:defuse':
      showHotPotatoDefuse(event.category)
      if (sfx) playModifierSfx('bombDefuse')
      break
    case 'hotPotato:expire':
      showHotPotatoExpire(event.category)
      if (sfx) playModifierSfx('bombExpire')
      break
    case 'multiplierBubble:pop':
      showBubblePop(event.from, event.targets)
      if (sfx) playModifierSfx('bubblePop')
      break
    case 'loopingMultiplier:change':
      showLoopingChange(event.category, event.atPeak)
      if (sfx) playModifierSfx(event.atPeak ? 'loopPeak' : 'loopChange')
      break
    case 'engine:bonusTurn':
      showBonusTurnGlow(event.category)
      if (sfx) playModifierSfx('bonusTurn')
      break
    case 'engine:goalMet':
      showGoalMet()
      if (sfx) playModifierSfx('goalChime')
      break
  }
}

function subscribeToEngines() {
  // Tear down any previous subscriptions (resubscribe on game restart).
  unsubscribers.forEach(u => u())
  unsubscribers.length = 0
  const game = currentGame.value
  if (!game || game.variant !== GameVariant.Puzzle) return
  for (let i = 0; i < game.players.length; i++) {
    const engine = game.getPuzzleEngine(i)
    if (engine) unsubscribers.push(engine.on(handleEngineEvent))
  }
}

onMounted(() => { subscribeToEngines() })
onUnmounted(() => { unsubscribers.forEach(u => u()); unsubscribers.length = 0 })
// Re-subscribe whenever the game instance changes (restart, new game).
watch(currentGame, () => { subscribeToEngines() })
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
  /* In-flow inside .bottom-stack so it sits above the dice tray. */
  width: 100%;
  padding: 0.4rem 0.75rem;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  font-weight: 600;
  font-size: 0.85rem;
  color: #fff;
  background: linear-gradient(135deg, rgba(251, 146, 60, 0.22), rgba(31, 41, 55, 0.6));
  border: 1px solid rgba(251, 146, 60, 0.4);
  pointer-events: none;
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