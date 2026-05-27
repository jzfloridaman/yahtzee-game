<template>
  <div id="game-mode-container" class="flex flex-col items-center justify-center gap-8">
    <div class="flex flex-col w-full max-w-md">
      <button @click="toggleSinglePlayerMenu"
              class="game-mode-button bg-blue-600 hover:bg-blue-700 text-white py-4 px-8 rounded-lg transition-colors duration-200">
        Single Player
      </button>

      <div v-if="showSinglePlayerMenu" class="flex flex-col gap-2 mt-2 mb-2 pl-4">
        <button @click="startSinglePlayer(GameVariant.Rainbow)"
                class="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition-colors duration-200">
          Classic Rainbow
        </button>
        <button @click="startSinglePlayer(GameVariant.Puzzle)"
                class="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-lg transition-colors duration-200">
          <i class="fas fa-shuffle mr-2"></i>Puzzle — Random
        </button>
        <button @click="openAdventure"
                class="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg transition-colors duration-200">
          <i class="fas fa-map mr-2"></i>Puzzle — Adventure
        </button>
      </div>

      <button @click="toggleMultiplayerMenu"
              class="game-mode-button bg-green-600 hover:bg-green-700 text-white py-4 px-8 rounded-lg transition-colors duration-200">
        Local Multi Player
      </button>

      <button @click="toggleOnlineMenu"
              class="game-mode-button bg-purple-600 hover:bg-purple-700 text-white py-4 px-8 rounded-lg transition-colors duration-200">
        Online Multi Player
      </button>

      <div v-if="showMultiplayerMenu" class="flex flex-col gap-4 mt-4">
        <h3 class="text-lg font-bold">Local Multi Player</h3>

        <div class="flex gap-2">
          <button v-for="n in [2, 3, 4]" :key="n"
                  @click="setPlayerCount(n)"
                  :class="['player-count-button flex-1', { 'ring-2 ring-blue-400': playerCount === n }]">
            {{ n }} Players
          </button>
        </div>

        <div class="flex flex-col gap-2">
          <div v-for="(seat, index) in seats" :key="index"
               class="flex items-center gap-2 bg-gray-800 rounded-lg p-2">
            <span class="flex-1 text-sm">{{ seat.name }}</span>
            <button @click="toggleSeatKind(index)"
                    :class="['px-3 py-1 rounded transition-colors duration-200',
                             seat.kind === 'ai'
                               ? 'bg-orange-600 hover:bg-orange-700 text-white'
                               : 'bg-blue-600 hover:bg-blue-700 text-white']">
              <i :class="['fas', seat.kind === 'ai' ? 'fa-robot' : 'fa-user']" class="mr-1"></i>
              {{ seat.kind === 'ai' ? 'Computer' : 'Human' }}
            </button>
          </div>
        </div>

        <button @click="startLocalMultiplayer"
                class="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors duration-200">
          Start Game
        </button>
      </div>

      <div v-if="showOnlineMenu" class="flex flex-col gap-4 mt-4">
        <h3 class="text-lg font-bold">Online Game</h3>
        <div class="flex flex-col gap-2">
          <button v-if="!peerStore.isHost && !peerStore.isConnected" 
                  @click="createRoom" 
                  class="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg transition-colors duration-200">
            Create Room
          </button>

          <div v-if="peerStore.roomCode && peerStore.isHost" class="flex flex-col ">
            <p class="text-sm font-bold">Room Code</p>
            <div class="flex gap-2">
              <p class="text-lg font-mono bg-gray-800 p-2 rounded select-all flex-1">{{ peerStore.roomCode }}</p>
              <button @click="copyRoomCode" class=" bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors duration-200 px-2">
                <i class="fa-solid fa-share"></i> Share 
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
import { GameVariant } from '../enums/GameVariant'
import { usePeerStore, VERSION } from '../stores/peerStore'
import { useGameStore } from '../stores/gameStore'
import type { SeatSpec, ControllerKind } from '../controllers'

const emit = defineEmits<{
  (e: 'start-game', mode: GameMode, players?: number, seats?: SeatSpec[], variant?: GameVariant): void
}>()

const showSinglePlayerMenu = ref(false)
const showMultiplayerMenu = ref(false)
const showOnlineMenu = ref(false)
const roomCodeInput = ref('')
const peerStore = usePeerStore()
const gameStore = useGameStore()
const version = VERSION;
const copied = ref(false)
const isConnecting = ref(false)

// Local Multi Player seat config — each seat is human by default; user can
// flip individual slots to AI before starting.
const playerCount = ref(2)
const seats = ref<SeatSpec[]>(defaultSeats(2))

function defaultSeats(n: number): SeatSpec[] {
  return Array.from({ length: n }, (_, i) => ({
    name: `Player ${i + 1}`,
    kind: 'local' as ControllerKind,
  }))
}

const setPlayerCount = (n: number) => {
  playerCount.value = n
  // Preserve existing kind/name choices when shrinking or growing.
  if (seats.value.length < n) {
    while (seats.value.length < n) {
      seats.value.push({ name: `Player ${seats.value.length + 1}`, kind: 'local' })
    }
  } else if (seats.value.length > n) {
    seats.value = seats.value.slice(0, n)
  }
}

const toggleSeatKind = (index: number) => {
  const s = seats.value[index]
  if (!s) return
  if (s.kind === 'local') {
    s.kind = 'ai'
    s.name = `Computer ${index + 1}`
  } else {
    s.kind = 'local'
    s.name = `Player ${index + 1}`
  }
}

const startLocalMultiplayer = () => {
  emit('start-game', GameMode.MultiPlayer, undefined, seats.value.slice())
  showMultiplayerMenu.value = false
}

const toggleSinglePlayerMenu = () => {
  showSinglePlayerMenu.value = !showSinglePlayerMenu.value
  showMultiplayerMenu.value = false
  showOnlineMenu.value = false
}

const toggleMultiplayerMenu = () => {
  showMultiplayerMenu.value = !showMultiplayerMenu.value
  showSinglePlayerMenu.value = false
  showOnlineMenu.value = false
}

const toggleOnlineMenu = () => {
  showOnlineMenu.value = !showOnlineMenu.value
  showSinglePlayerMenu.value = false
  showMultiplayerMenu.value = false
}

const startSinglePlayer = (variant: GameVariant) => {
  emit('start-game', GameMode.SinglePlayer, 1, undefined, variant)
  showSinglePlayerMenu.value = false
}

const openAdventure = () => {
  showSinglePlayerMenu.value = false
  gameStore.openAdventureMenu()
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
      //alert('Failed to copy!')
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

  window.addEventListener('rejoin-session', (e: any) => {
    if (e.detail && e.detail.hostRoomId) {
      roomCodeInput.value = e.detail.hostRoomId;
      usePeerStore().joinRoom(e.detail.hostRoomId);

      // Watch for connection, then send resyncRequest
      const stop = watch(
        () => peerStore.isConnected,
        (connected) => {
          if (connected) {
            emit('start-game', GameMode.OnlineMultiPlayer, 2);
            peerStore.sendData({ type: 'resyncRequest' });
            stop(); // Stop watching after first trigger
          }
        }
      );
      console.log('Rejoining session', e.detail.hostRoomId);
    }
  })
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