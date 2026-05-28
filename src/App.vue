<template>
  <div class="app-root">
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
    <!-- Top icon nav. First flex child of #app; non-scrolling. Each icon
         toggles a dropdown panel anchored below the bar. Left side hosts
         a contextual Back button shown on every screen except the main
         menu (closes adventure, abandons active game, etc.). -->
    <header class="app-top-bar">
      <div class="top-nav-left">
        <button v-if="!isOnMainMenu" class="nav-icon-btn back-btn"
                @click="goBack" aria-label="Back">
          <i class="fas fa-arrow-left"></i>
        </button>
      </div>
      <nav class="top-nav" role="tablist" aria-label="Game menu">
        <button role="tab" class="nav-icon-btn" :class="{ active: activePanel === 'audio' }"
                @click="togglePanel('audio')" :aria-selected="activePanel === 'audio'" aria-label="Audio">
          <i class="fas fa-volume-up"></i>
        </button>
        <button role="tab" class="nav-icon-btn" :class="{ active: activePanel === 'history' }"
                @click="togglePanel('history')" :aria-selected="activePanel === 'history'" aria-label="History">
          <i class="fas fa-history"></i>
        </button>
        <button role="tab" class="nav-icon-btn" :class="{ active: activePanel === 'profile' }"
                @click="togglePanel('profile')" :aria-selected="activePanel === 'profile'" aria-label="Profile">
          <i class="fas fa-user-circle"></i>
        </button>
        <button v-if="gameStore.isGameActive && peerStore.isConnected"
                role="tab" class="nav-icon-btn" :class="{ active: activePanel === 'chat' }"
                @click="togglePanel('chat')" :aria-selected="activePanel === 'chat'" aria-label="Chat">
          <i class="fas fa-comment-dots"></i>
          <span v-if="unreadChatCount > 0" class="chat-counter-bubble">{{ unreadChatCount }}</span>
        </button>
        <button v-if="gameStore.isGameActive"
                role="tab" class="nav-icon-btn" :class="{ active: activePanel === 'options' }"
                @click="togglePanel('options')" :aria-selected="activePanel === 'options'" aria-label="Options">
          <i class="fas fa-cog"></i>
        </button>
      </nav>
    </header>

    <!-- Dropdown panel below the top nav. Backdrop is subtle so the nav
         remains visible; clicking it closes. -->
    <transition name="nav-panel">
      <div v-if="activePanel" class="nav-panel-backdrop" @click="closePanel">
        <div class="nav-panel" @click.stop role="tabpanel">
          <div v-if="activePanel === 'audio'" class="nav-panel-body">
            <h3 class="nav-panel-h3">Audio Settings</h3>
            <label class="nav-panel-checkbox">
              <input type="checkbox" v-model="gameStore.bgmEnabled"
                     @change="(e: Event) => gameStore.setBgmEnabled((e.target as HTMLInputElement).checked)">
              <span>Background Music</span>
            </label>
            <label class="nav-panel-checkbox">
              <input type="checkbox" v-model="gameStore.sfxEnabled"
                     @change="(e: Event) => gameStore.setSfxEnabled((e.target as HTMLInputElement).checked)">
              <span>Sound Effects</span>
            </label>
          </div>

          <div v-else-if="activePanel === 'history'" class="nav-panel-body">
            <h3 class="nav-panel-h3">Recent Games</h3>
            <div v-if="gameStore.gameHistory.length === 0" class="nav-panel-empty">No games played yet.</div>
            <div class="nav-panel-scroll">
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

          <div v-else-if="activePanel === 'chat'" class="nav-panel-body">
            <h3 class="nav-panel-h3">Chat</h3>
            <div class="emoji-row">
              <span v-for="emoji in chatEmojis" :key="emoji" class="emoji-pick"
                    @click="sendEmojiAnimation(emoji)">{{ emoji }}</span>
            </div>
            <div class="chat-input-row">
              <input v-model="chatInput" @keyup.enter="sendChatMessage" placeholder="Type a message..." />
              <button @click="sendChatMessage" class="chat-send-btn">Send</button>
            </div>
            <div ref="chatHistoryEl" class="chat-history nav-panel-scroll">
              <div v-for="(msg, idx) in chatHistory" :key="idx" class="chat-msg">
                <span class="chat-history-sender">{{ msg.sender }}:</span> {{ msg.message }}
              </div>
            </div>
          </div>

          <div v-else-if="activePanel === 'profile'" class="nav-panel-body">
            <ProfilePanel />
          </div>

          <div v-else-if="activePanel === 'options'" class="nav-panel-body">
            <h3 class="nav-panel-h3">Game Options</h3>
            <button v-if="peerStore.isHost" class="nav-panel-action-btn danger" @click="endHostGame">End Game</button>
            <button v-if="peerStore.isHost || !peerStore.isConnected" class="nav-panel-action-btn primary" @click="restartGame">Restart Game</button>
            <button v-if="peerStore.isHost || !peerStore.isConnected" class="nav-panel-action-btn success" @click="newGame">Select Game</button>
            <button v-if="peerStore.isConnected" class="nav-panel-action-btn warning" @click="requestResync">Request Resync</button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Atmosphere layer (snow, embers, lightning, etc.) driven by .world-* on body -->
    <div class="world-fx" aria-hidden="true"></div>

    <LevelSelect v-if="!gameStore.gameIsActive && gameStore.showAdventureMenu"
                 @start-level="startAdventureLevel" />
    <GameMode v-else-if="!gameStore.gameIsActive" @start-game="startGame" />
    <GameBoard v-else-if="!gameStore.gameIsOver" @end-game="endGame" />
    <GameOver v-if="gameStore.gameIsOver"
              @restart-game="newGame"
              @retry-puzzle="retryPuzzle"
              @next-level="nextLevel"
              @back-to-levels="backToLevels" />

    <AchievementToast />

    <div class="hidden grid-cols-3 grid-cols-4">Tailwind forced classes</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import GameMode from './components/GameMode.vue'
