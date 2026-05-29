<template>
  <!-- Mounted/unmounted together by the store (turnBanner ref). Both the
       dim backdrop and the banner run a single one-shot CSS keyframe whose
       duration must match BANNER_TOTAL_MS in gameStore.ts. -->
  <div v-if="banner" class="turn-banner-root" aria-hidden="false">
    <div class="turn-banner-backdrop"></div>
    <div class="turn-banner" role="status" aria-live="polite">
      <i class="fas fa-play turn-banner-icon"></i>
      <span class="turn-banner-text">{{ banner.text }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useGameStore } from '../stores/gameStore'

const gameStore = useGameStore()
const { turnBanner: banner } = storeToRefs(gameStore)
</script>

<style scoped>
.turn-banner-root {
  position: fixed;
  inset: 0;
  z-index: 958;
  pointer-events: none;
}

/* Dim + blur the whole board so the banner pops instead of blending in. */
.turn-banner-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(2, 6, 23, 0.62);
  backdrop-filter: blur(3px);
  -webkit-backdrop-filter: blur(3px);
  animation: turnBannerBackdrop 2s ease forwards;
}

.turn-banner {
  position: absolute;
  top: 50%;
  left: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.7rem;
  padding: 0.95rem 1.6rem;
  border-radius: 999px;
  white-space: nowrap;
  background: linear-gradient(100deg, var(--accent, #c026d3) 0%, var(--accent-soft, #e879f9) 100%);
  color: #fff;
  font-weight: 900;
  letter-spacing: 0.01em;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
  box-shadow:
    0 10px 40px -6px rgba(0, 0, 0, 0.6),
    0 0 0 2px rgba(255, 255, 255, 0.18) inset,
    0 0 36px -2px var(--accent-soft, rgba(232, 121, 249, 0.7));
  animation: turnBannerSweep 2s cubic-bezier(0.16, 0.84, 0.3, 1) forwards;
}
.turn-banner-icon {
  font-size: 1.15rem;
  opacity: 0.95;
}
.turn-banner-text {
  font-size: 1.55rem;
}

/* Slide in from the left, pause at dead center, exit to the right. The long
   center plateau (18%→78%) is the readable beat the user asked for. */
@keyframes turnBannerSweep {
  0%   { transform: translate(calc(-50% - 78vw), -50%) scale(0.92); opacity: 0; }
  18%  { transform: translate(-50%, -50%) scale(1); opacity: 1; }
  78%  { transform: translate(-50%, -50%) scale(1); opacity: 1; }
  100% { transform: translate(calc(-50% + 78vw), -50%) scale(0.92); opacity: 0; }
}
@keyframes turnBannerBackdrop {
  0%   { opacity: 0; }
  14%  { opacity: 1; }
  80%  { opacity: 1; }
  100% { opacity: 0; }
}

/* Reduced motion: no horizontal travel — fade/scale gently at center. */
@media (prefers-reduced-motion: reduce) {
  .turn-banner {
    animation: turnBannerFadeRM 2s ease forwards;
  }
  @keyframes turnBannerFadeRM {
    0%   { transform: translate(-50%, -50%) scale(0.98); opacity: 0; }
    14%  { transform: translate(-50%, -50%) scale(1); opacity: 1; }
    82%  { transform: translate(-50%, -50%) scale(1); opacity: 1; }
    100% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
  }
  .turn-banner-backdrop {
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }
}
</style>
