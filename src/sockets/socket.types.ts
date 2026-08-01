export interface ServerToClientEvents {
  qr: (data: { qr: string; timeout: number }) => void;
  'connection-status': (data: { state: string; timestamp: string }) => void;
  log: (data: { level: string; message: string; timestamp: string }) => void;
}

export interface ClientToServerEvents {
  // Future: client-initiated events
}
