// Real-Time Adapters Public API

// SSE (Server-Sent Events)
export {
  SSEManager,
  type SSEConnection,
  type SSEEvent,
  type SSEManagerOptions,
} from './SSEManager';

// WebSocket
export {
  WebSocketManager,
  type WebSocketConnection,
  type WebSocketMessage,
  type WebSocketManagerOptions,
  type MessageHandler,
} from './WebSocketManager';
