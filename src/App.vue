<template>
  <div>
    <!-- Rejoin Online Session Modal -->
    <div v-if="showRejoinModal" class="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-70">
      <div class="bg-red-700 p-8 rounded-lg shadow-lg text-center max-w-xs mx-auto">
        <h2 class="text-2xl font-bold mb-2">Rejoin Game?</h2>
        <p class="mb-4">Would you like to rejoin your previous online game session?</p>
        <div class="flex justify-center gap-4">
          <button @click="handleRejoinYes" class="bg-green-600 text-white px-4 py-2 rounded">Yes</button>
          <button @click="handleRejoinNo" class="bg-red-600 text-white px-4 py-2 rounded">No</button>
        </div>
      </div>
    </div>
    <!-- Connection Lost Message -->
    <div v-if="peerStore.connectionLost && !gameStore.gameIsOver" class="fixed inset-0 z-[5000] flex items-center justify-center bg-black bg-opacity-70">
      <div class="bg-red-700 text-white p-8 rounded-lg shadow-lg text-center max-w-xs mx-auto">
        <h2 class="text-2xl font-bold mb-2">Connection Lost</h2>
        <p class="mb-4">The connection to your opponent has been lost. Please try to reconnect or start a new game.</p>
        <button @click="handleNewGame" class="bg-white text-red-700 font-bold px-4 py-2 rounded hover:bg-gray-200 transition">New Game</button>
      </div>
    </div>
    <!-- Hamburger trigger -->
    <button class="hamburger-btn" @click="toggleSheet"
            :aria-expanded="showSheet" aria-label="Open menu">
      <i class="fas fa-bars"></i>
      <span v-if="unreadChatCount > 0 && peerStore.isConnected" class="chat-counter-bubble">{{ unreadChatCount }}</span>
    </button>

    <!-- Bottom-sheet drawer -->
    <transition name="sheet">
      <div v-if="showSheet" class="sheet-backdrop" @click="closeSheet">
        <div class="sheet" @click.stop>
          <div class="sheet-handle"></div>

          <div class="sheet-tabs" role="tablist">
            <button role="tab" :class="['sheet-tab', { active: activeTab === 'audio' }]"
                    @click="activeTab = 'audio'">
              <i class="fas fa-volume-up"></i><span>Audio</span>
            </button>
            <button role="tab" :class="['sheet-tab', { active: activeTab === 'history' }]"
                    @click="activeTab = 'history'">
              <i class="fas fa-history"></i><span>History</span>
            </button>
            <button v-if="gameStore.isGameActive && peerStore.isConnected"
                    role="tab" :class="['sheet-tab', { active: activeTab === 'chat' }]"
                    @click="activeTab = 'chat'">
              <i class="fas fa-comment-dots"></i><span>Chat</span>
              <span v-if="unreadChatCount > 0" class="chat-counter-bubble">{{ unreadChatCount }}</span>
            </button>
            <button v-if="gameStore.isGameActive"
                    role="tab" :class="['sheet-tab', { active: activeTab === 'options' }]"
                    @click="activeTab = 'options'">
              <i class="fas fa-cog"></i><span>Options</span>
            </button>
          </div>

          <div class="sheet-panel" v-show="activeTab === 'audio'">
            <h3 class="sheet-h3">Audio Settings</h3>
            <label class="sheet-checkbox">
              <input type="checkbox" v-model="gameStore.bgmEnabled"
                     @change="(e: Event) => gameStore.setBgmEnabled((e.target as HTMLInputElement).checked)">
              <span>Background Music</span>
            </label>
            <label class="sheet-checkbox">
              <input type="checkbox" v-model="gameStore.sfxEnabled"
                     @change="(e: Event) => gameStore.setSfxEnabled((e.target as HTMLInputElement).checked)">
              <span>Sound Effects</span>
            </label>
          </div>

          <div class="sheet-panel" v-show="activeTab === 'history'">
            <h3 class="sheet-h3">Recent Games</h3>
            <div v-if="gameStore.gameHistory.length === 0" class="sheet-empty">No games played yet.</div>
            <div class="sheet-scroll">
              <div v-for="(game, index) in gameStore.gameHistory" :key="index" class="history-card">
                <div class="history-meta">
                  <span>{{ new Date(game.date).toLocaleString() }}</span>
                  <span class="history-mode">{{ formatHistoryMode(game) }}</span>
                </div>
                <div class="history-scores">
                  <div v-for="playerScore in game.scores" :key="playerScore.playerNumber" class="history-score-row">
                    <span>Player {{ playerScore.playerNumber }}</span>
                    <span class="history-score-val">{{ playerScore.score }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="sheet-panel" v-show="activeTab === 'chat'">
            <h3 class="sheet-h3">Chat</h3>
            <div class="emoji-row">
              <span v-for="emoji in chatEmojis" :key="emoji" class="emoji-pick"
                    @click="sendEmojiAnimation(emoji)">{{ emoji }}</span>
            </div>
            <div class="chat-input-row">
              <input v-model="chatInput" @keyup.enter="sendChatMessage" placeholder="Type a message..." />
              <button @click="sendChatMessage" class="chat-send-btn">Send</button>
            </div>
            <div ref="chatHistoryEl" class="chat-history sheet-scroll">
              <div v-for="(msg, idx) in chatHistory" :key="idx" class="chat-msg">
                <span class="chat-history-sender">{{ msg.sender }}:</span> {{ msg.message }}
              </div>
            </div>
          </div>

          <div class="sheet-panel" v-show="activeTab === 'options'">
            <h3 class="sheet-h3">Game Options</h3>
            <button v-if="peerStore.isHost" class="sheet-action-btn danger" @click="endHostGame">End Game</button>
            <button v-if="peerStore.isHost || !peerStore.isConnected" class="sheet-action-btn primary" @click="restartGame">Restart Game</button>
            <button v-if="peerStore.isHost || !peerStore.isConnected" class="sheet-action-btn success" @click="newGame">Select Game</button>
            <button v-if="peerStore.isConnected" class="sheet-action-btn warning" @click="requestResync">Request Resync</button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Atmosphere layer (snow, embers, lightning, etc.) driven by .world-* on body -->
    <div class="world-fx" aria-hidden="true"></div>

    <LevelSelect v-if="!gameStore.gameIsActive && gameStore.showAdventureMenu"
                 @start-level="startAdventureLevel"
                 @back="closeAdventure" />
    <GameMode v-else-if="!gameStore.gameIsActive" @start-game="startGame" />
    <GameBoard v-else-if="!gameStore.gameIsOver" @end-game="endGame" />
    <GameOver v-if="gameStore.gameIsOver"
              @restart-game="newGame"
              @retry-puzzle="retryPuzzle"
              @next-level="nextLevel"
              @back-to-levels="backToLevels" />

    <div class="hidden grid-cols-3 grid-cols-4">Tailwind forced classes</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import GameMode from './components/GameMode.vue'
import GameBoard from './components/GameBoard.vue'
import GameOver from './components/GameOver.vue'
import LevelSelect from './components/LevelSelect.vue'
import { useGameStore } from './stores/gameStore'
import { GameMode as GameModeEnum } from './enums/GameMode'
import { GameVariant } from './enums/GameVariant'
import { SoundEffects, SoundVolumes } from './enums/SoundEffects'
import { usePeerStore } from './stores/peerStore'
import type { SeatSpec } from './controllers'
import { showEmojiAnimation } from './utils/animations'
import { getLevelByNumber } from './puzzle/levels/definitions'

const gameStore = useGameStore()
const peerStore = usePeerStore()

// Chat emojis (state for chat panel visibility now lives in showSheet + activeTab)
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

// Body theme class controller. Watches the active variant + adventure
// level and toggles `mode-rainbow` / `mode-puzzle` / `world-<id>` on
// <body>. CSS variables in src/styles/themes.css read off these classes.
const THEME_MODE_CLASSES = ['mode-rainbow', 'mode-puzzle']
const THEME_WORLD_CLASSES = [
  'world-beginnings', 'world-frostlands', 'world-echo-chamber',
  'world-storm-front', 'world-storm-surge', 'world-finale',
]
const THEME_COLORS: Record<string, string> = {
  'mode-rainbow': '#8e2de2',
  'mode-puzzle':  '#0f0a2e',
  'world-beginnings':  '#312e81',
  'world-frostlands':  '#1e3a5f',
  'world-echo-chamber':'#0e7490',
  'world-storm-front': '#334155',
  'world-storm-surge': '#7c2d12',
  'world-finale':      '#1f1d1d',
}

const activeThemeClasses = computed<string[]>(() => {
  const variant = gameStore.gameVariant
  const adventureN = gameStore.currentAdventureLevel
  // Adventure: layer world theme over mode-puzzle
  if (variant === GameVariant.Puzzle && adventureN != null) {
    const level = getLevelByNumber(adventureN)
    if (level) return ['mode-puzzle', `world-${level.worldId}`]
  }
  if (variant === GameVariant.Puzzle) return ['mode-puzzle']
  return ['mode-rainbow']
})

function applyThemeClasses(classes: string[]) {
  const body = document.body
  body.classList.remove(...THEME_MODE_CLASSES, ...THEME_WORLD_CLASSES)
  classes.forEach(c => body.classList.add(c))
  // Update <meta name="theme-color"> so the OS status bar matches the
  // active theme (PWA + Capacitor benefit).
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  const last = classes[classes.length - 1]
  const color = THEME_COLORS[last] || THEME_COLORS['mode-puzzle']
  if (meta) meta.content = color
  else {
    const m = document.createElement('meta')
    m.name = 'theme-color'
    m.content = color
    document.head.appendChild(m)
  }
}

watch(activeThemeClasses, applyThemeClasses, { immediate: true })

// Rejoin session modal state
const showRejoinModal = ref(false)
const pendingSessionData = ref<any>(null)

// Initialize music and preload SFX on component mount
onMounted(() => {
  preloadSoundEffects()
  initializeBackgroundMusic()

  // Auto-resync when the tab returns to the foreground. Covers the
  // suspend/wake case where messages may have been dropped while the
  // page was backgrounded without the WebRTC connection firing close.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      peerStore.requestResync()
    }
  })

  // Check for online session in localStorage, this might work better if a cookie is used instead.
  const session = localStorage.getItem('online session')
  if (session) {
    try {
      const data = JSON.parse(session);

      const params = new URLSearchParams(window.location.search)
      const code = params.get('room')
      if (code) {
        // roomCodeInput.value = code
        // showOnlineMenu.value = true // Optionally open the online menu automatically
      }

      if (data && data.isHost === false || data.hostRoomId === code) {
        pendingSessionData.value = data
        showRejoinModal.value = true
      }else{
        console.log('No session data found or isHost is true')
      }
    } catch (e) {
      // ignore parse errors
    }
  }
})