import GameBoard from './components/GameBoard.vue'
import GameOver from './components/GameOver.vue'
import LevelSelect from './components/LevelSelect.vue'
import ProfilePanel from './components/ProfilePanel.vue'
import AchievementToast from './components/AchievementToast.vue'
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

// Chat emojis (state for chat panel visibility now lives in activePanel)
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

// Top icon nav state. Tapping an icon toggles its dropdown panel; tapping
// the same icon again or the backdrop closes.
type NavPanel = 'audio' | 'history' | 'profile' | 'chat' | 'options'
const activePanel = ref<NavPanel | null>(null)

const togglePanel = (panel: NavPanel) => {
  activePanel.value = activePanel.value === panel ? null : panel
}
const closePanel = () => { activePanel.value = null }
const closeAllMenus = () => { activePanel.value = null }

// True only on the GameMode screen (mode-select menu). When false, the
// top-nav shows a Back button on the left whose action is contextual.
const isOnMainMenu = computed(() =>
  !gameStore.gameIsActive && !gameStore.gameIsOver && !gameStore.showAdventureMenu)

const goBack = () => {
  if (gameStore.showAdventureMenu) {
    closeAdventure()
  } else {
    newGame()
  }
}

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
    if (activePanel.value !== 'chat') {
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

// Reset unread count when the chat panel opens.
watch(activePanel, () => {
  if (activePanel.value === 'chat') unreadChatCount.value = 0
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
/* The Vue root <div> dissolves into #app's flex column so the top bar
   and active screen become direct flex children. */
.app-root {
  display: contents;
}

/* ============================================================
   Top icon nav — first flex child of #app. Holds a row of icon
   buttons; each toggles a dropdown panel anchored below.
   ============================================================ */
.app-top-bar {
  position: relative;
  z-index: 60;
  flex-shrink: 0;
  width: 100%;
  padding: calc(0.4rem + var(--safe-top, 0px)) 0.55rem 0.4rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.4rem;
}

.top-nav-left {
  display: flex;
  align-items: center;
  /* Reserve the slot so the right-side nav doesn't shift between screens
     where the Back button is absent vs. present. */
  min-width: 38px;
}

.top-nav {
  display: flex;
  gap: 0.4rem;
  justify-content: flex-end;
}

.nav-icon-btn {
  position: relative;
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.16);
  background: rgba(15, 23, 42, 0.7);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  color: var(--text-soft, #cbd5e1);
  cursor: pointer;
  font-size: 1.05rem;
  transition: background 0.2s ease, color 0.18s ease, transform 0.12s ease, box-shadow 0.18s ease;
}
.nav-icon-btn:hover { background: rgba(15, 23, 42, 0.92); color: var(--text); }
.nav-icon-btn:active { transform: scale(0.95); }
.nav-icon-btn.active {
  background: var(--accent-soft, rgba(232,121,249,0.25));
  color: #fff;
  border-color: var(--accent, #e879f9);
  box-shadow: 0 0 0 1px var(--accent, #e879f9);
}

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
   Dropdown panel
   ------------------------------------------------------------
   Anchors below .app-top-bar inside #app's relative box.
   Backdrop covers everything below the bar so the nav row stays
   tappable to close. Panel itself caps at 70dvh and scrolls
   internally for long content (profile, history).
   ============================================================ */
.nav-panel-backdrop {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(2.8rem + var(--safe-top, 0px));
  bottom: 0;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(3px);
  z-index: 50;
  display: flex;
  align-items: flex-start;
  justify-content: center;
}
.nav-panel {
  width: 100%;
  max-height: 70dvh;
  background: linear-gradient(180deg, var(--bg-via, #1e1b4b) 0%, var(--bg-from, #0f0a2e) 100%);
  border-bottom-left-radius: 18px;
  border-bottom-right-radius: 18px;
  box-shadow: 0 10px 40px -5px rgba(0,0,0,0.55);
  padding: 0.9rem 1rem 1rem;
  color: var(--text, #fff);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.nav-panel-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
.nav-panel-h3 {
  font-size: 1rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  margin: 0 0 0.2rem;
  color: var(--text);
}
.nav-panel-checkbox {
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
.nav-panel-checkbox input { accent-color: var(--accent); width: 1.1rem; height: 1.1rem; }
.nav-panel-empty {
  color: var(--text-soft);
  font-size: 0.85rem;
  text-align: center;
  padding: 1rem 0;
}
.nav-panel-scroll {
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
.nav-panel-action-btn {
  padding: 0.7rem 0.9rem;
  border-radius: 10px;
  font-weight: 700;
  color: #fff;
  cursor: pointer;
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.06);
  text-align: left;
}
.nav-panel-action-btn.primary { background: linear-gradient(135deg, #2563eb, #1d4ed8); }
.nav-panel-action-btn.success { background: linear-gradient(135deg, #16a34a, #166534); }
.nav-panel-action-btn.warning { background: linear-gradient(135deg, #d97706, #b45309); }
.nav-panel-action-btn.danger  { background: linear-gradient(135deg, #dc2626, #7f1d1d); }
.nav-panel-action-btn:hover { transform: translateY(-1px); }
.nav-panel-action-btn:active { transform: translateY(1px); }

/* Slide-down transition for the dropdown panel */
.nav-panel-enter-active, .nav-panel-leave-active {
  transition: opacity 0.2s ease;
}
.nav-panel-enter-active .nav-panel, .nav-panel-leave-active .nav-panel {
  transition: transform 0.24s cubic-bezier(0.32, 0.72, 0.36, 1.0);
}
.nav-panel-enter-from, .nav-panel-leave-to { opacity: 0; }
.nav-panel-enter-from .nav-panel, .nav-panel-leave-to .nav-panel { transform: translateY(-100%); }

@media (prefers-reduced-motion: reduce) {
  .nav-panel-enter-active, .nav-panel-leave-active,
  .nav-panel-enter-active .nav-panel, .nav-panel-leave-active .nav-panel {
    transition: none;
  }
}
</style>