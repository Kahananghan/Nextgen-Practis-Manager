export interface SocketService {
  connect: (url: string, token: string) => Promise<void>;
  disconnect: () => void;
  emit: (event: string, data: any, callback?: (response: any) => void) => void;
  on: (event: string, callback: (data: any) => void) => void;
  off: (event: string, callback?: (data: any) => void) => void;
  connected: boolean;
}

class SimpleSocketService implements SocketService {
  private ws: WebSocket | null = null;
  private callbacks = new Map<string, Set<(data: any) => void>>();
  public connected = false;

  async connect(url: string, token: string): Promise<void> {
    try {
      // Convert HTTP URL to WebSocket URL
      const wsUrl = url.replace(/^http/, 'ws') + '/socket.io/?EIO=4&transport=websocket';
      
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        this.connected = true;
        console.log('WebSocket connected');
      };
      
      this.ws.onclose = () => {
        this.connected = false;
        console.log('WebSocket disconnected');
      };
      
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type && this.callbacks.has(data.type)) {
            const callbacks = this.callbacks.get(data.type)!;
            callbacks.forEach(callback => callback(data.payload));
          }
        } catch (error) {
          console.warn('Failed to parse WebSocket message:', error);
        }
      };
      
      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.connected = false;
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      this.connected = false;
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
    this.callbacks.clear();
  }

  emit(event: string, data: any, callback?: (response: any) => void): void {
    if (!this.ws || !this.connected) {
      console.warn('WebSocket not connected, cannot emit:', event);
      return;
    }

    const message = {
      type: event,
      payload: data,
      id: Date.now().toString()
    };

    this.ws.send(JSON.stringify(message));
    
    if (callback) {
      // For now, just call the callback immediately
      // In a real implementation, you'd wait for a response
      setTimeout(() => callback({ success: true }), 100);
    }
  }

  on(event: string, callback: (data: any) => void): void {
    if (!this.callbacks.has(event)) {
      this.callbacks.set(event, new Set());
    }
    this.callbacks.get(event)!.add(callback);
  }

  off(event: string, callback?: (data: any) => void): void {
    if (callback) {
      this.callbacks.get(event)?.delete(callback);
    } else {
      this.callbacks.delete(event);
    }
  }
}

// Mock Socket.IO compatibility
export const io = (url: string, options?: any) => {
  const socket = new SimpleSocketService();
  const token = options?.auth?.token || localStorage.getItem('accessToken');
  
  if (token) {
    socket.connect(url, token);
  }
  
  return socket;
};

export interface Socket {
  on(event: string, callback: (...args: any[]) => void): Socket;
  off(event?: string, callback?: (...args: any[]) => void): Socket;
  emit(event: string, ...args: any[]): Socket;
  disconnect(): Socket;
  connect(): Socket;
  connected: boolean;
}
