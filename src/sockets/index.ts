import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from './socket.types.js';
import { registerSocketEvents } from './events.js';
import logger from '../shared/utils/logger.js';

export type SocketIOServer = Server<ClientToServerEvents, ServerToClientEvents>;

let io: SocketIOServer | null = null;

export function initSocketIO(httpServer: HttpServer): SocketIOServer {
  io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  registerSocketEvents(io);
  logger.info('Socket.IO server initialized');
  return io;
}

export function getSocketIO(): SocketIOServer {
  if (!io) {
    throw new Error('Socket.IO server not initialized. Call initSocketIO first.');
  }
  return io;
}

export function emitToAll<K extends keyof ServerToClientEvents>(
  event: K,
  ...args: Parameters<ServerToClientEvents[K]>
): void {
  if (io) {
    io.emit(event, ...args);
  }
}
