<template>
  <div id="level-select-container" class="flex flex-col items-center gap-3 w-full p-3">
    <div class="ls-header">
      <button @click="back" class="back-button" aria-label="Back">
        <i class="fas fa-arrow-left"></i>
      </button>
      <h2 class="ls-title">Adventure</h2>
      <div class="ls-stars">
        <i class="fas fa-star"></i>{{ totalStars }} / {{ maxStars }}
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

type ModKind = 'iceBlock' | 'flyingMultiplier' | 'doubleCategory' | 'hotPotato' | 'multiplierBubble' | 'loopingMultiplier' | 'loopingCategory';
type ModSummary = { kind: ModKind; count: number; label: string };
const modifierCounts = (level: LevelDefinition): ModSummary[] => {
  const counts: Record<ModKind, number> = {
    iceBlock: 0, flyingMultiplier: 0, doubleCategory: 0,
    hotPotato: 0, multiplierBubble: 0, loopingMultiplier: 0, loopingCategory: 0,
  };
  for (const m of level.modifiers) counts[m.kind]++;
  return [
    { kind: 'iceBlock',          count: counts.iceBlock,          label: 'Ice Blocks' },
    { kind: 'flyingMultiplier',  count: counts.flyingMultiplier,  label: 'Flying Multipliers' },
    { kind: 'doubleCategory',    count: counts.doubleCategory,    label: 'Double Categories' },
    { kind: 'hotPotato',         count: counts.hotPotato,         label: 'Hot Potatoes' },
    { kind: 'multiplierBubble',  count: counts.multiplierBubble,  label: 'Multiplier Bubbles' },
    { kind: 'loopingMultiplier', count: counts.loopingMultiplier, label: 'Looping Multipliers' },
    { kind: 'loopingCategory',   count: counts.loopingCategory,   label: 'Looping Categories' },
  ].filter(c => c.count > 0);
}
</script>

