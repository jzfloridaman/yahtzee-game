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
          <button v-if="!peerStore.isHost && !peerStore.isConnected" 
                  @click="createRoom" 
                  class="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg transition-colors duration-200">
            Create Room
          </button>
          <div v-if="peerStore.roomCode && peerStore.isHost" class="mt-2 flex flex-col items-center">
            <p class="text-sm font-bold">Room Code:</p>
            <div class="flex items-center gap-2">
              <p class="text-lg font-mono bg-gray-800 p-2 rounded select-all">{{ peerStore.roomCode }}</p>
              <button @click="copyRoomCode" class="ml-2 px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors duration-200 text-xs">
                Copy
              </button>
            </div>
            <transition name="fade">
              <span v-if="copied" class="text-green-400 text-xs mt-1">Copied!</span>
            </transition>
          </div>

          <div v-if="!peerStore.isHost && peerStore.isConnected" class="flex flex-col gap-2">
            <p class="text-sm">Waiting for host to start game...</p>
          </div>
        </div>
        <div v-if="!peerStore.isHost && !peerStore.isConnected" class="flex flex-col gap-2">
          <div class="flex gap-2">
            <input v-model="roomCodeInput" 
                   type="text" 
                   placeholder="Enter room code"
                   class="flex-1 p-2 rounded-lg bg-gray-700 text-white">
            <button @click="joinRoom" :disabled="isConnecting" class="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg transition-colors duration-200">
              {{ isConnecting ? 'Connecting...' : 'Join' }}
            </button>
          </div>
        </div>
        <div v-if="peerStore.isHost" class="mt-4">
          <button @click="stopHosting"
                  class="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition-colors duration-200">
            Stop Hosting
          </button>
        </div>
        <div v-if="peerStore.isConnected" class="mt-4">
          <button @click="startOnlineGame" 
                  class="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors duration-200">
            Start Game
          </button>
        </div>
      </div>

      <div class="text-sm text-gray-500 mt-4 text-center">Programmed by John Zappone</div>
      <div class="text-xs text-gray-400 mt-1 text-center">Version: {{ version }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { GameMode } from '../enums/GameMode'
import { usePeerStore, VERSION } from '../stores/peerStore'
import { useGameStore } from '../stores/gameStore'

const emit = defineEmits<{
  (e: 'start-game', mode: GameMode, players?: number): void
}>()

const showMultiplayerMenu = ref(false)
const showOnlineMenu = ref(false)
const roomCodeInput = ref('')
const peerStore = usePeerStore()
const gameStore = useGameStore()
const version = VERSION;
const copied = ref(false)
const isConnecting = ref(false)

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

const joinRoom = async () => {
  if (roomCodeInput.value && !isConnecting.value) {
    isConnecting.value = true
    try {
      await peerStore.joinRoom(roomCodeInput.value)
    } finally {
      // Wait for connection or error, then reset
      setTimeout(() => { isConnecting.value = false }, 2000)
    }
  }
}

const stopHosting = () => {
  peerStore.disconnect()
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

const copyRoomCode = async () => {
  if (peerStore.roomCode) {
    // Build the shareable URL with ?room=roomCode
    const url = new URL(window.location.href)
    url.searchParams.set('room', peerStore.roomCode)
    const shareUrl = url.toString()

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join my Yahtzee game!',
          text: 'Click to join my Yahtzee game:',
          url: shareUrl,
        })
        copied.value = true
        setTimeout(() => copied.value = false, 1500)
        return
      } catch (e) {
        // User cancelled or share failed, fallback to clipboard
        try {
          await navigator.clipboard.writeText(shareUrl)
          copied.value = true
          setTimeout(() => copied.value = false, 1500)
        } catch (e) {
          copied.value = false
          alert('Failed to copy!')
        }
        return
      }
    }
    // Fallback for browsers without Web Share API
    try {
      await navigator.clipboard.writeText(shareUrl)
      copied.value = true
      setTimeout(() => copied.value = false, 1500)
    } catch (e) {
      copied.value = false
      alert('Failed to copy!')
    }
  }
}

// Watch for connection status changes
watch(() => peerStore.isConnected, (isConnected) => {
  if (!isConnected) {
    showOnlineMenu.value = false
    isConnecting.value = false
  } else {
    isConnecting.value = false
  }
})

onMounted(() => {
  const params = new URLSearchParams(window.location.search)
  const code = params.get('room')
  if (code) {
    roomCodeInput.value = code
    showOnlineMenu.value = true // Optionally open the online menu automatically
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

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style> 