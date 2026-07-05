import { io, Socket } from 'socket.io-client';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(BASE_URL, { autoConnect: true, transports: ['websocket'] });
  }
  return socket;
}
