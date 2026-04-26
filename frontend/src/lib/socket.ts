import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000', {
      autoConnect: false,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })
  }
  return socket
}

export const connectSocket = (userId: string) => {
  const s = getSocket()
  if (!s.connected) {
    s.connect()
    s.emit('user:online', userId)
  }
}

export const disconnectSocket = () => {
  if (socket?.connected) {
    socket.disconnect()
  }
}