const formatHistoryMode = (game: { mode: GameModeEnum; variant?: GameVariant }): string => {
  const base = game.mode === GameModeEnum.SinglePlayer ? 'Single Player' : 'Multi Player'
  if (game.variant === GameVariant.Puzzle) return `${base} — Puzzle`
  return base
}

const startGame = (mode: GameModeEnum, players?: number, seats?: SeatSpec[], variant?: GameVariant) => {
  if (seats) {
    gameStore.initializeGame(mode, seats, variant);
  } else {
    gameStore.initializeGame(mode, players, variant);
  }
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

// Puzzle Mode: restart the same variant after game-over. restartGame reuses
// game.puzzleConfig (set in initializeGame) so the same level replays.
const retryPuzzle = () => {
  closeAllMenus();
  gameStore.gameIsOver = false;
  gameStore.restartGame();
}

// Adventure Mode UI plumbing.
const startAdventureLevel = (n: number) => {
  closeAllMenus();
  gameStore.startAdventureLevel(n);
}

const closeAdventure = () => {
  gameStore.closeAdventureMenu();
}

const nextLevel = () => {
  closeAllMenus();
  gameStore.gameIsOver = false;
  gameStore.nextAdventureLevel();
}

const backToLevels = () => {
  closeAllMenus();
  gameStore.returnToAdventureMenu();
}

// Bottom-sheet drawer state.
const showSheet = ref(false)
type SheetTab = 'audio' | 'history' | 'chat' | 'options'
const activeTab = ref<SheetTab>('audio')

const toggleSheet = () => {
  showSheet.value = !showSheet.value
  // Default to chat when opening if there are unread messages.
  if (showSheet.value && unreadChatCount.value > 0 && peerStore.isConnected && gameStore.isGameActive) {
    activeTab.value = 'chat'
  }
}
const closeSheet = () => { showSheet.value = false }
const closeAllMenus = () => { showSheet.value = false }

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
    const chatOpen = showSheet.value && activeTab.value === 'chat'
    if (!chatOpen) {
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

// Reset unread count when the chat tab becomes active in the sheet.
watch([showSheet, activeTab], () => {
  if (showSheet.value && activeTab.value === 'chat') unreadChatCount.value = 0
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
  if(peerStore.isHost){
    peerStore.sendData({ type: 'resyncRequest' });
  }else{
    peerStore.sendData({ type: 'resyncRequest' });
    console.log('Not the host, cannot request resync')
  }
}

function handleNewGame() {
  newGame();
}

function handleRejoinNo() {
  localStorage.removeItem('online session')
  showRejoinModal.value = false
  pendingSessionData.value = null
}

function handleRejoinYes() {
  if (pendingSessionData.value) {
    window.dispatchEvent(new CustomEvent('rejoin-session', { detail: pendingSessionData.value }))
  }
  showRejoinModal.value = false
}

</script>

<style scoped>
/* ============================================================
   Hamburger trigger (fixed top-right of #app column)
   ============================================================ */
.hamburger-btn {
  position: absolute;
  top: calc(0.5rem + var(--safe-top, 0px));
  right: 0.65rem;
  z-index: 30;
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.16);
  background: rgba(15, 23, 42, 0.65);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  color: var(--text, #fff);
  cursor: pointer;
  font-size: 1.05rem;
  transition: background 0.2s ease, transform 0.12s ease;
}
.hamburger-btn:hover { background: rgba(15, 23, 42, 0.85); }
.hamburger-btn:active { transform: scale(0.95); }

.chat-counter-bubble {
  position: absolute;
  top: -4px;
  right: -4px;
  background: linear-gradient(135deg, #ef4444, #b91c1c);
  color: #fff;
  font-size: 0.62rem;
  font-weight: 800;
  border-radius: 9999px;
  padding: 0 0.32rem;
  min-width: 1rem;
  height: 1rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  z-index: 10;
  pointer-events: none;
  box-shadow: 0 0 0 1.5px rgba(15,23,42,0.95);
}

/* ============================================================
   Bottom sheet
   ============================================================ */
.sheet-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.55);
  backdrop-filter: blur(2px);
  z-index: 200;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.sheet {
  width: 100%;
  max-width: var(--frame-max-width, 430px);
  max-height: 75dvh;
  background: linear-gradient(180deg, var(--bg-via, #1e1b4b) 0%, var(--bg-from, #0f0a2e) 100%);
  border-top-left-radius: 22px;
  border-top-right-radius: 22px;
  box-shadow: 0 -10px 40px -5px rgba(0,0,0,0.55);
  padding: 0.6rem 1rem calc(1rem + var(--safe-bottom, 0px));
  color: var(--text, #fff);
  display: flex;
  flex-direction: column;
}
.sheet-handle {
  width: 40px;
  height: 4px;
  border-radius: 2px;
  background: rgba(255,255,255,0.3);
  margin: 0 auto 0.6rem;
}
.sheet-tabs {
  display: flex;
  gap: 0.4rem;
  margin-bottom: 0.8rem;
}
.sheet-tab {
  position: relative;
  flex: 1;
  padding: 0.45rem 0.3rem;
  border-radius: 10px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.08);
  color: var(--text-soft, #cbd5e1);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  font-size: 0.68rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.18s ease, color 0.18s ease;
}
.sheet-tab i { font-size: 0.95rem; }
.sheet-tab.active {
  background: var(--accent-soft, rgba(232,121,249,0.25));
  color: #fff;
  border-color: var(--accent, #e879f9);
  box-shadow: 0 0 0 1px var(--accent, #e879f9);
}
.sheet-panel {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
.sheet-h3 {
  font-size: 1rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  margin: 0 0 0.2rem;
  color: var(--text);
}
.sheet-checkbox {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.5rem 0.6rem;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px;
  cursor: pointer;
  font-weight: 600;
}
.sheet-checkbox input { accent-color: var(--accent); width: 1.1rem; height: 1.1rem; }
.sheet-empty {
  color: var(--text-soft);
  font-size: 0.85rem;
  text-align: center;
  padding: 1rem 0;
}
.sheet-scroll {
  max-height: 55dvh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.history-card {
  padding: 0.55rem 0.7rem;
  background: rgba(255,255,255,0.05);
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.08);
}
.history-meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.72rem;
  color: var(--text-soft);
  margin-bottom: 0.3rem;
}
.history-mode { font-weight: 700; }
.history-scores { display: flex; flex-direction: column; gap: 2px; }
.history-score-row {
  display: flex;
  justify-content: space-between;
  background: rgba(255,255,255,0.04);
  padding: 0.25rem 0.4rem;
  border-radius: 6px;
  font-size: 0.78rem;
}
.history-score-val { font-weight: 800; font-variant-numeric: tabular-nums; }
.emoji-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 0.4rem;
}
.emoji-pick {
  font-size: 1.65rem;
  cursor: pointer;
  user-select: none;
  transition: transform 0.15s ease;
}
.emoji-pick:hover { transform: scale(1.2); }
.chat-input-row {
  display: flex;
  gap: 0.4rem;
}
.chat-input-row input {
  flex: 1;
  border-radius: 8px;
  padding: 0.45rem 0.6rem;
  background: rgba(15, 23, 42, 0.6);
  color: #fff;
  border: 1px solid rgba(255,255,255,0.1);
}
.chat-input-row input:focus { outline: 2px solid var(--accent); outline-offset: 1px; }
.chat-send-btn {
  padding: 0.45rem 0.85rem;
  border-radius: 8px;
  background: var(--accent);
  color: #0f0a2e;
  font-weight: 700;
  cursor: pointer;
  border: none;
}
.chat-history {
  background: rgba(15, 23, 42, 0.5);
  border-radius: 8px;
  padding: 0.5rem;
  margin-top: 0.4rem;
}
.chat-msg { font-size: 0.85rem; line-height: 1.35; }
.chat-history-sender {
  color: var(--accent);
  font-weight: 700;
  margin-right: 0.25rem;
}
.sheet-action-btn {
  padding: 0.7rem 0.9rem;
  border-radius: 10px;
  font-weight: 700;
  color: #fff;
  cursor: pointer;
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.06);
  text-align: left;
}
.sheet-action-btn.primary { background: linear-gradient(135deg, #2563eb, #1d4ed8); }
.sheet-action-btn.success { background: linear-gradient(135deg, #16a34a, #166534); }
.sheet-action-btn.warning { background: linear-gradient(135deg, #d97706, #b45309); }
.sheet-action-btn.danger  { background: linear-gradient(135deg, #dc2626, #7f1d1d); }
.sheet-action-btn:hover { transform: translateY(-1px); }
.sheet-action-btn:active { transform: translateY(1px); }

/* Slide-in transition for the sheet */
.sheet-enter-active, .sheet-leave-active {
  transition: opacity 0.25s ease;
}
.sheet-enter-active .sheet, .sheet-leave-active .sheet {
  transition: transform 0.28s cubic-bezier(0.32, 0.72, 0.36, 1.0);
}
.sheet-enter-from, .sheet-leave-to { opacity: 0; }
.sheet-enter-from .sheet, .sheet-leave-to .sheet { transform: translateY(100%); }

@media (prefers-reduced-motion: reduce) {
  .sheet-enter-active, .sheet-leave-active,
  .sheet-enter-active .sheet, .sheet-leave-active .sheet {
    transition: none;
  }
}
</style>