<template>
  <div id="game-mode-container" class="flex flex-col items-center gap-3">
    <div class="gm-brand">
      <h1 class="gm-title">Rainbow Yahtzee</h1>
      <div class="gm-subtitle">Roll. Score. Survive the puzzle.</div>
    </div>
    <div class="flex flex-col w-full gap-2.5">
      <button @click="toggleSinglePlayerMenu" class="mode-card mode-card-solo">
        <i class="fas fa-user mode-card-icon"></i>
        <div class="mode-card-body">
          <div class="mode-card-title">Single Player</div>
          <div class="mode-card-sub">Classic, Puzzle, Adventure, vs. AI</div>
        </div>
        <i class="fas mode-card-chevron" :class="showSinglePlayerMenu ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
      </button>

      <div v-if="showSinglePlayerMenu" class="mode-submenu">
        <button @click="startSinglePlayer(GameVariant.Rainbow)" class="mode-sub-btn rainbow">
          <i class="fas fa-palette"></i><span>Classic Rainbow</span>
        </button>
        <button @click="startSinglePlayer(GameVariant.Puzzle)" class="mode-sub-btn puzzle">
          <i class="fas fa-shuffle"></i><span>Puzzle — Random</span>
        </button>
        <button @click="openAdventure" class="mode-sub-btn adventure">
          <i class="fas fa-map"></i><span>Puzzle — Adventure</span>
        </button>
        <button @click="startPuzzleVsAi" class="mode-sub-btn vs-ai">
          <i class="fas fa-robot"></i><span>Puzzle vs. Dice Master</span>
        </button>
        <button @click="startDailyPuzzle" class="mode-sub-btn daily">
          <i class="fas fa-calendar-day"></i>
          <span>Daily Puzzle</span>
          <span v-if="dailyStreak > 0" class="daily-streak-badge" :title="`${dailyStreak}-day streak`">
            <i class="fas fa-fire"></i>{{ dailyStreak }}
          </span>
        </button>
      </div>

      <button @click="toggleMultiplayerMenu" class="mode-card mode-card-local">
        <i class="fas fa-users mode-card-icon"></i>
        <div class="mode-card-body">
          <div class="mode-card-title">Local Multi Player</div>
          <div class="mode-card-sub">2–4 players, share a screen</div>
        </div>
        <i class="fas mode-card-chevron" :class="showMultiplayerMenu ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
      </button>

      <button @click="toggleOnlineMenu" class="mode-card mode-card-online">
        <i class="fas fa-globe mode-card-icon"></i>
        <div class="mode-card-body">
          <div class="mode-card-title">Online Multi Player</div>
          <div class="mode-card-sub">Play with a friend over WebRTC</div>
        </div>
        <i class="fas mode-card-chevron" :class="showOnlineMenu ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
      </button>

      <div v-if="showMultiplayerMenu" class="mode-config-panel">
        <h3 class="mode-config-title">Local Multi Player</h3>

        <div class="player-count-row">
          <button v-for="n in [2, 3, 4]" :key="n"
                  @click="setPlayerCount(n)"
                  :class="['player-count-button', { active: playerCount === n }]">
            {{ n }} Players
          </button>
        </div>

        <div class="seat-rows">
          <div v-for="(seat, index) in seats" :key="index" class="seat-row">
            <span class="seat-name">{{ seat.name }}</span>
            <button @click="toggleSeatKind(index)"
                    :class="['seat-kind-btn', seat.kind === 'ai' ? 'ai' : 'human']">
              <i :class="['fas', seat.kind === 'ai' ? 'fa-robot' : 'fa-user']"></i>
              {{ seat.kind === 'ai' ? 'Computer' : 'Human' }}
            </button>
          </div>
        </div>

        <button @click="startLocalMultiplayer" class="start-btn">
          <i class="fas fa-play"></i>Start Game
        </button>
      </div>

      <div v-if="showOnlineMenu" class="mode-config-panel">
        <h3 class="mode-config-title">Online Game</h3>
        <button v-if="!peerStore.isHost && !peerStore.isConnected"
                @click="createRoom" class="online-action-btn host">
          <i class="fas fa-house-flag"></i>Create Room
        </button>

        <div v-if="peerStore.roomCode && peerStore.isHost" class="room-code-block">
          <p class="room-code-label">Room Code</p>
          <div class="room-code-row">
            <code class="room-code">{{ peerStore.roomCode }}</code>
            <button @click="copyRoomCode" class="room-share-btn">
              <i class="fa-solid fa-share"></i>Share
            </button>
          </div>
          <transition name="fade">
            <span v-if="copied" class="room-copied">Copied!</span>
          </transition>
        </div>

        <div v-if="!peerStore.isHost && peerStore.isConnected" class="online-status">
          <i class="fas fa-spinner fa-spin"></i>Waiting for host to start game…
        </div>

        <div v-if="!peerStore.isHost && !peerStore.isConnected" class="join-row">
          <input v-model="roomCodeInput" type="text" placeholder="Enter room code" />
          <button @click="joinRoom" :disabled="isConnecting" class="join-btn">
            {{ isConnecting ? 'Connecting…' : 'Join' }}
          </button>
        </div>

        <button v-if="peerStore.isHost" @click="stopHosting" class="online-action-btn danger">
          <i class="fas fa-power-off"></i>Stop Hosting
        </button>
        <button v-if="peerStore.isConnected" @click="startOnlineGame" class="start-btn">
          <i class="fas fa-play"></i>Start Game
        </button>
      </div>

      <div class="gm-footer">
        <div>Programmed by John Zappone</div>
        <div class="gm-version">Version: {{ version }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import { GameMode } from '../enums/GameMode'
import { GameVariant } from '../enums/GameVariant'
import { usePeerStore, VERSION } from '../stores/peerStore'
import { useGameStore } from '../stores/gameStore'
import type { SeatSpec, ControllerKind } from '../controllers'
import { currentStreakFor } from '../puzzle/daily/dailyProgress'
import { getDailyDateKey } from '../utils/dailyDate'

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

const startPuzzleVsAi = () => {
  const seats: SeatSpec[] = [
    { name: 'Player 1', kind: 'local' },
    { name: 'Dice Master', kind: 'ai' },
  ]
  // MultiPlayer + Puzzle variant — the guard in initializeGame allows
  // Puzzle for local multiplayer (only OnlineMultiPlayer is forced back to
  // Rainbow). Random variant config is picked inside the store.
  emit('start-game', GameMode.MultiPlayer, undefined, seats, GameVariant.Puzzle)
  showSinglePlayerMenu.value = false
}

const dailyStreak = computed(() => currentStreakFor(gameStore.dailyProgress, getDailyDateKey()))

// Daily Puzzle is its own entry point — the store builds the
// DailyPuzzleConfig and forwards into initializeGame, so we skip the
// `start-game` emit and call the store directly.
const startDailyPuzzle = () => {
  gameStore.startDailyPuzzle()
  showSinglePlayerMenu.value = false
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
.gm-brand {
  text-align: center;
  padding: 1.5rem 0 0.6rem;
}
.gm-title {
  font-size: clamp(1.7rem, 7vw, 2.2rem);
  font-weight: 900;
  letter-spacing: -0.02em;
  background: linear-gradient(135deg, var(--accent, #22d3ee) 0%, #fff 60%, var(--accent, #22d3ee) 100%);
  background-size: 200% 200%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  text-shadow: 0 4px 18px var(--accent-soft, rgba(34,211,238,0.45));
  animation: gmTitleShift 6s ease-in-out infinite;
}
@keyframes gmTitleShift {
  0%, 100% { background-position: 0% 50%; }
  50%      { background-position: 100% 50%; }
}
.gm-subtitle {
  font-size: 0.78rem;
  color: var(--text-soft, #cbd5e1);
  margin-top: 0.2rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

/* Top-level mode cards. */
.mode-card {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.8rem 0.95rem;
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,0.12);
  background: linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%);
  cursor: pointer;
  text-align: left;
  color: var(--text, #fff);
  width: 100%;
  transition: transform 0.12s ease, border-color 0.18s ease, background 0.18s ease;
}
.mode-card:hover {
  transform: translateY(-1px);
  border-color: var(--accent);
  background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.04) 100%);
}
.mode-card:active { transform: scale(0.98); }
.mode-card-icon {
  width: 42px;
  height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--accent) 0%, var(--bg-via) 100%);
  color: #fff;
  box-shadow: 0 0 0 1px rgba(255,255,255,0.18) inset;
  flex-shrink: 0;
}
.mode-card-solo .mode-card-icon   { background: linear-gradient(135deg, #60a5fa, #1d4ed8); }
.mode-card-local .mode-card-icon  { background: linear-gradient(135deg, #4ade80, #15803d); }
.mode-card-online .mode-card-icon { background: linear-gradient(135deg, #c084fc, #6b21a8); }
.mode-card-body { flex: 1; min-width: 0; }
.mode-card-title {
  font-size: 1rem;
  font-weight: 800;
  letter-spacing: 0.01em;
}
.mode-card-sub {
  font-size: 0.7rem;
  color: var(--text-soft, #cbd5e1);
  margin-top: 0.1rem;
}
.mode-card-chevron {
  color: var(--text-soft, #94a3b8);
  font-size: 0.78rem;
}

/* Submenu (single-player variants). */
.mode-submenu {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  margin: -0.2rem 0 0.3rem;
  padding-left: 0.6rem;
  border-left: 2px solid var(--accent);
}
.mode-sub-btn {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.6rem 0.8rem;
  border-radius: 10px;
  font-weight: 700;
  font-size: 0.88rem;
  color: #fff;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, transform 0.1s ease;
  text-align: left;
}
.mode-sub-btn:hover { background: rgba(255,255,255,0.1); transform: translateX(2px); }
.mode-sub-btn.rainbow   { box-shadow: 0 0 0 1px rgba(34,211,238,0.35); }
.mode-sub-btn.puzzle    { box-shadow: 0 0 0 1px rgba(232,121,249,0.35); }
.mode-sub-btn.adventure { box-shadow: 0 0 0 1px rgba(168,85,247,0.4); }
.mode-sub-btn.vs-ai     { box-shadow: 0 0 0 1px rgba(248,113,113,0.35); }
.mode-sub-btn.daily     { box-shadow: 0 0 0 1px rgba(52,211,153,0.4); }
.daily-streak-badge {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.72rem;
  font-weight: 700;
  background: linear-gradient(135deg, #fb923c, #b91c1c);
  color: #fff;
  padding: 0.1rem 0.45rem;
  border-radius: 9999px;
}
.daily-streak-badge i { font-size: 0.65rem; }

/* Config panels (local MP seat setup, online room flow). */
.mode-config-panel {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  padding: 0.7rem;
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.5);
  border: 1px solid rgba(255,255,255,0.08);
}
.mode-config-title {
  font-size: 0.95rem;
  font-weight: 800;
  letter-spacing: 0.02em;
}
.player-count-row { display: flex; gap: 0.4rem; }
.player-count-button {
  flex: 1;
  padding: 0.5rem 0.5rem;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.88rem;
  color: #fff;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  cursor: pointer;
  transition: background 0.15s ease;
}
.player-count-button.active {
  background: linear-gradient(135deg, var(--accent) 0%, var(--bg-via) 100%);
  border-color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent);
}
.seat-rows { display: flex; flex-direction: column; gap: 0.35rem; }
.seat-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 0.55rem;
  border-radius: 8px;
  background: rgba(15,23,42,0.55);
  border: 1px solid rgba(255,255,255,0.06);
}
.seat-name { flex: 1; font-size: 0.85rem; font-weight: 600; }
.seat-kind-btn {
  padding: 0.35rem 0.65rem;
  border-radius: 8px;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  color: #fff;
  border: 1px solid rgba(255,255,255,0.12);
}
.seat-kind-btn.human { background: linear-gradient(135deg, #2563eb, #1d4ed8); }
.seat-kind-btn.ai    { background: linear-gradient(135deg, #f97316, #c2410c); }

.start-btn {
  padding: 0.7rem 1rem;
  border-radius: 10px;
  font-weight: 800;
  color: #0f0a2e;
  background: linear-gradient(135deg, var(--accent) 0%, #fff 100%);
  cursor: pointer;
  border: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.online-action-btn {
  padding: 0.65rem 0.85rem;
  border-radius: 10px;
  font-weight: 700;
  color: #fff;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  border: 1px solid rgba(255,255,255,0.12);
}
.online-action-btn.host   { background: linear-gradient(135deg, #c084fc, #6b21a8); }
.online-action-btn.danger { background: linear-gradient(135deg, #f87171, #b91c1c); }

.room-code-block { display: flex; flex-direction: column; gap: 0.3rem; }
.room-code-label { font-size: 0.78rem; font-weight: 700; color: var(--text-soft); }
.room-code-row { display: flex; gap: 0.4rem; }
.room-code {
  flex: 1;
  background: rgba(15,23,42,0.85);
  padding: 0.6rem;
  border-radius: 8px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 1.05rem;
  letter-spacing: 0.08em;
  font-weight: 700;
  text-align: center;
  user-select: all;
}
.room-share-btn {
  padding: 0.6rem 0.85rem;
  border-radius: 8px;
  background: rgba(255,255,255,0.08);
  color: #fff;
  cursor: pointer;
  border: 1px solid rgba(255,255,255,0.1);
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.85rem;
  font-weight: 600;
}
.room-copied { color: #4ade80; font-size: 0.72rem; }
.online-status {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  color: var(--text-soft, #cbd5e1);
  font-size: 0.85rem;
  padding: 0.5rem 0.2rem;
}

.join-row { display: flex; gap: 0.4rem; }
.join-row input {
  flex: 1;
  padding: 0.5rem 0.65rem;
  border-radius: 8px;
  background: rgba(15,23,42,0.65);
  color: #fff;
  border: 1px solid rgba(255,255,255,0.1);
  font-size: 0.95rem;
}
.join-btn {
  padding: 0.5rem 0.95rem;
  border-radius: 8px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #c084fc, #6b21a8);
  border: none;
  cursor: pointer;
}

.gm-footer {
  margin-top: 1.5rem;
  text-align: center;
  color: var(--text-soft, #94a3b8);
  font-size: 0.72rem;
}
.gm-version { opacity: 0.6; margin-top: 0.15rem; }

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style> 