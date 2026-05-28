<template>
  <transition name="ach-toast">
    <div v-if="visible" class="ach-toast" role="status" aria-live="polite">
      <i :class="['fas', current?.icon || 'fa-trophy', 'ach-toast-icon']"></i>
      <div class="ach-toast-body">
        <div class="ach-toast-label">Achievement unlocked</div>
        <div class="ach-toast-name">{{ current?.name }}</div>
        <div class="ach-toast-rewards">
          <span><i class="fas fa-coins"></i>+{{ current?.coinReward }}</span>
          <span><i class="fas fa-bolt"></i>+{{ current?.xpReward }} XP</span>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { usePlayerProfileStore } from '../stores/playerProfileStore'
import type { AchievementDef } from '../profile/types'

const profileStore = usePlayerProfileStore()
const { lastUnlockedAchievements } = storeToRefs(profileStore)

const queue = ref<AchievementDef[]>([])
const current = ref<AchievementDef | null>(null)
const visible = ref(false)

watch(lastUnlockedAchievements, (defs) => {
  if (!defs || defs.length === 0) return
  queue.value.push(...defs)
  if (!visible.value) showNext()
})

function showNext() {
  const next = queue.value.shift()
  if (!next) {
    current.value = null
    return
  }
  current.value = next
  visible.value = true
  // Stay visible for ~3.5s, then transition out + show next.
  window.setTimeout(() => {
    visible.value = false
    window.setTimeout(showNext, 400)
  }, 3500)
}
</script>

<style scoped>
.ach-toast {
  position: fixed;
  top: 4rem;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #064e3b 0%, #047857 100%);
  color: #ecfdf5;
  border: 2px solid #34d399;
  border-radius: 0.75rem;
  padding: 0.6rem 0.8rem;
  display: flex; align-items: center; gap: 0.75rem;
  max-width: 22rem;
  z-index: 950;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45), 0 0 0 4px rgba(52, 211, 153, 0.12);
}
.ach-toast-icon {
  font-size: 1.8rem;
  color: #fbbf24;
  width: 2rem;
  text-align: center;
}
.ach-toast-body { flex: 1; }
.ach-toast-label {
  font-size: 0.65rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  opacity: 0.8;
}
.ach-toast-name { font-size: 1rem; font-weight: 800; }
.ach-toast-rewards {
  font-size: 0.7rem;
  display: flex; gap: 0.6rem;
  margin-top: 0.15rem;
  opacity: 0.85;
}
.ach-toast-rewards i { margin-right: 0.2rem; }
.ach-toast-enter-active, .ach-toast-leave-active {
  transition: transform 0.35s ease, opacity 0.35s ease;
}
.ach-toast-enter-from, .ach-toast-leave-to {
  opacity: 0;
  transform: translate(-50%, -20px);
}
@media (prefers-reduced-motion: reduce) {
  .ach-toast-enter-active, .ach-toast-leave-active {
    transition: opacity 0.15s linear;
  }
  .ach-toast-enter-from, .ach-toast-leave-to {
    transform: translateX(-50%);
  }
}
</style>
