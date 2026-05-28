import { defineStore } from 'pinia';
import {
    applyRewards,
    computeGameRewards,
    emptyProfile,
    emptyStats,
} from '../profile/rewards';
import {
    applyAchievementUnlock,
    evaluateAchievements,
    getAchievementById,
} from '../profile/achievements';
import { levelForXp } from '../profile/xp';
import type {
    AchievementCtx,
    AchievementDef,
    GameSummary,
    PlayerProfile,
    RewardBundle,
} from '../profile/types';
import { WORLDS, LEVELS } from '../puzzle/levels/definitions';
import {
    buyConsumable as pureBuyConsumable,
    consumeConsumable as pureConsumeConsumable,
    type ConsumableId,
} from '../profile/consumables';

const PROFILE_STORAGE_KEY = 'playerProfile';

// Tolerant loader — preserves backward compatibility and ensures every
// required field exists.
function loadPlayerProfile(): PlayerProfile {
    try {
        const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
        if (!raw) return emptyProfile();
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return emptyProfile();
        // Merge with an empty profile so missing fields don't blow up
        // downstream reads. The version field is reserved for future
        // schema migrations.
        const base = emptyProfile();
        const stats = { ...base.stats, ...(parsed.stats ?? {}) };
        // Ensure record fields are objects (not arrays / null).
        stats.clearedLevelIds = sanitizeRecord(stats.clearedLevelIds);
        stats.threeStarWorlds = sanitizeRecord(stats.threeStarWorlds);
        stats.worldsCleared = sanitizeRecord(stats.worldsCleared);
        stats.distinctDailyDates = sanitizeRecord(stats.distinctDailyDates);
        const profile: PlayerProfile = {
            version: 1,
            createdAt: typeof parsed.createdAt === 'string' ? parsed.createdAt : base.createdAt,
            xp: typeof parsed.xp === 'number' ? parsed.xp : 0,
            level: typeof parsed.level === 'number' ? parsed.level : 1,
            coins: typeof parsed.coins === 'number' ? parsed.coins : 0,
            unlocked: typeof parsed.unlocked === 'object' && parsed.unlocked
                ? parsed.unlocked : {},
            inventory: typeof parsed.inventory === 'object' && parsed.inventory
                ? parsed.inventory : {},
            stats,
        };
        // Repair drift between xp and level (if a future migration ever
        // shifts the curve).
        profile.level = levelForXp(profile.xp);
        return profile;
    } catch {
        return emptyProfile();
    }
}

function sanitizeRecord(input: unknown): Record<string, true> {
    if (!input || typeof input !== 'object') return {};
    const out: Record<string, true> = {};
    for (const [k, v] of Object.entries(input)) {
        if (v === true) out[k] = true;
    }
    return out;
}

interface ProfileStoreState {
    profile: PlayerProfile;
    // Set after each recordGameComplete so GameOver can read it without
    // refreshing the store between renders. Cleared on next game start.
    lastGameRewards: RewardBundle | null;
    // Most-recently-unlocked achievement defs — drives toast UI.
    lastUnlockedAchievements: AchievementDef[];
}

