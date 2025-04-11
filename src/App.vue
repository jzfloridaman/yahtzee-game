<template>
  <div class="min-h-screen bg-gray-900 text-white">
    <GameMode v-if="!gameStore.gameIsActive" @start-game="startGame" />
    <GameBoard v-else :game="gameStore.currentGame" @end-game="endGame" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import GameMode from './components/GameMode.vue'
import GameBoard from './components/GameBoard.vue'
import { useGameStore } from './stores/gameStore'
import { GameMode as GameModeEnum } from './enums/GameMode'

const gameStore = useGameStore()

const startGame = (mode: GameModeEnum) => {
  gameStore.initializeGame(mode)
}

const endGame = () => {
  gameStore.endGame()
}
</script> 