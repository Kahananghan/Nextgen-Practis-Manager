// Socket.IO Client type declarations for when the package is not available
declare module 'socket.io-client' {
  interface SocketOptions {
    transports?: ('polling' | 'websocket')[];
    auth?: Record<string, any>;
    reconnection?: boolean;
    reconnectionDelay?: number;
    reconnectionDelayMax?: number;
    maxReconnectionAttempts?: number;
  }

  interface Socket {
    on(event: string, callback: (...args: any[]) => void): Socket;
    off(event?: string, callback?: (...args: any[]) => void): Socket;
    emit(event: string, ...args: any[]): Socket;
    disconnect(): Socket;
    connect(): Socket;
    connected: boolean;
  }

  function io(url: string, options?: SocketOptions): Socket;
  export = io;
}

// Environment variables
interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_GEMINI_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
