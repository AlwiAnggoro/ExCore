/**
 * WebSocket Manager
 *
 * Manages WebSocket connections for real-time bidirectional communication.
 * WebSocket provides full-duplex communication channel over a single TCP connection.
 *
 * Use cases:
 * - Real-time chat applications
 * - Collaborative editing (multiplayer text editor)
 * - Live gaming
 * - Real-time data feeds (stock prices, sports scores)
 * - IoT device communication
 */

export interface WebSocketConnection {
  id: string;
  userId?: string;
  channel?: string;
  connectedAt: Date;
  send: (message: WebSocketMessage) => void;
  close: (code?: number, reason?: string) => void;
}

export interface WebSocketMessage {
  type: string;
  payload: unknown;
  id?: string;
  timestamp?: number;
}

export interface WebSocketManagerOptions {
  heartbeatInterval?: number; // milliseconds (default: 30000)
  connectionTimeout?: number; // milliseconds (default: 300000 = 5 minutes)
  maxConnectionsPerUser?: number; // default: 10
  maxMessageSize?: number; // bytes (default: 1MB)
}

export type MessageHandler = (
  connection: WebSocketConnection,
  message: WebSocketMessage
) => void | Promise<void>;

export class WebSocketManager {
  private connections: Map<string, WebSocketConnection> = new Map();
  private userConnections: Map<string, Set<string>> = new Map();
  private channelConnections: Map<string, Set<string>> = new Map();
  private messageHandlers: Map<string, MessageHandler> = new Map();
  private heartbeatTimer?: NodeJS.Timeout;

  constructor(private readonly options: WebSocketManagerOptions = {}) {
    this.options.heartbeatInterval = options.heartbeatInterval ?? 30000;
    this.options.connectionTimeout = options.connectionTimeout ?? 300000;
    this.options.maxConnectionsPerUser = options.maxConnectionsPerUser ?? 10;
    this.options.maxMessageSize = options.maxMessageSize ?? 1024 * 1024; // 1MB

    this.startHeartbeat();
  }

  /**
   * Register a message handler for a specific message type
   */
  public onMessage(type: string, handler: MessageHandler): void {
    this.messageHandlers.set(type, handler);
  }

  /**
   * Register a new WebSocket connection
   */
  public addConnection(
    connectionId: string,
    sendFn: (data: string) => void,
    closeFn: (code?: number, reason?: string) => void,
    userId?: string,
    channel?: string
  ): WebSocketConnection {
    // Check max connections per user
    if (userId && this.getUserConnectionCount(userId) >= this.options.maxConnectionsPerUser!) {
      throw new Error(
        `Maximum connections (${this.options.maxConnectionsPerUser}) exceeded for user ${userId}`
      );
    }

    const connection: WebSocketConnection = {
      id: connectionId,
      userId,
      channel,
      connectedAt: new Date(),
      send: (message: WebSocketMessage) => this.sendMessage(sendFn, message),
      close: (code?: number, reason?: string) => {
        closeFn(code, reason);
        this.removeConnection(connectionId);
      },
    };

    this.connections.set(connectionId, connection);

    // Track user connections
    if (userId) {
      if (!this.userConnections.has(userId)) {
        this.userConnections.set(userId, new Set());
      }
      this.userConnections.get(userId)!.add(connectionId);
    }

    // Track channel connections
    if (channel) {
      if (!this.channelConnections.has(channel)) {
        this.channelConnections.set(channel, new Set());
      }
      this.channelConnections.get(channel)!.add(connectionId);
    }

    return connection;
  }

