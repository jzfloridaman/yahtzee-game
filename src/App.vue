<template>
  <div>
    <!-- Connection Lost Message -->
    <div v-if="peerStore.connectionLost && !gameStore.gameIsOver" class="fixed inset-0 z-[5000] flex items-center justify-center bg-black bg-opacity-70">
      <div class="bg-red-700 text-white p-8 rounded-lg shadow-lg text-center max-w-xs mx-auto">
        <h2 class="text-2xl font-bold mb-2">Connection Lost</h2>
        <p class="mb-4">The connection to your opponent has been lost. Please try to reconnect or start a new game.</p>
        <button @click="handleNewGame" class="bg-white text-red-700 font-bold px-4 py-2 rounded hover:bg-gray-200 transition">New Game</button>
      </div>
    </div>
    <!-- Overlay & Menus-->
    <div class="overlay" :class="{ active: isAnyMenuOpen }" @click="closeAllMenus()"></div>
    <div class="fixed top-4 right-4 z-50 flex gap-2">

      <!-- Audio Settings Button -->
      <button @click="toggleAudioSettings" 
              class="bg-gray-800 p-3 rounded-lg shadow-lg hover:bg-gray-700 transition-colors duration-200">
        <i class="fas fa-volume-up text-white text-xl"></i>
      </button>
      <div v-show="gameStore.showAudioSettings" 
            class="bg-gray-800 p-4 rounded-lg shadow-lg mt-2 absolute right-0 top-12 w-96">
        <h3 class="text-lg font-bold mb-2">Audio Settings</h3>
        <div class="flex flex-col gap-2">
          <label class="flex items-center gap-2">
            <input type="checkbox" v-model="gameStore.bgmEnabled" 
                    @change="(e: Event) => gameStore.setBgmEnabled((e.target as HTMLInputElement).checked)"
                    class="w-4 h-4">
            <span>Background Music</span>
          </label>
          <label class="flex items-center gap-2">
            <input type="checkbox" v-model="gameStore.sfxEnabled" 
                    @change="(e: Event) => gameStore.setSfxEnabled((e.target as HTMLInputElement).checked)"
                    class="w-4 h-4">
            <span>Sound Effects</span>
          </label>
        </div>
      </div>

      <!-- History Button -->
      <button @click="toggleGameHistory" 
              class="bg-gray-800 p-3 rounded-lg shadow-lg hover:bg-gray-700 transition-colors duration-200">
        <i class="fas fa-history text-white text-xl"></i>
      </button>
      <div v-show="gameStore.showGameHistory" 
           class="bg-gray-800 p-4 rounded-lg shadow-lg mt-2 absolute right-0 top-12 w-96">
        <h3 class="text-lg font-bold mb-2">Recent Games</h3>
        <div class="flex flex-col gap-2 overflow-y-auto max-h-96">
          <div v-for="(game, index) in gameStore.gameHistory" :key="index" 
               class="p-3 bg-gray-700 rounded">
            <div class="text-sm mb-1">{{ new Date(game.date).toLocaleString() }}</div>
            <div class="text-sm mb-1">{{ game.mode === GameModeEnum.SinglePlayer ? 'Single Player' : 'Multi Player' }}</div>
            <div class="grid gap-1">
              <div v-for="playerScore in game.scores" :key="playerScore.playerNumber"
                   class="text-sm grid grid-cols-2 items-center bg-gray-600/50 p-1 rounded">
                <span>Player {{ playerScore.playerNumber }}</span>
                <span class="text-right font-bold">{{ playerScore.score }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>


      <!-- Chat Menu Button -->
      <button @click="toggleChatMenu" v-if="gameStore.isGameActive && peerStore.isConnected"
              class="bg-gray-800 p-3 relative rounded-lg shadow-lg hover:bg-gray-700 transition-colors duration-200">
        <i class="fas fa-comment-dots text-white text-xl"></i>
        <span v-if="unreadChatCount > 0" class="chat-counter-bubble">{{ unreadChatCount }}</span>
      </button>
      <div v-show="showChatMenu" 
            class="bg-gray-800 p-4 rounded-lg shadow-lg mt-2 absolute right-0 top-12 w-96">
        <h3 class="text-lg font-bold mb-2">Chat</h3>

        <div class="flex flex-wrap gap-2">
          <span v-for="emoji in chatEmojis" :key="emoji" class="text-2xl cursor-pointer select-none hover:scale-125 transition-transform" @click="sendEmojiAnimation(emoji)">{{ emoji }}</span>
        </div>

        <div class="flex gap-1 mb-2 mt-2">
          <input v-model="chatInput" @keyup.enter="sendChatMessage" class="flex-1 rounded p-1 bg-gray-700 text-white" placeholder="Type a message..." />
          <button @click="sendChatMessage" class="bg-blue-600 hover:bg-blue-700 text-white px-2 rounded">Send</button>
        </div>

        <div ref="chatHistoryEl" class="chat-history flex flex-col gap-1 mb-2 max-h-32 overflow-y-auto">
          <div v-for="(msg, idx) in chatHistory" :key="idx" class="text-sm">
            <span class="font-bold chat-history-sender">{{ msg.sender }}:</span> {{ msg.message }}
          </div>
        </div>


      </div>

      <!-- Game Options Button -->
      <button @click="toggleGameOptions" v-if="gameStore.isGameActive"
              class="bg-gray-800 p-3 rounded-lg shadow-lg hover:bg-gray-700 transition-colors duration-200">
        <i class="fas fa-bars text-white text-xl"></i>
      </button>
      <div v-show="gameStore.showGameOptions" 
            class="bg-gray-800 p-4 rounded-lg shadow-lg mt-2 absolute right-0 top-12 w-96">
        <h3 class="text-lg font-bold mb-2">Game Options</h3>
        <div class="flex flex-col gap-2">
          <button @click="endHostGame" 
                  v-if="peerStore.isHost"
                  class="bg-red-800 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition-colors duration-200">
            End Game
          </button>
          <button @click="restartGame" 
                  v-if="peerStore.isHost || !peerStore.isConnected"
                  class="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors duration-200">
            Restart Game
          </button>
          <button @click="newGame" 
                  v-if="peerStore.isHost || !peerStore.isConnected"
                  class="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors duration-200">
            Select Game
          </button>

          <button @click="requestResync"
                  v-if="!peerStore.isHost && peerStore.isConnected"
                  class="bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-4 rounded-lg transition-colors duration-200">
            Request Resync
          </button>
        </div>
      </div>

    </div>

    <GameMode v-if="!gameStore.gameIsActive" @start-game="startGame" />
    <GameBoard v-else-if="!gameStore.gameIsOver" @end-game="endGame" />
    <GameOver v-if="gameStore.gameIsOver" @restart-game="newGame" />

    <div class="hidden grid-cols-3 grid-cols-4">Tailwind forced classes</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import GameMode from './components/GameMode.vue'
import GameBoard from './components/GameBoard.vue'
import GameOver from './components/GameOver.vue'
import { useGameStore } from './stores/gameStore'
import { GameMode as GameModeEnum } from './enums/GameMode'
import { SoundEffects, SoundVolumes } from './enums/SoundEffects'
import { usePeerStore } from './stores/peerStore'
import { showEmojiAnimation } from './utils/animations'

const gameStore = useGameStore()
const peerStore = usePeerStore()

// Chat menu state and emojis
const showChatMenu = ref(false);
const chatMessage = ref('');
const chatEmojis = [
  '💩','😀', '😂', '😎', '😍', '😡', '😭', '👍', '👎', '🎲', '🔥', '👏', '🤔', '🥳', '😱', '😴', '💯', '🍀', '🍻', '🏆', '🤝' 
];

// Audio setup
const musicTracks = [
  '/music/bgsample.mp3',
  '/music/bgsample-2.mp3',
  '/music/bgsample-3.mp3'
]
let backgroundMusic: HTMLAudioElement | null = null

// Preload all SFX on mount for instant playback
const soundCache: { [key in SoundEffects]?: HTMLAudioElement } = {}

function preloadSoundEffects() {
  Object.values(SoundEffects).forEach((effect) => {
    const audio = new Audio(effect)
    audio.volume = SoundVolumes[effect as SoundEffects]
    audio.load() // Preload the audio
    soundCache[effect as SoundEffects] = audio
  })
}

const playSoundEffect = (effect: SoundEffects) => {
  if (!gameStore.sfxEnabled) return

  const cached = soundCache[effect]
  if (cached) {
    // Clone for overlapping playback
    const sound = cached.cloneNode() as HTMLAudioElement
    sound.volume = cached.volume
    sound.play().catch(error => {
      console.log("Error playing sound effect:", error)
    })
  }
}

// Expose the playSoundEffect function to the store
gameStore.playSoundEffect = playSoundEffect

const initializeBackgroundMusic = () => {
  if (!gameStore.bgmEnabled) return

  // Randomly select a track
  const randomTrack = musicTracks[Math.floor(Math.random() * musicTracks.length)]
  backgroundMusic = new Audio(randomTrack)
  backgroundMusic.loop = true
  backgroundMusic.volume = 0.4

  // Start playing on user interaction
  const startMusic = () => {
    if (backgroundMusic && backgroundMusic.paused && gameStore.bgmEnabled) {
      backgroundMusic.play().catch(error => {
        console.log("Error playing background music:", error)
      })
    }
  }
  document.addEventListener('click', startMusic, { once: true })
}

// Watch for changes in background music setting
watch(() => gameStore.bgmEnabled, (newValue) => {
  if (newValue) {
    if (!backgroundMusic) {
      initializeBackgroundMusic()
    } else {
      backgroundMusic.play().catch(console.error)
    }
  } else if (backgroundMusic) {
    backgroundMusic.pause()
  }
})

// Initialize music and preload SFX on component mount
onMounted(() => {
  preloadSoundEffects()
  initializeBackgroundMusic()
})

const startGame = (mode: GameModeEnum, players?: number) => {
  gameStore.initializeGame(mode, players);
}

const endGame = () => {
  gameStore.endGame();
}

const endHostGame = () => {

  peerStore.sendData({
    type: 'gameOver',
    data: {
      gameId: 'game over'
    }
  });

  /// wait some time then close all menus, end game, and disconnect
  setTimeout(() => {
    closeAllMenus();
    gameStore.endGame();
    peerStore.disconnect();
  }, 1000);

}

const restartGame = () => {
  closeAllMenus();
  gameStore.restartGame();
}

const newGame = () => {
  closeAllMenus();
  gameStore.newGame();
  peerStore.connectionLost = false;
}

const closeAllMenus = (menu?: string) => {
  if(menu !== 'audio'){
    gameStore.showAudioSettings = false;
  }
  if(menu !== 'history'){
    gameStore.showGameHistory = false;
  }
  if(menu !== 'options'){
    gameStore.showGameOptions = false;
  }
  if(menu !== 'chat'){
    showChatMenu.value = false;
  }
}

const toggleAudioSettings = () => {
  closeAllMenus('audio');
  gameStore.showAudioSettings = !gameStore.showAudioSettings;
}

const toggleGameHistory = () => {
  closeAllMenus('history');
  gameStore.showGameHistory = !gameStore.showGameHistory;
}

const toggleGameOptions = () => {
  closeAllMenus('options');
  gameStore.showGameOptions = !gameStore.showGameOptions;
}

const toggleChatMenu = () => {
  closeAllMenus('chat');
  showChatMenu.value = !showChatMenu.value;
}

const isAnyMenuOpen = computed(() => {
  return gameStore.showAudioSettings || gameStore.showGameHistory || gameStore.showGameOptions || showChatMenu.value;
});

const sendEmojiAnimation = (emoji: string) => {
  // send emoji to peer
  peerStore.sendData({
    type: 'emoji',
      emoji: emoji
  });
  showEmojiAnimation(emoji);
}

const chatHistory = ref<{ sender: string, message: string }[]>([]);
const chatHistoryEl = ref<HTMLElement | null>(null);
const chatInput = ref('');
const unreadChatCount = ref(0);

// Listen for chat messages from gameStore
const originalHandleIncomingData = gameStore.handleIncomingData
// Patch handleIncomingData to also handle chatMessage for chat history
// (If you want to do this more cleanly, use an event bus or Pinia action)
gameStore.handleIncomingData = function (data: any) {
  if (data.type === 'chatMessage') {
    chatHistory.value.push({
      sender: peerStore.isHost ? 'Client' : 'Host', // invert for local display
      message: data.message
    })
    if (!showChatMenu.value) {
      unreadChatCount.value++
    }
    nextTick(() => {
      if (chatHistoryEl.value) {
        chatHistoryEl.value.scrollTop = chatHistoryEl.value.scrollHeight;
      }
    });
  }
  return originalHandleIncomingData.call(this, data)
}

// Reset unread count when chat menu is opened
watch(showChatMenu, (open) => {
  if (open) unreadChatCount.value = 0
})

const sendChatMessage = () => {
  if (chatInput.value.trim()) {
    chatHistory.value.push({ sender: 'You', message: chatInput.value })
    peerStore.sendData({ type: 'chatMessage', message: chatInput.value })
    chatInput.value = ''
  }
  nextTick(() => {
    if (chatHistoryEl.value) {
      chatHistoryEl.value.scrollTop = chatHistoryEl.value.scrollHeight;
    }
  });
}

const requestResync = () => {
  peerStore.sendData({ type: 'resyncRequest' });
}

function handleNewGame() {
  newGame();
}

</script>

<style scoped>
.chat-history {
  background: #23272f;
  border-radius: 0.5rem;
  padding: 0.5rem;
}
.chat-counter-bubble {
  position: absolute;
  top: 0.2rem;
  right: 0.2rem;
  background: #ef4444;
  color: #fff;
  font-size: 0.75rem;
  font-weight: bold;
  border-radius: 9999px;
  padding: 0.1rem 0.5rem;
  min-width: 1.2rem;
  text-align: center;
  z-index: 10;
  box-shadow: 0 0 2px #0008;
  pointer-events: none;
}
</style> 