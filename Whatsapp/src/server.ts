import { createServer, type Server } from 'http';
import { createApp } from './app.js';
import { initSocketIO } from './sockets/index.js';

let httpServer: Server | null = null;

export function createHttpServer(): Server {
  const app = createApp();
  httpServer = createServer(app);
  initSocketIO(httpServer);
  return httpServer;
}

export function getHttpServer(): Server | null {
  return httpServer;
}
