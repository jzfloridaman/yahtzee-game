import { defineStore } from 'pinia'
import Peer, { DataConnection } from 'peerjs'
import { useGameStore } from './gameStore'
import { GameMode } from '../enums/GameMode'

interface PeerState {
  peer: Peer | null
  connection: DataConnection | null
  roomCode: string | null
  isHost: boolean
  isConnected: boolean
  connectionLost: boolean
}

export const usePeerStore = defineStore('peer', {
  state: (): PeerState => ({
    peer: null,
    connection: null,
    roomCode: null,
    isHost: false,
    isConnected: false,
    connectionLost: false
  }),

  actions: {
    initializePeer(roomCode: string | null) {
      // Generate a random ID for the peer
      if(roomCode == null){
        const peerId = Math.random().toString(36).substring(2, 8)
        this.peer = new Peer(peerId)
      }else{
        this.peer = new Peer(roomCode)
      }
      
      this.peer.on('open', (id) => {
        console.log('Peer connected with ID:', id)
      })

      this.peer.on('connection', (conn) => {
        console.log('Incoming connection from:', conn.peer)
        this.connection = conn
        this.setupConnectionListeners()
      })

      this.peer.on('error', (err) => {
        console.error('Peer error:', err)
      })
    },

    createRoom() {
      if (!this.peer) {
        this.initializePeer("test")
      }
      this.isHost = true
      this.roomCode = this.peer?.id || null
      // Set game mode for host
      const gameStore = useGameStore()
      gameStore.gameMode = GameMode.OnlineMultiPlayer
    },

    joinRoom(roomCode: string) {
      if (!this.peer) {
        this.initializePeer("player2")
      }
      this.roomCode = "test"//roomCode
      this.isHost = false
      
      // Set game mode for client
      const gameStore = useGameStore()
      gameStore.gameMode = GameMode.OnlineMultiPlayer
      
      if (this.peer) {
        const conn = this.peer.connect(roomCode)
        this.connection = conn
        this.setupConnectionListeners()
      }
    },

    setupConnectionListeners() {
      if (!this.connection) return

      this.connection.on('open', () => {
        console.log('Connection established')
        this.isConnected = true
        this.connectionLost = false
      })

      this.connection.on('data', (data: any) => {
        console.log('Received data:', data)
        // Forward data to game store
        const gameStore = useGameStore()
        gameStore.handleIncomingData(data)
      })

      this.connection.on('close', () => {
        console.log('Connection closed')
        this.isConnected = false
        this.connectionLost = true
      })

      this.connection.on('error', (err: any) => {
        console.error('Connection error:', err)
        this.connectionLost = true
      })
    },

    sendData(data: any) {
      if (this.connection && this.isConnected) {
        console.log('Sending data:', data);
        this.connection.send(data)
      } else {
        console.log('Cannot send data:', {
          hasConnection: !!this.connection,
          isConnected: this.isConnected
        });
      }
    },

    disconnect() {
      if (this.connection) {
        this.connection.close()
      }
      if (this.peer) {
        this.peer.destroy()
      }
      this.$reset()
      this.connectionLost = false
    }
  }
}) 