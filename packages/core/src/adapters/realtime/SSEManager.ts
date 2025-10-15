/**
 * Server-Sent Events (SSE) Manager
 *
 * Manages SSE connections for real-time server-to-client streaming.
 * SSE provides one-way communication from server to client over HTTP.
 *
 * Use cases:
 * - Real-time notifications
 * - Live updates (dashboard metrics, status changes)
 * - Event streams (logs, activity feeds)
 * - Progress updates (file uploads, long-running tasks)
 */

export interface SSEConnection {
  id: string;
  userId?: string;
  channel?: string;
  connectedAt: Date;
  send: (event: SSEEvent) => void;
  close: () => void;
}

export interface SSEEvent {
  id?: string;
  event?: string;
  data: string | object;
  retry?: number;
}

export interface SSEManagerOptions {
  heartbeatInterval?: number; // milliseconds (default: 30000)
  connectionTimeout?: number; // milliseconds (default: 300000 = 5 minutes)
  maxConnectionsPerUser?: number; // default: 10
}

export class SSEManager {
  private connections: Map<string, SSEConnection> = new Map();
  private userConnections: Map<string, Set<string>> = new Map();
  private channelConnections: Map<string, Set<string>> = new Map();
  private heartbeatTimer?: NodeJS.Timeout;

  constructor(private readonly options: SSEManagerOptions = {}) {
    this.options.heartbeatInterval = options.heartbeatInterval ?? 30000;
    this.options.connectionTimeout = options.connectionTimeout ?? 300000;
    this.options.maxConnectionsPerUser = options.maxConnectionsPerUser ?? 10;

    this.startHeartbeat();
  }

  /**
   * Register a new SSE connection
   */
  public addConnection(
    connectionId: string,
    sendFn: (data: string) => void,
    closeFn: () => void,
    userId?: string,
    channel?: string
  ): SSEConnection {
    // Check max connections per user
    if (userId && this.getUserConnectionCount(userId) >= this.options.maxConnectionsPerUser!) {
      throw new Error(`Maximum connections (${this.options.maxConnectionsPerUser}) exceeded for user ${userId}`);
    }

    const connection: SSEConnection = {
      id: connectionId,
      userId,
      channel,
      connectedAt: new Date(),
      send: (event: SSEEvent) => this.sendEvent(sendFn, event),
      close: () => {
        closeFn();
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
   * Send event to a specific connection
   */
  public sendToConnection(connectionId: string, event: SSEEvent): boolean {
    const connection = this.connections.get(connectionId);

    if (!connection) {
      return false;
    }

    connection.send(event);
    return true;
  }

  /**
   * Send event to all connections of a user
   */
  public sendToUser(userId: string, event: SSEEvent): number {
    const connectionIds = this.userConnections.get(userId);

    if (!connectionIds) {
      return 0;
    }

    let sent = 0;
    for (const connectionId of connectionIds) {
      if (this.sendToConnection(connectionId, event)) {
        sent++;
      }
    }

    return sent;
  }

  /**
   * Send event to all connections in a channel
   */
  public sendToChannel(channel: string, event: SSEEvent): number {
    const connectionIds = this.channelConnections.get(channel);

    if (!connectionIds) {
      return 0;
    }

    let sent = 0;
    for (const connectionId of connectionIds) {
      if (this.sendToConnection(connectionId, event)) {
        sent++;
      }
    }

    return sent;
  }

  /**
   * Broadcast event to all connections
   */
  public broadcast(event: SSEEvent): number {
    let sent = 0;

    for (const connection of this.connections.values()) {
      connection.send(event);
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
   * Close all connections
   */
  public closeAll(): void {
    for (const connection of this.connections.values()) {
      connection.close();
    }

    this.stopHeartbeat();
  }

  /**
   * Send SSE formatted event
   */
  private sendEvent(sendFn: (data: string) => void, event: SSEEvent): void {
    let message = '';

    if (event.id) {
      message += `id: ${event.id}\n`;
    }

    if (event.event) {
      message += `event: ${event.event}\n`;
    }

    const data = typeof event.data === 'string' ? event.data : JSON.stringify(event.data);
    message += `data: ${data}\n`;

    if (event.retry) {
      message += `retry: ${event.retry}\n`;
    }

    message += '\n';

    sendFn(message);
  }

  /**
   * Start heartbeat to keep connections alive
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.broadcast({
        event: 'heartbeat',
        data: { timestamp: Date.now() },
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
