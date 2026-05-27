<template>
  <div id="level-select-container" class="flex flex-col items-center gap-4 max-w-4xl mx-auto p-4">
    <div class="w-full flex items-center justify-between">
      <button @click="back" class="back-button">
        <i class="fas fa-arrow-left mr-2"></i>Back
      </button>
      <h2 class="text-xl md:text-2xl font-bold">Puzzle Adventure</h2>
      <div class="text-sm text-gray-400">
        <i class="fas fa-star text-yellow-400 mr-1"></i>{{ totalStars }} / {{ maxStars }}
      </div>
    </div>

    <div class="w-full flex flex-col gap-3">
      <section v-for="world in worlds" :key="world.id"
               class="world-section"
               :class="['world-' + world.id, { 'world-locked': !worldHasUnlocked(world.id) }]">
        <header class="world-header" @click="toggleWorld(world.id)">
          <div class="world-header-main">
            <div class="world-header-title">
              <i v-if="!worldHasUnlocked(world.id)" class="fas fa-lock"></i>
              <span>{{ world.name }}</span>
            </div>
            <div class="world-header-meta">
              <span class="world-progress">{{ worldClearedCount(world.id) }} / {{ worldLevelsForWorld(world.id).length }}</span>
              <span class="world-stars"><i class="fas fa-star"></i>{{ worldStars(world.id) }} / {{ worldLevelsForWorld(world.id).length * 3 }}</span>
              <i class="fas world-toggle-icon" :class="expandedWorlds[world.id] ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
            </div>
          </div>
          <div v-if="world.description" class="world-header-desc">{{ world.description }}</div>
        </header>

        <div v-show="expandedWorlds[world.id]" class="level-grid">
          <button v-for="level in worldLevelsForWorld(world.id)" :key="level.id"
                  :disabled="!isUnlocked(level.number)"
                  @click="pick(level.number)"
                  class="level-tile"
                  :class="{ locked: !isUnlocked(level.number), cleared: bestScore(level.id) != null }">
            <div class="level-tile-number">Level {{ level.number }}</div>
            <div class="level-tile-label">{{ level.label }}</div>
            <div class="level-tile-meta">
              <template v-if="isUnlocked(level.number)">
                <span class="level-tile-target">Target {{ level.targetScore }}</span>
                <span v-if="bestScore(level.id) != null" class="level-tile-best">
                  Best: {{ bestScore(level.id) }}
                </span>
                <div v-if="bestStars(level.id) > 0" class="level-tile-stars">
                  <i v-for="n in 3" :key="n" class="fas fa-star"
                     :class="{ filled: n <= bestStars(level.id) }"></i>
                </div>
              </template>
              <template v-else>
                <span class="level-tile-locked"><i class="fas fa-lock"></i>Locked</span>
              </template>
            </div>
            <div v-if="isUnlocked(level.number)" class="level-tile-mods">
              <span v-for="c in modifierCounts(level)" :key="c.kind"
                    class="level-tile-mod" :class="'modifier-' + c.kind"
                    :title="c.label">
                <i v-if="c.kind === 'iceBlock'" class="fas fa-snowflake"></i>
                <i v-else-if="c.kind === 'doubleCategory'" class="fas fa-clone"></i>
                <i v-else-if="c.kind === 'hotPotato'" class="fas fa-bomb"></i>
                <i v-else-if="c.kind === 'multiplierBubble'" class="fas fa-circle-dot"></i>
                <span v-else>×</span>
                <span v-if="c.count > 1" class="level-tile-mod-count">{{ c.count }}</span>
              </span>
            </div>
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'
import { useGameStore } from '../stores/gameStore'
import { LEVELS, WORLDS, getLevelsByWorld } from '../puzzle/levels/definitions'
import type { LevelDefinition } from '../puzzle/levels/types'

const gameStore = useGameStore()

const emit = defineEmits<{
  (e: 'start-level', n: number): void
  (e: 'back'): void
}>()

const worlds = WORLDS

// Default a world to expanded if it has any unlocked level. Player can
// toggle to override per-session.
const expandedWorlds = reactive<Record<string, boolean>>(
  Object.fromEntries(WORLDS.map(w => [w.id, worldHasUnlockedInitial(w.id)]))
)
function worldHasUnlockedInitial(worldId: string): boolean {
  return getLevelsByWorld(worldId).some(l => gameStore.isLevelUnlocked(l.number))
}
function toggleWorld(worldId: string) {
  expandedWorlds[worldId] = !expandedWorlds[worldId]
}

const isUnlocked = (n: number) => gameStore.isLevelUnlocked(n)
const bestScore = (id: string) => gameStore.getBestScoreForLevel(id)
const bestStars = (id: string) => gameStore.getBestStarsForLevel(id)

const worldLevelsForWorld = (worldId: string) => getLevelsByWorld(worldId)
const worldHasUnlocked = (worldId: string) =>
  worldLevelsForWorld(worldId).some(l => gameStore.isLevelUnlocked(l.number))
const worldClearedCount = (worldId: string) =>
  worldLevelsForWorld(worldId).filter(l => bestScore(l.id) != null).length
const worldStars = (worldId: string) =>
  worldLevelsForWorld(worldId).reduce((sum, l) => sum + bestStars(l.id), 0)

const totalStars = computed(() => LEVELS.reduce((sum, l) => sum + bestStars(l.id), 0))
const maxStars = computed(() => LEVELS.length * 3)

const pick = (n: number) => emit('start-level', n)
const back = () => emit('back')

