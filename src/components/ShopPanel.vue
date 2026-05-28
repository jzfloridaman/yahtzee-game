<template>
  <section class="shop-panel">
    <header class="shop-header">
      <h3>Shop</h3>
      <div class="shop-balance"><i class="fas fa-coins"></i>{{ profile.coins }}</div>
    </header>
    <div v-if="lastError" class="shop-error">{{ lastError }}</div>
    <div class="shop-list">
      <div v-for="listing in listings" :key="listing.def.id" class="shop-tile">
        <div class="shop-tile-icon"><i :class="['fas', listing.def.icon]"></i></div>
        <div class="shop-tile-body">
          <div class="shop-tile-row">
            <span class="shop-tile-name">{{ listing.def.name }}</span>
            <span v-if="listing.owned > 0" class="shop-tile-owned">×{{ listing.owned }}</span>
          </div>
          <div class="shop-tile-desc">{{ listing.def.description }}</div>
        </div>
        <button class="shop-buy"
                :disabled="!listing.affordable || listing.atMax"
                @click="buy(listing.def.id)">
          <i class="fas fa-coins"></i>{{ listing.def.cost }}
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { usePlayerProfileStore } from '../stores/playerProfileStore'
import { shopListing, type ConsumableId } from '../profile/consumables'

const profileStore = usePlayerProfileStore()
const profile = computed(() => profileStore.profile)
const listings = computed(() => shopListing(profile.value))
const lastError = ref<string | null>(null)

function buy(id: ConsumableId) {
  const r = profileStore.buyConsumable(id)
  if (!r.ok) {
    lastError.value = r.reason === 'insufficient' ? 'Not enough coins.'
      : r.reason === 'maxStack'    ? 'Inventory full.'
      : 'Could not buy.'
    window.setTimeout(() => { lastError.value = null }, 2500)
  } else {
    lastError.value = null
  }
}
</script>

<style scoped>
.shop-panel { margin-top: 1rem; }
.shop-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 0.5rem;
}
.shop-header h3 {
  font-size: 0.85rem; font-weight: 700; letter-spacing: 0.05em;
  text-transform: uppercase; opacity: 0.7; margin: 0;
}
.shop-balance {
  display: inline-flex; align-items: center; gap: 0.3rem;
  font-weight: 700; color: #fcd34d;
}
.shop-error {
  background: rgba(220, 38, 38, 0.15);
  border: 1px solid rgba(220, 38, 38, 0.4);
  color: #fecaca;
  font-size: 0.75rem;
  padding: 0.3rem 0.5rem;
  border-radius: 0.4rem;
  margin-bottom: 0.4rem;
}
.shop-list {
  display: flex; flex-direction: column; gap: 0.5rem;
}
.shop-tile {
  display: flex; align-items: center; gap: 0.6rem;
  background: rgba(255,255,255,0.04);
  padding: 0.5rem 0.6rem;
  border-radius: 0.5rem;
}
.shop-tile-icon {
  width: 2rem; height: 2rem;
  display: flex; align-items: center; justify-content: center;
  background: rgba(52,211,153,0.15);
  border-radius: 0.5rem;
  color: #34d399;
}
.shop-tile-body { flex: 1; }
.shop-tile-row { display: flex; gap: 0.5rem; align-items: baseline; }
.shop-tile-name { font-weight: 700; font-size: 0.9rem; }
.shop-tile-owned {
  font-size: 0.65rem;
  background: rgba(167,243,208,0.15);
  color: #a7f3d0;
  padding: 0 0.4rem;
  border-radius: 9999px;
}
.shop-tile-desc { font-size: 0.7rem; opacity: 0.75; }
.shop-buy {
  background: linear-gradient(135deg, #f59e0b, #b45309);
  color: #fff;
  border: none;
  padding: 0.4rem 0.7rem;
  border-radius: 0.5rem;
  font-weight: 700;
  display: inline-flex; align-items: center; gap: 0.25rem;
  cursor: pointer;
  font-size: 0.8rem;
}
.shop-buy[disabled] { opacity: 0.4; cursor: not-allowed; }
</style>
