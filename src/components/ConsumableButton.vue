<template>
  <button class="consumable-btn"
          :class="{ targeting }"
          :disabled="!enabled"
          :title="def.description"
          @click="$emit('use')">
    <i :class="['fas', def.icon]"></i>
    <span class="consumable-count">×{{ owned }}</span>
  </button>
</template>

<script setup lang="ts">
import type { ConsumableDef } from '../profile/consumables'

defineProps<{
  def: ConsumableDef
  owned: number
  enabled: boolean
  targeting?: boolean
}>()

defineEmits<{
  (e: 'use'): void
}>()
</script>

<style scoped>
.consumable-btn {
  position: relative;
  width: 2.4rem;
  height: 2.4rem;
  border-radius: 50%;
  border: 2px solid rgba(52,211,153,0.5);
  background: linear-gradient(135deg, #064e3b, #047857);
  color: #ecfdf5;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.9rem;
  cursor: pointer;
  padding: 0;
  box-shadow: 0 2px 6px rgba(0,0,0,0.45);
  transition: transform 0.12s ease, box-shadow 0.12s ease;
}
.consumable-btn:hover:not([disabled]) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.45), 0 0 0 3px rgba(52,211,153,0.25);
}
.consumable-btn[disabled] { opacity: 0.4; cursor: not-allowed; }
.consumable-btn.targeting {
  animation: targetingPulse 0.9s ease-in-out infinite;
  border-color: #facc15;
}
.consumable-count {
  position: absolute;
  bottom: -0.25rem;
  right: -0.25rem;
  font-size: 0.6rem;
  font-weight: 800;
  background: #facc15;
  color: #422006;
  padding: 0.05rem 0.3rem;
  border-radius: 9999px;
  border: 2px solid #064e3b;
}
@keyframes targetingPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(250,204,21,0.6); }
  50%      { box-shadow: 0 0 0 8px rgba(250,204,21,0); }
}
@media (prefers-reduced-motion: reduce) {
  .consumable-btn.targeting { animation: none; }
}
</style>
