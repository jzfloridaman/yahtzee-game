<template>
  <div class="modifier-badge" :class="[badgeClass, { armed: isArmedPotato }]" :title="title">
    <i v-if="iconClass" :class="['fas', iconClass]"></i>
    <span v-if="label" class="modifier-label">{{ label }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PuzzleModifier } from '../puzzle/types'
import { Categories } from '../enums/Categories'
import { FlyingMultiplierModifier } from '../puzzle/modifiers/FlyingMultiplierModifier'
import { LoopingMultiplierModifier } from '../puzzle/modifiers/LoopingMultiplierModifier'
import { LoopingCategoryModifier } from '../puzzle/modifiers/LoopingCategoryModifier'
import { HotPotatoModifier } from '../puzzle/modifiers/HotPotatoModifier'

const SHORT_CAT: Partial<Record<Categories, string>> = {
  [Categories.Ones]: '1s',
  [Categories.Twos]: '2s',
  [Categories.Threes]: '3s',
  [Categories.Fours]: '4s',
  [Categories.Fives]: '5s',
  [Categories.Sixes]: '6s',
  [Categories.ThreeOfAKind]: '3K',
  [Categories.FourOfAKind]: '4K',
  [Categories.FullHouse]: 'FH',
  [Categories.SmallStraight]: 'SS',
  [Categories.LargeStraight]: 'LS',
  [Categories.Yahtzee]: 'Y',
  [Categories.Chance]: 'CH',
}

const props = defineProps<{ modifier: PuzzleModifier }>()

const badgeClass = computed(() => `modifier-${props.modifier.kind}`)

const iconClass = computed(() => {
  switch (props.modifier.kind) {
    case 'iceBlock': return 'fa-snowflake'
    case 'doubleCategory': return 'fa-clone'
    case 'hotPotato': return 'fa-bomb'
    case 'multiplierBubble': return 'fa-circle-dot'
    case 'loopingCategory': return 'fa-rotate-right'
    default: return null
  }
})

const isArmedPotato = computed(() =>
  props.modifier instanceof HotPotatoModifier && props.modifier.activated
)

const label = computed(() => {
  if (props.modifier instanceof FlyingMultiplierModifier) {
    return `×${props.modifier.multiplier}`
  }
  if (props.modifier instanceof LoopingMultiplierModifier) {
    return `×${props.modifier.value}`
  }
  if (props.modifier instanceof HotPotatoModifier && props.modifier.activated) {
    return String(props.modifier.fuseRemaining)
  }
  if (props.modifier instanceof LoopingCategoryModifier) {
    return SHORT_CAT[props.modifier.activeCategory] ?? ''
  }
  return ''
})

const title = computed(() => {
  switch (props.modifier.kind) {
    case 'iceBlock': return 'Ice block — score in an adjacent category to clear'
    case 'flyingMultiplier': return 'Flying multiplier — score here to multiply'
    case 'doubleCategory': return 'Double category — score here for a bonus turn'
    case 'hotPotato':
      return isArmedPotato.value
        ? `Hot Potato armed — defuse by scoring this cell within ${(props.modifier as HotPotatoModifier).fuseRemaining} turn(s)`
        : 'Hot Potato — arms once you score elsewhere'
    case 'multiplierBubble': return 'Multiplier Bubble — score here to scatter ×2 chips'
    case 'loopingMultiplier': return 'Looping Multiplier — value cycles each turn'
    case 'loopingCategory':
      return `Looping Category — scores as ${(props.modifier as LoopingCategoryModifier).activeCategory} this turn`
    default: return ''
  }
})
</script>

<style scoped>
.modifier-badge {
  position: absolute;
  top: 2px;
  left: 2px;
  min-width: 1.15rem;
  height: 1.15rem;
  padding: 0 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  font-size: 0.66rem;
  font-weight: 800;
  color: #fff;
  pointer-events: none;
  z-index: 5;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.45), 0 0 0 1.5px rgba(255,255,255,0.25) inset;
  animation: modifier-hover 2.4s ease-in-out infinite;
}
.modifier-badge i {
  font-size: 0.62rem;
}
.modifier-flyingMultiplier { animation-delay: 0.4s; }
.modifier-doubleCategory  { animation-delay: 0.8s; }

@keyframes modifier-hover {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-4px); }
}
@media (prefers-reduced-motion: reduce) {
  .modifier-badge { animation: none; }
}
.modifier-iceBlock           { background: linear-gradient(135deg, #7dd3fc, #0284c7); }
.modifier-flyingMultiplier   { background: linear-gradient(135deg, #fcd34d, #d97706); color: #111; }
.modifier-doubleCategory     { background: linear-gradient(135deg, #c084fc, #7e22ce); }
.modifier-hotPotato          { background: linear-gradient(135deg, #6b7280, #1f2937); color: #fef2f2; }
.modifier-hotPotato.armed    { background: linear-gradient(135deg, #f87171, #b91c1c); animation: hot-potato-pulse 0.9s ease-in-out infinite; }
.modifier-multiplierBubble   { background: linear-gradient(135deg, #5eead4, #0d9488); }
.modifier-loopingMultiplier  { background: linear-gradient(135deg, #f9a8d4, #be185d); color: #fff; }
.modifier-loopingCategory    { background: linear-gradient(135deg, #6ee7b7, #047857); color: #042f1d; }
.modifier-label {
  margin-left: 0.15rem;
  font-size: 0.7rem;
  font-weight: 700;
}
@keyframes hot-potato-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.6); }
  50%      { box-shadow: 0 0 0 4px rgba(220, 38, 38, 0); }
}
</style>