<style scoped>
/* Header bar */
.ls-header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding-top: 0.25rem;
}
.ls-title {
  font-size: 1.4rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  flex: 1;
  text-align: center;
  text-shadow: 0 2px 8px rgba(0,0,0,0.4);
}
.ls-stars {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.4rem 0.6rem;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 999px;
  font-weight: 700;
  font-size: 0.78rem;
  color: #fde68a;
}
.ls-stars i { color: #fbbf24; }

.back-button {
  width: 38px;
  height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,0.06);
  color: var(--text, #fff);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.18s ease;
}
.back-button:hover { background: rgba(255,255,255,0.12); }

/* Per-world chapter cards. Each world has its own accent gradient. */
.world-section {
  position: relative;
  width: 100%;
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,0.12);
  background: linear-gradient(160deg, var(--w-from, #1e293b) 0%, var(--w-to, #0f172a) 100%);
  overflow: hidden;
  box-shadow: 0 6px 22px -8px rgba(0,0,0,0.55);
}
.world-section.world-locked { opacity: 0.6; }

/* World accent palettes — match the in-game body.world-<id> themes. */
.world-beginnings   { --w-from: #312e81; --w-to: #1e1b4b; --w-accent: #c4b5fd; }
.world-frostlands   { --w-from: #1e3a5f; --w-to: #0c1a2e; --w-accent: #67e8f9; }
.world-echo-chamber { --w-from: #0e7490; --w-to: #134e4a; --w-accent: #5eead4; }
.world-storm-front  { --w-from: #475569; --w-to: #1e293b; --w-accent: #facc15; }
.world-storm-surge  { --w-from: #7c2d12; --w-to: #450a0a; --w-accent: #fb923c; }
.world-finale       { --w-from: #3a1212; --w-to: #050505; --w-accent: #f43f5e; }
.world-cycles       { --w-from: #064e3b; --w-to: #115e59; --w-accent: #34d399; }

/* Accent bar on the left edge of each card. */
.world-section::before {
  content: '';
  position: absolute;
  top: 0; bottom: 0; left: 0;
  width: 4px;
  background: var(--w-accent);
  box-shadow: 0 0 12px var(--w-accent);
}

.world-header {
  padding: 0.7rem 0.9rem 0.7rem 1.1rem;
  cursor: pointer;
  user-select: none;
  transition: background 0.18s ease;
}
.world-header:hover { background: rgba(255,255,255,0.04); }
.world-header-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
}
.world-header-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.05rem;
  font-weight: 800;
  color: #fff;
}
.world-header-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.72rem;
  color: var(--text-soft, #cbd5e1);
}
.world-progress {
  padding: 0.18rem 0.5rem;
  border-radius: 999px;
  background: rgba(0,0,0,0.3);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.world-stars {
  color: #fde68a;
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  padding: 0.18rem 0.5rem;
  border-radius: 999px;
  background: rgba(0,0,0,0.3);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.world-stars i { color: #fbbf24; font-size: 0.7rem; }
.world-toggle-icon {
  color: var(--w-accent, #94a3b8);
  margin-left: 0.15rem;
}
.world-header-desc {
  color: var(--text-soft, #cbd5e1);
  font-size: 0.72rem;
  margin-top: 0.3rem;
  line-height: 1.35;
}

/* Level grid — 2 per row on the 430px column. */
.level-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
  padding: 0 0.7rem 0.8rem;
}
.level-tile {
  position: relative;
  background: rgba(15, 23, 42, 0.55);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 12px;
  padding: 0.55rem 0.6rem 0.45rem;
  text-align: left;
  color: #f3f4f6;
  cursor: pointer;
  transition: transform 0.12s ease, border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
  min-height: 110px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.level-tile:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: var(--w-accent);
  box-shadow: 0 4px 16px -4px rgba(0,0,0,0.5);
}
.level-tile:active:not(:disabled) { transform: scale(0.97); }
.level-tile.locked {
  background:
    repeating-linear-gradient(45deg, rgba(255,255,255,0.05) 0 4px, transparent 4px 8px),
    rgba(31, 41, 55, 0.5);
  border-color: rgba(255,255,255,0.06);
  color: #9ca3af;
  cursor: not-allowed;
  opacity: 0.55;
}
.level-tile.cleared {
  border-color: var(--w-accent);
  box-shadow: 0 0 0 1px var(--w-accent) inset;
}
.level-tile-number {
  font-size: 0.62rem;
  color: var(--w-accent);
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.level-tile.locked .level-tile-number { color: #6b7280; }
.level-tile-label {
  font-size: 0.95rem;
  font-weight: 800;
  margin: 0.05rem 0 0.35rem;
  line-height: 1.1;
}
.level-tile-meta {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  font-size: 0.72rem;
  flex: 1;
}
.level-tile-target { color: var(--text-soft, #cbd5e1); }
.level-tile-best { color: #fde68a; font-weight: 700; }
.level-tile-stars {
  display: flex;
  gap: 0.18rem;
  margin-top: 0.2rem;
  font-size: 0.72rem;
  color: rgba(251, 191, 36, 0.22);
}
.level-tile-stars .filled {
  color: #fbbf24;
  text-shadow: 0 0 5px rgba(251, 191, 36, 0.5);
}
.level-tile-locked {
  color: #6b7280;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.78rem;
}
.level-tile-mods {
  display: flex;
  gap: 0.2rem;
  margin-top: 0.3rem;
  flex-wrap: wrap;
}
.level-tile-mod {
  display: inline-flex;
  align-items: center;
  gap: 0.1rem;
  font-size: 0.6rem;
  font-weight: 800;
  padding: 0.1rem 0.3rem;
  border-radius: 999px;
  color: #fff;
  box-shadow: 0 0 0 1.5px rgba(255,255,255,0.18) inset;
}
.level-tile-mod.modifier-iceBlock          { background: linear-gradient(135deg, #7dd3fc, #0284c7); }
.level-tile-mod.modifier-flyingMultiplier  { background: linear-gradient(135deg, #fcd34d, #d97706); color: #111; }
.level-tile-mod.modifier-doubleCategory    { background: linear-gradient(135deg, #c084fc, #7e22ce); }
.level-tile-mod.modifier-hotPotato         { background: linear-gradient(135deg, #f87171, #b91c1c); }
.level-tile-mod.modifier-multiplierBubble  { background: linear-gradient(135deg, #5eead4, #0d9488); }
.level-tile-mod.modifier-loopingMultiplier { background: linear-gradient(135deg, #f9a8d4, #be185d); }
.level-tile-mod.modifier-loopingCategory   { background: linear-gradient(135deg, #6ee7b7, #047857); color: #042f1d; }
.level-tile-mod-count {
  font-size: 0.55rem;
  opacity: 0.9;
}
</style>
