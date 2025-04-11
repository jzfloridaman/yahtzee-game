<template>
  <div id="game-mode-container">
    <div class="text-center">
      <button @click="startSinglePlayer" class="game-mode-button w-full !mt-2">Single Player</button>
      <button @click="showMultiplayerOptions" class="game-mode-button w-full">Multi Player</button>
      <div v-if="showPlayerCount" id="player-count-selection" class="mt-4">
        <h2 class="text-xl font-bold mb-4">Select Number of Players</h2>
        <div class="grid grid-cols-3 gap-4">
          <button v-for="count in [2,3,4]" :key="count" @click="startMultiplayerGame(count)" class="player-count-button">
            {{ count }} Players
          </button>
        </div>
      </div>
      <p class="text-sm text-gray-500 mt-4">Programmed by John Zappone</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits(['start-game'])
const showPlayerCount = ref(false)

const startSinglePlayer = () => {
  emit('start-game', 'sp', 1)
}

const showMultiplayerOptions = () => {
  showPlayerCount.value = true
}

const startMultiplayerGame = (count: number) => {
  emit('start-game', 'mp', count)
}
</script> 