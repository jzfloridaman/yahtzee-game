<template>
  <div class="profile-panel">
    <header class="profile-header">
      <div class="profile-level-badge"><span class="lv-label">LV</span><span class="lv-num">{{ profile.level }}</span></div>
      <div class="profile-meta">
        <div class="profile-xp-row">
          <div class="profile-xp-bar" :title="`${progress.currentXp} / ${progress.xpForNextLevel} XP`">
            <div class="profile-xp-fill" :style="{ width: xpFillPct + '%' }"></div>
          </div>
          <div class="profile-xp-text">{{ progress.xpIntoLevel }} / {{ progress.xpForNextLevel - progress.xpForCurrentLevel }} XP</div>
        </div>
        <div class="profile-coins"><i class="fas fa-coins"></i>{{ profile.coins }} coins</div>
      </div>
    </header>

    <section class="profile-stats">
      <h3>Lifetime</h3>
      <div class="stat-grid">
        <div class="stat-tile">
          <div class="stat-num">{{ stats.gamesPlayed }}</div>
          <div class="stat-label">Games</div>
        </div>
        <div class="stat-tile">
          <div class="stat-num">{{ stats.puzzlesWon }}</div>
          <div class="stat-label">Puzzle wins</div>
        </div>
        <div class="stat-tile">
          <div class="stat-num">{{ stats.threeStarLevels }}</div>
          <div class="stat-label">3⭐ levels</div>
        </div>
        <div class="stat-tile">
          <div class="stat-num">{{ stats.yahtzeesScored }}</div>
          <div class="stat-label">Yahtzees</div>
        </div>
        <div class="stat-tile">
          <div class="stat-num">{{ stats.dailyPuzzlesWon }}</div>
          <div class="stat-label">Daily wins</div>
        </div>
        <div class="stat-tile">
          <div class="stat-num">{{ stats.longestDailyStreak }}</div>
          <div class="stat-label">Best streak</div>
        </div>
      </div>
    </section>

    <section class="profile-achievements">
      <h3>Achievements <span class="ach-counter">{{ unlockedCount }} / {{ visibleAchievements.length }}</span></h3>
      <div class="ach-grid">
        <div v-for="ach in visibleAchievements" :key="ach.id"
             class="ach-tile" :class="{ unlocked: isUnlocked(ach.id) }">
          <i :class="['fas', ach.icon, 'ach-icon']"></i>
          <div class="ach-body">
            <div class="ach-name">{{ ach.name }}</div>
            <div class="ach-desc">{{ isUnlocked(ach.id) ? ach.description : (ach.hint || ach.description) }}</div>
            <div v-if="!isUnlocked(ach.id)" class="ach-reward">
              <i class="fas fa-coins"></i>{{ ach.coinReward }} · <i class="fas fa-bolt"></i>{{ ach.xpReward }} XP
            </div>
          </div>
        </div>
      </div>
    </section>

    <ShopPanel />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { usePlayerProfileStore } from '../stores/playerProfileStore'
import { ACHIEVEMENTS } from '../profile/achievements'
import { xpToNextLevel } from '../profile/xp'
import ShopPanel from './ShopPanel.vue'

const profileStore = usePlayerProfileStore()
const profile = computed(() => profileStore.profile)
const stats = computed(() => profile.value.stats)
const progress = computed(() => xpToNextLevel(profile.value.xp))

const xpFillPct = computed(() => {
  const span = progress.value.xpForNextLevel - progress.value.xpForCurrentLevel
  if (span <= 0) return 100
  return Math.min(100, Math.round((progress.value.xpIntoLevel / span) * 100))
})

const isUnlocked = (id: string) => !!profile.value.unlocked[id]

// Hidden achievements stay invisible until unlocked.
const visibleAchievements = computed(() => ACHIEVEMENTS.filter(a => !a.hidden || isUnlocked(a.id)))
const unlockedCount = computed(() => visibleAchievements.value.filter(a => isUnlocked(a.id)).length)
</script>

<style scoped>
.profile-panel { display: flex; flex-direction: column; gap: 1rem; padding: 0.5rem 0; }
.profile-header { display: flex; align-items: center; gap: 0.75rem; }
.profile-level-badge {
  background: linear-gradient(135deg, var(--accent, #34d399), #047857);
  color: #042f1d;
  border-radius: 0.75rem;
  padding: 0.5rem 0.75rem;
  font-weight: 800;
  display: flex; flex-direction: column; align-items: center;
  min-width: 3rem;
  box-shadow: 0 0 0 1px rgba(255,255,255,0.18) inset;
}
.lv-label { font-size: 0.6rem; letter-spacing: 0.1em; opacity: 0.7; }
.lv-num   { font-size: 1.4rem; line-height: 1; }
.profile-meta { flex: 1; display: flex; flex-direction: column; gap: 0.35rem; }
.profile-xp-row { display: flex; flex-direction: column; gap: 0.25rem; }
.profile-xp-bar {
  height: 0.5rem;
  background: rgba(255,255,255,0.1);
  border-radius: 9999px;
  overflow: hidden;
}
.profile-xp-fill {
  height: 100%;
  background: linear-gradient(90deg, #34d399, #facc15);
  transition: width 0.4s ease;
}
.profile-xp-text { font-size: 0.7rem; opacity: 0.75; }
.profile-coins {
  display: inline-flex; align-items: center; gap: 0.35rem;
  font-weight: 700; color: #fbbf24;
}
.profile-stats h3, .profile-achievements h3 {
  font-size: 0.85rem; font-weight: 700; letter-spacing: 0.05em;
  opacity: 0.7; margin: 0 0 0.5rem; text-transform: uppercase;
  display: flex; justify-content: space-between; align-items: center;
}
.ach-counter { font-size: 0.7rem; opacity: 0.7; font-weight: 700; }
.stat-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
}
.stat-tile {
  background: rgba(255,255,255,0.05);
  border-radius: 0.5rem;
  padding: 0.5rem;
  text-align: center;
}
.stat-num { font-size: 1.15rem; font-weight: 800; }
.stat-label { font-size: 0.65rem; opacity: 0.7; }
.ach-grid {
  display: flex; flex-direction: column; gap: 0.4rem;
}
.ach-tile {
  display: flex; gap: 0.6rem; align-items: flex-start;
  background: rgba(255,255,255,0.04);
  padding: 0.5rem 0.6rem;
  border-radius: 0.5rem;
  opacity: 0.6;
}
.ach-tile.unlocked { opacity: 1; background: rgba(52,211,153,0.08); }
.ach-icon { font-size: 1.2rem; margin-top: 0.15rem; color: #94a3b8; }
.ach-tile.unlocked .ach-icon { color: #34d399; }
.ach-body { flex: 1; }
.ach-name { font-weight: 700; font-size: 0.9rem; }
.ach-desc { font-size: 0.75rem; opacity: 0.75; }
.ach-reward { font-size: 0.65rem; opacity: 0.6; margin-top: 0.15rem; }
.ach-reward i { margin-right: 0.15rem; }
</style>