type ModKind = 'iceBlock' | 'flyingMultiplier' | 'doubleCategory' | 'hotPotato' | 'multiplierBubble' | 'loopingMultiplier';
type ModSummary = { kind: ModKind; count: number; label: string };
const modifierCounts = (level: LevelDefinition): ModSummary[] => {
  const counts: Record<ModKind, number> = {
    iceBlock: 0, flyingMultiplier: 0, doubleCategory: 0,
    hotPotato: 0, multiplierBubble: 0, loopingMultiplier: 0,
  };
  for (const m of level.modifiers) counts[m.kind]++;
  return [
    { kind: 'iceBlock',          count: counts.iceBlock,          label: 'Ice Blocks' },
    { kind: 'flyingMultiplier',  count: counts.flyingMultiplier,  label: 'Flying Multipliers' },
    { kind: 'doubleCategory',    count: counts.doubleCategory,    label: 'Double Categories' },
    { kind: 'hotPotato',         count: counts.hotPotato,         label: 'Hot Potatoes' },
    { kind: 'multiplierBubble',  count: counts.multiplierBubble,  label: 'Multiplier Bubbles' },
    { kind: 'loopingMultiplier', count: counts.loopingMultiplier, label: 'Looping Multipliers' },
  ].filter(c => c.count > 0);
}
</script>

<style scoped>
.back-button {
  @apply bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors duration-200;
}

.world-section {
  border-radius: 0.75rem;
  border: 2px solid rgba(99, 102, 241, 0.3);
  background: linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(51, 65, 85, 0.5) 100%);
  overflow: hidden;
}
.world-section.world-locked {
  opacity: 0.65;
}
.world-beginnings    { border-color: rgba(56, 189, 248, 0.4); }
.world-frostlands    { border-color: rgba(125, 211, 252, 0.5); }
.world-echo-chamber  { border-color: rgba(168, 85, 247, 0.5); }
.world-storm-front   { border-color: rgba(220, 38, 38, 0.5); }
.world-storm-surge   { border-color: rgba(20, 184, 166, 0.5); }
.world-finale        { border-color: rgba(251, 191, 36, 0.5); }

.world-header {
  padding: 0.75rem 1rem;
  cursor: pointer;
  user-select: none;
  background: rgba(15, 23, 42, 0.4);
  transition: background 0.2s;
}
.world-header:hover {
  background: rgba(15, 23, 42, 0.6);
}
.world-header-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}
.world-header-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.15rem;
  font-weight: 700;
  color: #f3f4f6;
}
.world-header-meta {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  font-size: 0.85rem;
  color: #cbd5e1;
}
.world-stars {
  color: #fbbf24;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}
.world-toggle-icon {
  color: #94a3b8;
  margin-left: 0.25rem;
}
.world-header-desc {
  color: #cbd5e1;
  font-size: 0.85rem;
  margin-top: 0.25rem;
}

.level-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 0.6rem;
  padding: 0.75rem;
}
.level-tile {
  position: relative;
  background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
  border: 2px solid rgba(99, 102, 241, 0.4);
  border-radius: 0.6rem;
  padding: 0.65rem;
  text-align: left;
  color: #f3f4f6;
  cursor: pointer;
  transition: transform 0.15s, border-color 0.15s, box-shadow 0.15s;
  min-height: 130px;
  display: flex;
  flex-direction: column;
}
.level-tile:hover:not(:disabled) {
  transform: translateY(-2px);
  border-color: #818cf8;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}
.level-tile.locked {
  background: rgba(31, 41, 55, 0.6);
  border-color: rgba(75, 85, 99, 0.5);
  color: #9ca3af;
  cursor: not-allowed;
  opacity: 0.55;
}
.level-tile.cleared {
  border-color: #34d399;
}
.level-tile-number {
  font-size: 0.7rem;
  color: #a5b4fc;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.level-tile.locked .level-tile-number {
  color: #6b7280;
}
.level-tile-label {
  font-size: 1.05rem;
  font-weight: 700;
  margin-bottom: 0.3rem;
}
.level-tile-meta {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  font-size: 0.8rem;
  flex: 1;
}
.level-tile-target {
  color: #cbd5e1;
}
.level-tile-best {
  color: #fcd34d;
  font-weight: 600;
}
.level-tile-stars {
  display: flex;
  gap: 0.2rem;
  margin-top: 0.2rem;
  font-size: 0.85rem;
  color: rgba(251, 191, 36, 0.25);
}
.level-tile-stars .filled {
  color: #fbbf24;
  text-shadow: 0 0 4px rgba(251, 191, 36, 0.5);
}
.level-tile-locked {
  color: #6b7280;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}
.level-tile-mods {
  display: flex;
  gap: 0.3rem;
  margin-top: 0.4rem;
  flex-wrap: wrap;
}
.level-tile-mod {
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.12rem 0.35rem;
  border-radius: 9999px;
  color: #fff;
}
.level-tile-mod.modifier-iceBlock          { background: #38bdf8; }
.level-tile-mod.modifier-flyingMultiplier  { background: #f59e0b; color: #111; }
.level-tile-mod.modifier-doubleCategory    { background: #a855f7; }
.level-tile-mod.modifier-hotPotato         { background: #dc2626; }
.level-tile-mod.modifier-multiplierBubble  { background: #14b8a6; }
.level-tile-mod.modifier-loopingMultiplier { background: #ec4899; }
.level-tile-mod-count {
  font-size: 0.65rem;
  opacity: 0.9;
}
</style>
