<template>
  <div id="game-mode-container" class="flex flex-col items-center justify-center gap-8">
    <div class="flex flex-col w-full max-w-md">
      <button @click="startGame(GameMode.SinglePlayer, 1)" 
              class="game-mode-button bg-blue-600 hover:bg-blue-700 text-white py-4 px-8 rounded-lg transition-colors duration-200">
        Single Player
      </button>
      
      <button @click="toggleMultiplayerMenu" 
              class="game-mode-button bg-green-600 hover:bg-green-700 text-white py-4 px-8 rounded-lg transition-colors duration-200">
        Local Multi Player
      </button>

      <button @click="toggleOnlineMenu" 
              class="game-mode-button bg-purple-600 hover:bg-purple-700 text-white py-4 px-8 rounded-lg transition-colors duration-200">
        Online Multi Player
      </button>

      <div v-if="showMultiplayerMenu" class="flex flex-col gap-4 mt-4">
        <h3 class="text-lg font-bold">Select Players</h3>
        <button @click="startGame(GameMode.MultiPlayer, 2)" class="player-count-button">2 Players</button>
        <button @click="startGame(GameMode.MultiPlayer, 3)" class="player-count-button">3 Players</button>
        <button @click="startGame(GameMode.MultiPlayer, 4)" class="player-count-button">4 Players</button>
      </div>

      <div v-if="showOnlineMenu" class="flex flex-col gap-4 mt-4">
        <h3 class="text-lg font-bold">Online Game</h3>
        <div class="flex flex-col gap-2">
          <button @click="createRoom" 
                  class="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg transition-colors duration-200">
            Create Room
          </button>
          <div v-if="peerStore.roomCode" class="mt-2">
            <p class="text-sm font-bold">Room Code:</p>
            <p class="text-lg font-mono bg-gray-800 p-2 rounded">{{ peerStore.roomCode }}</p>
          </div>
        </div>
        <div class="flex flex-col gap-2">
          <div class="flex gap-2">
            <input v-model="roomCodeInput" 
                   type="text" 
                   placeholder="Enter room code"
                   class="flex-1 p-2 rounded-lg bg-gray-700 text-white">
            <button @click="joinRoom" 
                    class="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg transition-colors duration-200">
              Join
            </button>
          </div>
        </div>
        <div v-if="peerStore.isConnected" class="mt-4">
          <button @click="startOnlineGame" 
                  class="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors duration-200">
            Start Game
          </button>
        </div>
      </div>

      <div class="text-sm text-gray-500 mt-4 text-center">Programmed by John Zappone</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { GameMode } from '../enums/GameMode'
import { usePeerStore } from '../stores/peerStore'
import { useGameStore } from '../stores/gameStore'

const emit = defineEmits<{
  (e: 'start-game', mode: GameMode, players?: number): void
}>()

const showMultiplayerMenu = ref(false)
const showOnlineMenu = ref(false)
const roomCodeInput = ref('test')
const peerStore = usePeerStore()
const gameStore = useGameStore()

const toggleMultiplayerMenu = () => {
  showMultiplayerMenu.value = !showMultiplayerMenu.value
  showOnlineMenu.value = false
}

const toggleOnlineMenu = () => {
  showOnlineMenu.value = !showOnlineMenu.value
  showMultiplayerMenu.value = false
}

const createRoom = () => {
  peerStore.createRoom()
}

const joinRoom = () => {
  if (roomCodeInput.value) {
    peerStore.joinRoom(roomCodeInput.value)
  }
}

const startOnlineGame = () => {
  if (peerStore.isHost) {
    // Host starts the game
    gameStore.startOnlineGame();
    emit('start-game', GameMode.OnlineMultiPlayer, 2);
  } else {
    // Client waits for host to start
    emit('start-game', GameMode.OnlineMultiPlayer, 2);
  }
}

const startGame = (mode: GameMode, players?: number) => {
  emit('start-game', mode, players)
  showMultiplayerMenu.value = false
  showOnlineMenu.value = false
}

// Watch for connection status changes
watch(() => peerStore.isConnected, (isConnected) => {
  if (!isConnected) {
    showOnlineMenu.value = false
  }
})
</script>

<style scoped>
.game-mode-button {
  @apply w-full text-center;
}

.player-count-button {
  @apply bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors duration-200;
}
</style> 