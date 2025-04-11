<template>
  <div id="game-mode-container" class="flex flex-col items-center justify-center gap-8">
    <h1 class="text-4xl font-bold text-center mb-8">Yahtzee</h1>
    
    <div class="flex flex-col gap-4 w-full max-w-md">
      <button @click="startGame(GameMode.SinglePlayer)" 
              class="game-mode-button bg-blue-600 hover:bg-blue-700 text-white py-4 px-8 rounded-lg transition-colors duration-200">
        Single Player
      </button>
      
      <button @click="startGame(GameMode.MultiPlayer)" 
              class="game-mode-button bg-green-600 hover:bg-green-700 text-white py-4 px-8 rounded-lg transition-colors duration-200">
        Multi Player
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { GameMode } from '../enums/GameMode'

const emit = defineEmits<{
  (e: 'start-game', mode: GameMode): void
}>()

const startGame = (mode: GameMode) => {
  emit('start-game', mode)
}
</script> 