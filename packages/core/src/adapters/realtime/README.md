# Real-Time Communication Adapters

ExCore provides scaffolding for real-time server-to-client communication using two patterns:

1. **Server-Sent Events (SSE)** - One-way server-to-client streaming
2. **WebSocket** - Bidirectional full-duplex communication

## Server-Sent Events (SSE)

### Overview

SSE provides a simple, HTTP-based protocol for server-to-client streaming. It's ideal for:
- Real-time notifications
- Live dashboard updates
- Event streams (logs, activity feeds)
- Progress updates (file uploads, long-running tasks)

### Features

- ✅ One-way server-to-client communication
- ✅ Built on standard HTTP (no special protocols)
- ✅ Automatic reconnection with `EventSource` API
- ✅ Connection tracking by user and channel
- ✅ Automatic heartbeat to keep connections alive
- ✅ Max connections per user limit
- ✅ Broadcast and targeted messaging

### Usage Example

```typescript
import { SSEManager } from '@excore/core/adapters/realtime';

// Create SSE manager
const sseManager = new SSEManager({
  heartbeatInterval: 30000,      // 30 seconds
  maxConnectionsPerUser: 10,     // Max 10 connections per user
});

// REST endpoint: /api/events
app.get('/api/events', (req, res) => {
  const userId = req.user?.id;
  const channel = req.query.channel as string;

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Register connection
  const connection = sseManager.addConnection(
    crypto.randomUUID(),
    (data) => res.write(data),
    () => res.end(),
    userId,
    channel
  );

  // Send welcome message
  connection.send({
    event: 'connected',
    data: { message: 'Connected to event stream' }
  });

  // Handle client disconnect
  req.on('close', () => {
    connection.close();
  });
});

// Send notification to specific user
sseManager.sendToUser('user-123', {
  event: 'notification',
  data: {
    title: 'New Message',
    body: 'You have a new message from Alice'
  }
});

// Broadcast to all connections in a channel
sseManager.sendToChannel('dashboard', {
  event: 'metric-update',
  data: {
    activeUsers: 1542,
    requestsPerSecond: 230
  }
});

// Broadcast to all connections
sseManager.broadcast({
  event: 'system-announcement',
  data: {
    message: 'System maintenance in 10 minutes'
  }
});
```

### Client-Side (Browser)

```javascript
const eventSource = new EventSource('/api/events?channel=dashboard');

eventSource.addEventListener('connected', (e) => {
  const data = JSON.parse(e.data);
  console.log('Connected:', data.message);
});

eventSource.addEventListener('notification', (e) => {
  const notification = JSON.parse(e.data);
  showNotification(notification.title, notification.body);
});

eventSource.addEventListener('metric-update', (e) => {
  const metrics = JSON.parse(e.data);
  updateDashboard(metrics);
});

eventSource.onerror = (error) => {
  console.error('SSE error:', error);
  // EventSource automatically reconnects
};
```

## WebSocket

### Overview

WebSocket provides bidirectional, full-duplex communication over a single TCP connection. It's ideal for:
- Real-time chat applications
- Collaborative editing (multiplayer text editor)
- Live gaming
- Real-time data feeds (stock prices, sports scores)
- IoT device communication

### Features

- ✅ Bidirectional full-duplex communication
- ✅ Message type-based routing
- ✅ Connection tracking by user and channel
- ✅ Automatic heartbeat to keep connections alive
- ✅ Max connections per user limit
- ✅ Message size validation
- ✅ Error handling and validation
- ✅ Broadcast and targeted messaging

### Usage Example

```typescript
import { WebSocketManager } from '@excore/core/adapters/realtime';
import { WebSocketServer } from 'ws';

// Create WebSocket manager
const wsManager = new WebSocketManager({
  heartbeatInterval: 30000,      // 30 seconds
  maxConnectionsPerUser: 10,     // Max 10 connections per user
  maxMessageSize: 1024 * 1024,   // 1MB
});

// Register message handlers
wsManager.onMessage('chat:send', async (connection, message) => {
  const { text, channel } = message.payload as { text: string; channel: string };

  // Broadcast to all users in channel
  wsManager.sendToChannel(channel, {
    type: 'chat:message',
    payload: {
      userId: connection.userId,
      text,
      timestamp: Date.now()
    }
  });
});

wsManager.onMessage('typing:start', async (connection, message) => {
  const { channel } = message.payload as { channel: string };

  // Notify others in channel
  wsManager.sendToChannel(channel, {
    type: 'typing:indicator',
    payload: {
      userId: connection.userId,
      isTyping: true
    }
  });
});

// WebSocket server setup
const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', (ws, req) => {
  const userId = extractUserIdFromRequest(req);
  const channel = extractChannelFromRequest(req);
  const connectionId = crypto.randomUUID();

  // Register connection
  const connection = wsManager.addConnection(
    connectionId,
    (data) => ws.send(data),
    (code, reason) => ws.close(code, reason),
    userId,
    channel
  );

  // Send welcome message
  connection.send({
    type: 'connected',
    payload: { message: 'Connected to WebSocket server' }
  });

  // Handle incoming messages
  ws.on('message', async (data) => {
    await wsManager.handleMessage(connectionId, data.toString());
  });

  // Handle disconnect
  ws.on('close', () => {
    connection.close();
  });
});

// Send message to specific user
wsManager.sendToUser('user-123', {
  type: 'notification',
  payload: {
    title: 'New Message',
    body: 'You have a new message'
  }
});
```

