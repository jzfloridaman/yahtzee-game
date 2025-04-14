<template>
  <div id="game-mode-container" class="flex flex-col items-center justify-center gap-8">

    <div class="flex flex-col gap-4 w-full max-w-md">
      <button @click="startGame(GameMode.SinglePlayer, 1)" 
              class="game-mode-button bg-blue-600 hover:bg-blue-700 text-white py-4 px-8 rounded-lg transition-colors duration-200">
        Single Player
      </button>
      
      <button @click="toggleMultiplayerMenu" 
              class="game-mode-button bg-green-600 hover:bg-green-700 text-white py-4 px-8 rounded-lg transition-colors duration-200">
        Multi Player
      </button>

      <div v-if="showMultiplayerMenu" class="flex flex-col gap-4 mt-4">
        <h3 class="text-lg font-bold">Select Number of Players</h3>
        <button @click="startGame(GameMode.MultiPlayer, 2)" class="player-count-button">2 Players</button>
        <button @click="startGame(GameMode.MultiPlayer, 3)" class="player-count-button">3 Players</button>
        <button @click="startGame(GameMode.MultiPlayer, 4)" class="player-count-button">4 Players</button>
      </div>

      <p class="text-sm text-gray-500 mt-4">Programmed by John Zappone</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { GameMode } from '../enums/GameMode'

const emit = defineEmits<{
  (e: 'start-game', mode: GameMode, players?: number): void
}>()

const showMultiplayerMenu = ref(false);

const toggleMultiplayerMenu = () => {
  showMultiplayerMenu.value = !showMultiplayerMenu.value;
}

const startGame = (mode: GameMode, players?: number) => {
  emit('start-game', mode, players)
  showMultiplayerMenu.value = false;
}
</script> 