  /**
   * Remove a connection
   */
  public removeConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);

    if (!connection) {
      return;
    }

    // Remove from user tracking
    if (connection.userId) {
      const userConns = this.userConnections.get(connection.userId);
      if (userConns) {
        userConns.delete(connectionId);
        if (userConns.size === 0) {
          this.userConnections.delete(connection.userId);
        }
      }
    }

    // Remove from channel tracking
    if (connection.channel) {
      const channelConns = this.channelConnections.get(connection.channel);
      if (channelConns) {
        channelConns.delete(connectionId);
        if (channelConns.size === 0) {
          this.channelConnections.delete(connection.channel);
        }
      }
    }

    this.connections.delete(connectionId);
  }

  /**
   * Handle incoming message
   */
  public async handleMessage(
    connectionId: string,
    rawMessage: string
  ): Promise<void> {
    const connection = this.connections.get(connectionId);

    if (!connection) {
      return;
    }

    try {
      // Parse message
      const message: WebSocketMessage = JSON.parse(rawMessage);

      // Validate message structure
      if (!message.type) {
        throw new Error('Message type is required');
      }

      // Check message size
      if (rawMessage.length > this.options.maxMessageSize!) {
        throw new Error('Message size exceeds maximum allowed size');
      }

      // Find and execute handler
      const handler = this.messageHandlers.get(message.type);

      if (handler) {
        await handler(connection, message);
      } else {
        // No handler found, send error response
        connection.send({
          type: 'error',
          payload: {
            error: `No handler found for message type: ${message.type}`,
          },
        });
      }
    } catch (error) {
      // Send error response
      connection.send({
        type: 'error',
        payload: {
          error: (error as Error).message,
        },
      });
    }
  }

  /**
   * Send message to a specific connection
   */
  public sendToConnection(connectionId: string, message: WebSocketMessage): boolean {
    const connection = this.connections.get(connectionId);

    if (!connection) {
      return false;
    }

    connection.send(message);
    return true;
  }

  /**
   * Send message to all connections of a user
   */
  public sendToUser(userId: string, message: WebSocketMessage): number {
    const connectionIds = this.userConnections.get(userId);

    if (!connectionIds) {
      return 0;
    }

    let sent = 0;
    for (const connectionId of connectionIds) {
      if (this.sendToConnection(connectionId, message)) {
        sent++;
      }
    }

    return sent;
  }

  /**
   * Send message to all connections in a channel
   */
  public sendToChannel(channel: string, message: WebSocketMessage): number {
    const connectionIds = this.channelConnections.get(channel);

    if (!connectionIds) {
      return 0;
    }

    let sent = 0;
    for (const connectionId of connectionIds) {
      if (this.sendToConnection(connectionId, message)) {
        sent++;
      }
    }

    return sent;
  }

  /**
   * Broadcast message to all connections
   */
  public broadcast(message: WebSocketMessage): number {
    let sent = 0;

    for (const connection of this.connections.values()) {
      connection.send(message);
      sent++;
    }

    return sent;
  }

  /**
   * Get connection count
   */
  public getConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * Get user connection count
   */
  public getUserConnectionCount(userId: string): number {
    return this.userConnections.get(userId)?.size ?? 0;
  }

  /**
   * Get channel connection count
   */
  public getChannelConnectionCount(channel: string): number {
    return this.channelConnections.get(channel)?.size ?? 0;
  }

  /**
   * Get connection by ID
   */
  public getConnection(connectionId: string): WebSocketConnection | undefined {
    return this.connections.get(connectionId);
  }

  /**
   * Close all connections
   */
  public closeAll(code?: number, reason?: string): void {
    for (const connection of this.connections.values()) {
      connection.close(code, reason);
    }

    this.stopHeartbeat();
  }

  /**
   * Send WebSocket message
   */
  private sendMessage(sendFn: (data: string) => void, message: WebSocketMessage): void {
    const payload = {
      ...message,
      timestamp: message.timestamp ?? Date.now(),
    };

    sendFn(JSON.stringify(payload));
  }

  /**
   * Start heartbeat to keep connections alive
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.broadcast({
        type: 'heartbeat',
        payload: { timestamp: Date.now() },
      });
    }, this.options.heartbeatInterval!);
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
  }
}