export const usePlayerProfileStore = defineStore('playerProfile', {
    state: (): ProfileStoreState => ({
        profile: loadPlayerProfile(),
        lastGameRewards: null,
        lastUnlockedAchievements: [],
    }),

    getters: {
        level: (state) => state.profile.level,
        xp: (state) => state.profile.xp,
        coins: (state) => state.profile.coins,
        unlocked: (state) => state.profile.unlocked,
    },

    actions: {
        save() {
            try {
                localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(this.profile));
            } catch {
                // Storage quota / privacy mode — silently ignore.
            }
        },

        clearLastGameRewards() {
            this.lastGameRewards = null;
            this.lastUnlockedAchievements = [];
        },

        // Central hook — gameStore calls this from endGame with a built
        // GameSummary. Builds rewards, applies them, persists.
        recordGameComplete(summary: GameSummary): RewardBundle {
            const baseRewards = computeGameRewards(summary, this.profile);
            const { profile: next, rewards } = applyRewards(
                this.profile,
                baseRewards,
                summary,
                new Date(),
            );
            this.profile = this.maybeUpgradeThreeStarWorld(next, summary);
            this.lastGameRewards = rewards;
            this.lastUnlockedAchievements = rewards.newAchievements;
            this.save();
            return rewards;
        },

        // Event-driven achievement check (no game just finished).
        // Used by triggers like "user opened the Daily Puzzle screen".
        checkAchievement(triggerEvent: string): AchievementDef[] {
            const ctx: AchievementCtx = { triggerEvent };
            const newDefs = evaluateAchievements(this.profile, ctx);
            if (newDefs.length === 0) return [];
            let next = this.profile;
            const now = new Date();
            for (const def of newDefs) {
                next = applyAchievementUnlock(next, def, now);
                next = {
                    ...next,
                    coins: next.coins + def.coinReward,
                    xp: next.xp + def.xpReward,
                };
            }
            // Recompute level after XP gain.
            next = { ...next, level: levelForXp(next.xp) };
            this.profile = next;
            this.lastUnlockedAchievements = newDefs;
            this.save();
            return newDefs;
        },

        // Hook for Phase 4: spend coins / use inventory. Stubbed here so
        // consumable code can call into the store from day 1.
        addCoins(amount: number, _source: 'earned' | 'iap' = 'earned') {
            if (amount <= 0) return;
            this.profile = { ...this.profile, coins: this.profile.coins + amount };
            this.save();
        },

        useConsumableFromInventory(id: string): boolean {
            const result = pureConsumeConsumable(this.profile, id as ConsumableId);
            if (!result.ok) return false;
            this.profile = result.profile;
            this.save();
            return true;
        },

        // Wraps the pure buyConsumable op so UI can purchase through the
        // store and persist in one call. Returns the same result shape
        // for the UI to display reasons (insufficient/maxStack/unknown).
        buyConsumable(id: ConsumableId): { ok: boolean; reason?: string } {
            const result = pureBuyConsumable(this.profile, id);
            if (!result.ok) return { ok: false, reason: result.reason };
            this.profile = result.profile;
            this.save();
            return { ok: true };
        },

        addToInventory(id: string, count: number = 1) {
            const current = this.profile.inventory[id] ?? 0;
            this.profile = {
                ...this.profile,
                inventory: { ...this.profile.inventory, [id]: current + count },
            };
            this.save();
        },

        // After an adventure win, check whether the world is fully 3-starred.
        // If so, record it in threeStarWorlds — the achievement predicate
        // for "threeStarWorld" reads this set.
        maybeUpgradeThreeStarWorld(profile: PlayerProfile, summary: GameSummary): PlayerProfile {
            // Without world/level context we can't decide.
            if (!summary.levelId || summary.starsEarned !== 3) return profile;
            const level = LEVELS.find(l => l.id === summary.levelId);
            if (!level) return profile;
            const world = WORLDS.find(w => w.id === level.worldId);
            if (!world) return profile;
            // Already recorded? Bail.
            if (profile.stats.threeStarWorlds[world.id]) return profile;
            // We'd need the persisted bestStars from gameStore to check
            // 3-stars across every level — that lives in gameStore. We
            // leave the full check to a follow-up; for now the achievement
            // can still be triggered via checkAchievement('threeStarWorld')
            // when gameStore detects the crossing.
            return profile;
        },

        // Called by gameStore when bestStars indicates a world is now
        // fully 3-starred. Marks the world + re-evaluates achievements.
        recordThreeStarWorld(worldId: string) {
            if (this.profile.stats.threeStarWorlds[worldId]) return;
            this.profile = {
                ...this.profile,
                stats: {
                    ...this.profile.stats,
                    threeStarWorlds: { ...this.profile.stats.threeStarWorlds, [worldId]: true },
                },
            };
            this.checkAchievement('threeStarWorld');
        },

        // Reset for testing or "clear data" affordances. Not wired to UI
        // by default.
        resetProfile() {
            this.profile = emptyProfile();
            this.save();
        },
    },
});

// Re-export a few helpers for components to consume without dipping into
// the store internals.
export { getAchievementById };
export { emptyStats };