### Client-Side (Browser)

```javascript
const ws = new WebSocket('ws://localhost:8080?channel=general');

ws.onopen = () => {
  console.log('WebSocket connected');
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);

  switch (message.type) {
    case 'connected':
      console.log('Connected:', message.payload.message);
      break;

    case 'chat:message':
      displayMessage(message.payload);
      break;

    case 'typing:indicator':
      showTypingIndicator(message.payload.userId);
      break;

    case 'notification':
      showNotification(message.payload.title, message.payload.body);
      break;
  }
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

ws.onclose = () => {
  console.log('WebSocket disconnected');
  // Implement reconnection logic
};

// Send message
function sendMessage(text) {
  ws.send(JSON.stringify({
    type: 'chat:send',
    payload: { text, channel: 'general' }
  }));
}

// Typing indicator
function notifyTyping() {
  ws.send(JSON.stringify({
    type: 'typing:start',
    payload: { channel: 'general' }
  }));
}
```

## Comparison: SSE vs WebSocket

| Feature | SSE | WebSocket |
|---------|-----|-----------|
| **Direction** | One-way (server → client) | Bidirectional (server ↔ client) |
| **Protocol** | HTTP | WebSocket protocol (ws://) |
| **Reconnection** | Automatic (built-in) | Manual implementation needed |
| **Browser Support** | All modern browsers | All modern browsers |
| **Complexity** | Simple | More complex |
| **Use Cases** | Notifications, updates, streams | Chat, gaming, collaboration |
| **Overhead** | Lower (HTTP-based) | Higher (persistent connection) |
| **Message Format** | Text (SSE format) | Binary or text (JSON) |

## When to Use What?

### Use SSE When:
- ✅ You only need server-to-client communication
- ✅ You want automatic reconnection
- ✅ You're streaming events/logs
- ✅ You want simpler implementation
- ✅ HTTP/2 multiplexing is beneficial

### Use WebSocket When:
- ✅ You need bidirectional communication
- ✅ You need low latency
- ✅ You're building real-time chat/gaming
- ✅ You need to send binary data
- ✅ You want full control over connection lifecycle

## Architecture Integration

### Domain Events → Real-Time Clients

```typescript
// Domain event subscriber
class NotificationSubscriber {
  constructor(
    private readonly sseManager: SSEManager,
    private readonly wsManager: WebSocketManager
  ) {}

  async handleUserRegistered(event: UserRegisteredEvent): Promise<void> {
    // Notify admins via SSE
    this.sseManager.sendToChannel('admin-dashboard', {
      event: 'user:registered',
      data: {
        userId: event.userId,
        email: event.email,
        timestamp: event.occurredAt
      }
    });

    // Send welcome notification via WebSocket
    this.wsManager.sendToUser(event.userId, {
      type: 'notification',
      payload: {
        title: 'Welcome!',
        body: 'Your account has been created successfully'
      }
    });
  }
}
```

## Production Considerations

### Scaling
- Use Redis Pub/Sub for horizontal scaling across multiple server instances
- Store connection metadata in Redis for cross-server messaging
- Implement sticky sessions for WebSocket load balancing

### Security
- Always authenticate connections (verify JWT/session)
- Implement rate limiting per connection
- Validate message size and structure
- Use wss:// (WebSocket over TLS) in production

### Monitoring
- Track active connection count
- Monitor message throughput
- Alert on connection spikes
- Track reconnection rates

### Error Handling
- Implement exponential backoff for reconnection
- Handle network interruptions gracefully
- Log errors with context and correlation IDs
- Send error responses to clients

## Testing

Both managers can be easily tested:

```typescript
describe('SSEManager', () => {
  let manager: SSEManager;

  beforeEach(() => {
    manager = new SSEManager({ heartbeatInterval: 1000 });
  });

  afterEach(() => {
    manager.closeAll();
  });

  it('should send message to user', () => {
    const messages: string[] = [];

    manager.addConnection(
      'conn-1',
      (data) => messages.push(data),
      () => {},
      'user-123'
    );

    manager.sendToUser('user-123', {
      event: 'test',
      data: { message: 'Hello' }
    });

    expect(messages).toHaveLength(1);
    expect(messages[0]).toContain('event: test');
    expect(messages[0]).toContain('data: {"message":"Hello"}');
  });
});
```

## Future Enhancements

- [ ] Redis Pub/Sub adapter for horizontal scaling
- [ ] Automatic reconnection handling in client libraries
- [ ] Compression support (gzip, deflate)
- [ ] Binary message support for WebSocket
- [ ] Connection statistics and analytics
- [ ] Integration with observability stack (metrics, traces)
