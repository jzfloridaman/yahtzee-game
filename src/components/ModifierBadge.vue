<template>
  <div class="modifier-badge" :class="[badgeClass, { armed: isArmedPotato }]" :title="title">
    <i v-if="iconClass" :class="['fas', iconClass]"></i>
    <span v-if="label" class="modifier-label">{{ label }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PuzzleModifier } from '../puzzle/types'
import { FlyingMultiplierModifier } from '../puzzle/modifiers/FlyingMultiplierModifier'
import { LoopingMultiplierModifier } from '../puzzle/modifiers/LoopingMultiplierModifier'
import { HotPotatoModifier } from '../puzzle/modifiers/HotPotatoModifier'

const props = defineProps<{ modifier: PuzzleModifier }>()

const badgeClass = computed(() => `modifier-${props.modifier.kind}`)

const iconClass = computed(() => {
  switch (props.modifier.kind) {
    case 'iceBlock': return 'fa-snowflake'
    case 'doubleCategory': return 'fa-clone'
    case 'hotPotato': return 'fa-bomb'
    case 'multiplierBubble': return 'fa-circle-dot'
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
    default: return ''
  }
})
</script>

<style scoped>
.modifier-badge {
  position: absolute;
  top: 2px;
  right: 2px;
  min-width: 1.4rem;
  height: 1.4rem;
  padding: 0 0.3rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: bold;
  color: #fff;
  pointer-events: none;
  z-index: 5;
  box-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
  animation: modifier-hover 2.4s ease-in-out infinite;
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
.modifier-iceBlock           { background: #38bdf8; }
.modifier-flyingMultiplier   { background: #f59e0b; color: #111; }
.modifier-doubleCategory     { background: #a855f7; }
.modifier-hotPotato          { background: #4b5563; color: #fef2f2; }
.modifier-hotPotato.armed    { background: #dc2626; animation: hot-potato-pulse 0.9s ease-in-out infinite; }
.modifier-multiplierBubble   { background: #14b8a6; }
.modifier-loopingMultiplier  { background: #ec4899; color: #fff; }
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
