import type { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from './socket.types.js';
import logger from '../shared/utils/logger.js';

type IOServer = Server<ClientToServerEvents, ServerToClientEvents>;

export function registerSocketEvents(io: IOServer): void {
  io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
    logger.info({ socketId: socket.id }, 'Client connected via Socket.IO');

    socket.on('disconnect', (reason) => {
      logger.info({ socketId: socket.id, reason }, 'Client disconnected from Socket.IO');
    });
  });
}
