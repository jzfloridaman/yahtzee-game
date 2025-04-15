import { defineStore } from 'pinia'
import Peer from 'peerjs'

interface PeerState {
  peer: Peer | null
  connection: Peer.DataConnection | null
  roomCode: string | null
  isHost: boolean
  isConnected: boolean
}

export const usePeerStore = defineStore('peer', {
  state: (): PeerState => ({
    peer: null,
    connection: null,
    roomCode: null,
    isHost: false,
    isConnected: false
  }),

  actions: {
    initializePeer() {
      // Generate a random ID for the peer
      const peerId = Math.random().toString(36).substring(2, 8)
      this.peer = new Peer(peerId)
      
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
        this.initializePeer()
      }
      this.isHost = true
      this.roomCode = this.peer?.id || null
    },

    joinRoom(roomCode: string) {
      if (!this.peer) {
        this.initializePeer()
      }
      this.roomCode = roomCode
      this.isHost = false
      
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
      })

      this.connection.on('data', (data) => {
        console.log('Received data:', data)
        // Handle incoming game data here
      })

      this.connection.on('close', () => {
        console.log('Connection closed')
        this.isConnected = false
      })

      this.connection.on('error', (err) => {
        console.error('Connection error:', err)
      })
    },

    sendData(data: any) {
      if (this.connection && this.isConnected) {
        this.connection.send(data)
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
    }
  }
}) 